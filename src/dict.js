// Từ điển: Bokmålsordboka (ord.uib.no, Språkrådet & UiB) + Wiktionary tiếng Anh. Kết quả được chuẩn hóa và lưu đệm.
const { cacheGet, cacheSet } = require('./db');

const UA = { 'User-Agent': 'NorskLearning/1.0 (+https://github.com/nghiaphuong/norwegian)' };
const ORD = 'https://ord.uib.no';
const DAY = 24 * 3600 * 1000;

async function getJson(url, timeout = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function cached(key, ttlDays, fn) {
  const hit = await cacheGet(key);
  if (hit && (!hit._t || Date.now() - hit._t < ttlDays * DAY)) return hit.v;
  const v = await fn();
  await cacheSet(key, { _t: Date.now(), v });
  return v;
}

// ---------- Bokmålsordboka ----------
const WORD_CLASS = { NOUN: 'danh từ', VERB: 'động từ', ADJ: 'tính từ', ADV: 'trạng từ', PRON: 'đại từ', ADP: 'giới từ', CCONJ: 'liên từ', SCONJ: 'liên từ phụ', DET: 'từ hạn định', INTJ: 'thán từ', NUM: 'số từ', EXPR: 'thành ngữ', PROPN: 'danh từ riêng' };
const GENDER = { Masc: 'm', Fem: 'f', Neuter: 'n' };

function itemText(it) {
  if (!it) return '';
  if (it.text) return it.text;
  if (it.lemmas && it.lemmas[0]) return it.lemmas[0].lemma;
  if (it.id) return it.id;
  return '';
}
function fill(content, items = []) {
  let i = 0;
  return String(content || '').replace(/\$/g, () => itemText(items[i++])).replace(/\s+/g, ' ').trim();
}

function walkDefs(elements, out, exprs, depth = 0) {
  for (const el of elements || []) {
    if (el.type_ === 'definition') {
      const def = { text: '', examples: [] };
      const explanations = [];
      for (const sub of el.elements || []) {
        if (sub.type_ === 'explanation') explanations.push(fill(sub.content, sub.items));
        else if (sub.type_ === 'example') {
          const ex = fill(sub.quote?.content, sub.quote?.items);
          const expl = fill(sub.explanation?.content, sub.explanation?.items);
          if (ex) def.examples.push(expl ? `${ex} (${expl})` : ex);
        }
      }
      def.text = explanations.filter(Boolean).join('; ');
      if (def.text || def.examples.length) out.push(def);
      walkDefs((el.elements || []).filter(e => e.type_ === 'definition' || e.type_ === 'sub_article'), out, exprs, depth + 1);
    } else if (el.type_ === 'sub_article' && el.article) {
      const sub = [];
      walkDefs(el.article.body?.definitions, sub, [], depth + 1);
      const lemma = (el.lemmas || [])[0] || el.article.lemmas?.[0]?.lemma;
      if (lemma && exprs.length < 12) exprs.push({ lemma, text: sub.map(d => d.text).filter(Boolean).join('; '), examples: sub.flatMap(d => d.examples).slice(0, 2) });
    }
  }
}

function formsOf(paradigm) {
  const f = {};
  for (const inf of paradigm.inflection || []) {
    if (!inf.word_form) continue;
    const key = inf.tags.join('+');
    if (!f[key]) f[key] = inf.word_form;
  }
  return f;
}

// Bảng biến cách dễ đọc cho người học (theo từ loại).
function inflectionTable(tags, f) {
  const cls = tags[0];
  if (cls === 'NOUN') {
    return [
      ['Số ít không xác định', f['Sing+Ind']], ['Số ít xác định', f['Sing+Def']],
      ['Số nhiều không xác định', f['Plur+Ind']], ['Số nhiều xác định', f['Plur+Def']],
    ].filter(r => r[1]);
  }
  if (cls === 'VERB') {
    return [
      ['Nguyên mẫu', f.Inf ? `å ${f.Inf}` : ''], ['Hiện tại', f.Pres], ['Quá khứ', f.Past],
      ['Hoàn thành', f['<PerfPart>'] ? `har ${f['<PerfPart>']}` : ''], ['Mệnh lệnh', f.Imp], ['Bị động', f['Inf+Pass']],
    ].filter(r => r[1]);
  }
  if (cls === 'ADJ') {
    return [
      ['Giống đực/cái', f['Pos+Masc/Fem+Ind+Sing'] || f['Pos+Masc+Ind+Sing']], ['Giống trung', f['Pos+Neuter+Ind+Sing']],
      ['Xác định / số nhiều', f['Pos+Def+Sing'] || f['Pos+Plur']], ['So sánh hơn', f.Cmp], ['So sánh nhất', f['Sup+Ind']],
    ].filter(r => r[1]);
  }
  return [];
}

function normalizeArticle(a) {
  const lemmaObj = a.lemmas?.[0] || {};
  const std = (lemmaObj.paradigm_info || []).filter(p => p.standardisation === 'STANDARD' && !p.to);
  const paradigms = std.length ? std : (lemmaObj.paradigm_info || []);
  const tags = paradigms[0]?.tags || [];
  const genders = [...new Set(paradigms.map(p => GENDER[p.tags?.[1]]).filter(Boolean))];
  const tables = paradigms.slice(0, 2).map(p => ({ gender: GENDER[p.tags?.[1]] || '', rows: inflectionTable(p.tags || [], formsOf(p)) })).filter(t => t.rows.length);
  const defs = [];
  const exprs = [];
  walkDefs(a.body?.definitions, defs, exprs);
  const etym = (a.body?.etymology || []).map(e => fill(e.content, e.items)).filter(Boolean).join('; ');
  return {
    id: a.article_id,
    lemma: (a.lemmas || []).map(l => l.lemma).join(', '),
    pos: tags[0] || '',
    pos_vi: WORD_CLASS[tags[0]] || '',
    genders,
    tables,
    defs: defs.slice(0, 12),
    expressions: exprs,
    etymology: etym,
    url: `https://ordbokene.no/bm/${a.article_id}`,
  };
}

async function ordLookup(word) {
  const w = word.trim().toLowerCase();
  return cached(`ord:bm:${w}`, 30, async () => {
    const s = await getJson(`${ORD}/api/articles?w=${encodeURIComponent(w)}&dict=bm&scope=ei`);
    const ids = (s.articles?.bm || []).slice(0, 4);
    const arts = await Promise.all(ids.map(id => getJson(`${ORD}/bm/article/${id}.json`).catch(() => null)));
    return arts.filter(Boolean).map(normalizeArticle);
  });
}

async function suggest(q) {
  const w = q.trim().toLowerCase();
  if (!w) return [];
  return cached(`sug:${w}`, 30, async () => {
    const s = await getJson(`${ORD}/api/suggest?q=${encodeURIComponent(w)}&dict=bm&n=8&include=ei`, 5000);
    const a = s.a || {};
    const out = [];
    for (const [word] of [...(a.exact || []), ...(a.inflect || [])]) if (!out.includes(word)) out.push(word);
    return out.slice(0, 8);
  });
}

// ---------- Wiktionary (nghĩa tiếng Anh) ----------
const stripHtml = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

async function wiktionary(word) {
  const w = word.trim();
  return cached(`wikt:${w.toLowerCase()}`, 30, async () => {
    let d;
    try { d = await getJson(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`, 6000); } catch (e) { return []; }
    const all = Object.values(d).flat();
    return all.filter(e => /Norwegian( Bokmål)?$/.test(e.language || ''))
      .map(e => ({ pos: e.partOfSpeech, defs: (e.definitions || []).map(x => stripHtml(x.definition)).filter(Boolean).slice(0, 5) }))
      .filter(e => e.defs.length).slice(0, 4);
  });
}

async function lookup(word) {
  const [ord, en] = await Promise.all([ordLookup(word).catch(e => ({ error: e.message })), wiktionary(word).catch(() => [])]);
  return { query: word, articles: Array.isArray(ord) ? ord : [], en, error: Array.isArray(ord) ? null : 'Không kết nối được Bokmålsordboka' };
}

module.exports = { lookup, suggest, cached };
