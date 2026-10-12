// Gia sư AI (tùy chọn): chỉ bật khi có ANTHROPIC_API_KEY.
const Anthropic = require('@anthropic-ai/sdk').default;
const config = require('./config');

let client;
function getClient() {
  if (!config.anthropic.key) throw new Error('Chưa cấu hình ANTHROPIC_API_KEY');
  if (!client) client = new Anthropic({ apiKey: config.anthropic.key, maxRetries: 3, timeout: 120 * 1000 });
  return client;
}

async function callClaude({ system, messages, maxTokens = 3000 }) {
  let msg;
  try {
    msg = await getClient().messages.stream({
      model: config.anthropic.model,
      max_tokens: maxTokens,
      output_config: { effort: 'low' },
      system,
      messages,
    }).finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.APIError) throw new Error(`Claude API ${e.status ?? ''}: ${e.error?.error?.message || e.message}`);
    throw e;
  }
  if (msg.stop_reason === 'refusal') throw new Error('Claude từ chối trả lời câu này');
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

function parseJsonLoose(s) {
  const clean = s.replace(/```json|```/g, '').trim();
  const start = clean.search(/[\[{]/);
  const end = Math.max(clean.lastIndexOf(']'), clean.lastIndexOf('}'));
  return JSON.parse(clean.slice(start, end + 1));
}

const TUTOR = `Bạn là giáo viên tiếng Na Uy (Bokmål, chuẩn Oslo) cho người Việt trình độ A1–A2. Giải thích bằng tiếng Việt tự nhiên, ngắn gọn, thân thiện, xưng "thầy" và gọi người học là "anh". Không dùng dấu gạch ngang dài (—). Khi so sánh, liên hệ với tiếng Việt hoặc tiếng Anh nếu giúp dễ hiểu.`;

async function explain(text) {
  const out = await callClaude({
    system: TUTOR,
    messages: [{ role: 'user', content: `Giải thích câu/từ tiếng Na Uy sau cho người học:\n<text>${text}</text>\n\nTrả về JSON duy nhất: {"translation":"bản dịch tiếng Việt","words":[{"no":"từ","vi":"nghĩa","note":"dạng gốc/ngữ pháp ngắn"}],"grammar":["điểm ngữ pháp 1","điểm 2"],"pronunciation":"mẹo phát âm ngắn (chữ câm, âm khó)"}` }],
  });
  return parseJsonLoose(out);
}

async function check(text, hint) {
  const out = await callClaude({
    system: TUTOR,
    messages: [{ role: 'user', content: `Người học viết câu tiếng Na Uy sau${hint ? ` (ý muốn nói: "${hint}")` : ''}:\n<text>${text}</text>\n\nChấm và sửa. Trả về JSON duy nhất: {"correct":true/false,"corrected":"câu đúng tự nhiên nhất","translation":"nghĩa tiếng Việt của câu đúng","mistakes":[{"wrong":"phần sai","right":"sửa thành","why":"giải thích ngắn"}],"tip":"một lời khuyên ngắn"}` }],
  });
  return parseJsonLoose(out);
}

const SCENARIOS = {
  cafe: 'Bạn là nhân viên quán cà phê Kaffebrenneriet ở Oslo. Người học là khách gọi đồ.',
  kiwi: 'Bạn là thu ngân siêu thị Kiwi ở Oslo.',
  doctor: 'Bạn là bác sĩ gia đình (fastlege) ở Oslo, người học là bệnh nhân đến khám.',
  interview: 'Bạn là người phỏng vấn tuyển dụng của một công ty kinh tế biển (havbruk/sjømat) ở Oslo. Người học là ứng viên, từng là nhà ngoại giao Việt Nam, có MBA ở Anh.',
  neighbor: 'Bạn là hàng xóm thân thiện trong borettslag ở Oslo, gặp người học ở cầu thang.',
  free: 'Bạn là một người bạn Na Uy thân thiện, trò chuyện tự do về cuộc sống hằng ngày ở Oslo.',
};

async function chat(scenario, history) {
  const sys = `${TUTOR}\nĐÓNG VAI: ${SCENARIOS[scenario] || SCENARIOS.free}\nQuy tắc: trả lời bằng tiếng Na Uy đơn giản (A1–A2, 1–3 câu ngắn), giữ đúng vai, luôn kết thúc bằng một câu hỏi để người học nói tiếp. Nếu tin nhắn cuối của người học có lỗi tiếng Na Uy, sửa nhẹ nhàng trong trường "correction" (tiếng Việt, ngắn), nếu không lỗi để chuỗi rỗng.\nTrả về JSON duy nhất: {"reply_no":"...","reply_vi":"bản dịch tiếng Việt","correction":"...","suggestions":["2–3 câu tiếng Na Uy gợi ý người học có thể trả lời"]}`;
  const msgs = history.slice(-16).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 800) }));
  if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(Bắt đầu cuộc hội thoại. Hãy chào và mở đầu tình huống.)' });
  const out = await callClaude({ system: sys, messages: msgs });
  return parseJsonLoose(out);
}

module.exports = { enabled: () => !!config.anthropic.key, explain, check, chat, SCENARIOS: Object.keys(SCENARIOS) };
