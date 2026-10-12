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
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined to answer this');
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

function parseJsonLoose(s) {
  const clean = s.replace(/```json|```/g, '').trim();
  const start = clean.search(/[\[{]/);
  const end = Math.max(clean.lastIndexOf(']'), clean.lastIndexOf('}'));
  return JSON.parse(clean.slice(start, end + 1));
}

// Lời dặn cho gia sư theo ngôn ngữ giao diện (vi | en).
const TUTOR = {
  vi: 'Bạn là giáo viên tiếng Na Uy (Bokmål, chuẩn Oslo) cho người Việt trình độ A1–A2. Giải thích bằng tiếng Việt tự nhiên, ngắn gọn, thân thiện, xưng "thầy" và gọi người học là "anh". Không dùng dấu gạch ngang dài (—). Khi so sánh, liên hệ với tiếng Việt hoặc tiếng Anh nếu giúp dễ hiểu.',
  en: 'You are a friendly Norwegian teacher (Bokmål, Oslo standard) for A1–A2 learners. Explain in clear, natural, concise English and address the learner as "you". Do not use em dashes (—). Compare with English when it helps.',
};
const LANG = {
  vi: { name: 'Vietnamese', tr: 'Vietnamese translation' },
  en: { name: 'English', tr: 'English translation' },
};
const pick = lang => ({ sys: TUTOR[lang] || TUTOR.en, L: LANG[lang] || LANG.en });

async function explain(text, lang = 'en') {
  const { sys, L } = pick(lang);
  const out = await callClaude({
    system: sys,
    messages: [{ role: 'user', content: `Explain this Norwegian sentence or word to the learner. Write every explanation in ${L.name}.\n<text>${text}</text>\n\nReturn only JSON: {"translation":"${L.tr}","words":[{"no":"word","meaning":"meaning","note":"base form / short grammar note"}],"grammar":["grammar point 1","point 2"],"pronunciation":"short pronunciation tip (silent letters, tricky sounds)"}` }],
  });
  return parseJsonLoose(out);
}

async function check(text, hint, lang = 'en') {
  const { sys, L } = pick(lang);
  const out = await callClaude({
    system: sys,
    messages: [{ role: 'user', content: `The learner wrote this Norwegian sentence${hint ? ` (intended meaning: "${hint}")` : ''}:\n<text>${text}</text>\n\nCheck and correct it. Write explanations in ${L.name}. Return only JSON: {"correct":true/false,"corrected":"the most natural correct sentence","translation":"${L.tr} of the corrected sentence","mistakes":[{"wrong":"wrong part","right":"correction","why":"short explanation"}],"tip":"one short tip"}` }],
  });
  return parseJsonLoose(out);
}

const SCENARIOS = {
  cafe: 'You work at a Kaffebrenneriet café in Oslo. The learner is a customer ordering.',
  kiwi: 'You are a cashier at a Kiwi supermarket in Oslo.',
  doctor: 'You are a GP (fastlege) in Oslo; the learner is a patient.',
  interview: 'You are a recruiter at an ocean-economy company (havbruk/sjømat) in Oslo. The learner is a candidate, a former Vietnamese diplomat with a UK MBA.',
  neighbor: 'You are a friendly neighbour in an Oslo borettslag, meeting the learner on the stairs.',
  free: 'You are a friendly Norwegian friend chatting freely about everyday life in Oslo.',
};

async function chat(scenario, history, lang = 'en') {
  const { sys, L } = pick(lang);
  const system = `${sys}\nROLE-PLAY: ${SCENARIOS[scenario] || SCENARIOS.free}\nRules: reply in simple Norwegian (A1–A2, 1–3 short sentences), stay in role, and always end with a question so the learner keeps talking. If the learner's last message has Norwegian mistakes, correct them gently in "correction" (in ${L.name}, short); otherwise use an empty string.\nReturn only JSON: {"reply_no":"...","reply_tr":"${L.tr}","correction":"...","suggestions":["2–3 Norwegian sentences the learner could reply with"]}`;
  const msgs = history.slice(-16).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 800) }));
  if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(Start the conversation: greet me and open the scene.)' });
  const out = await callClaude({ system, messages: msgs });
  return parseJsonLoose(out);
}

module.exports = { enabled: () => !!config.anthropic.key, explain, check, chat, SCENARIOS: Object.keys(SCENARIOS) };
