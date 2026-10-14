// Phiên làm bài toàn màn hình: bài học, kiểm tra chương, luyện lỗi sai, luyện nghe, luyện nói, câu giao tiếp.
import { esc, sample, shuffle, loadData, today } from '../ui.js';
import { store } from '../store.js';
import { leavePlayer, showNewBadges } from '../app.js';
import { getCourse, isDone, vocabPool, completedLevels } from '../course.js';
import { buildExercises, runPlayer } from '../engine.js';
import { stt } from '../speech.js';
import { t, L } from '../i18n.js';

function emptyScreen(main, msg) {
  main.innerHTML = `<div class="player"><div class="done-screen"><div class="big">🌿</div><h2>${msg}</h2><a class="btn primary" href="#/">${t('Về trang chủ')}</a></div></div>`;
}

export async function render(main, params) {
  const course = await getCourse();
  const kind = params[0];
  const back = leavePlayer;
  let exercises; let title = ''; let after = () => {}; let xpBase = 10;

  const learnedSentences = () => course.flat.filter(l => !l.checkpoint && isDone(l.id)).flatMap(l => l.sentences);

  if (kind === 'mistakes') {
    const items = Object.values(store.s.mistakes).sort((a, b) => b.n - a.n).slice(0, 12);
    if (!items.length) return emptyScreen(main, t('Không có lỗi sai nào cần luyện. Tuyệt!'));
    const words = items.filter(i => i.no.split(' ').length <= 2);
    const sents = items.filter(i => i.no.split(' ').length > 2);
    exercises = buildExercises({ vocab: words, sentences: sents, pool: vocabPool(course), count: 12 });
    title = t('Luyện lỗi sai');
  } else if (kind === 'listen' || kind === 'speak') {
    let pool = learnedSentences();
    if (pool.length < 6) pool = course.flat.slice(0, 3).flatMap(l => l.sentences);
    const picked = sample(pool, 8);
    if (kind === 'speak' && !stt.supported) return emptyScreen(main, t('Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge, hoặc Safari trên iPhone.'));
    exercises = picked.map(s => ({ type: kind === 'listen' ? 'dictation' : 'speak', item: s }));
    title = kind === 'listen' ? t('Luyện nghe') : t('Luyện nói');
  } else if (kind === 'phrases') {
    const pb = await loadData('phrasebook');
    const topic = pb.topics.find(x => x.id === params[1]);
    if (!topic) return emptyScreen(main, t('Không tìm thấy chủ đề.'));
    const items = topic.items.filter(i => !i.no.includes(','));
    const short = items.filter(i => i.no.split(' ').length <= 2);
    exercises = buildExercises({ vocab: short.length >= 4 ? short : [], sentences: items, pool: vocabPool(course, 20), count: 12 });
    title = L(topic, 'title');
    after = () => { topic.items.forEach(i => store.addCard(i, `phrase:${topic.id}`)); };
  } else {
    const lesson = course.byId[kind];
    if (!lesson) return emptyScreen(main, t('Không tìm thấy bài học.'));
    const idx = course.flat.indexOf(lesson);
    const isNew = !isDone(lesson.id);
    if (lesson.checkpoint) {
      exercises = buildExercises({ vocab: sample(lesson.vocab, 8), sentences: sample(lesson.sentences, 8), pool: vocabPool(course, idx), count: 16 });
      xpBase = 20;
    } else {
      const count = /^B/.test(lesson.unit.level) ? 16 : 14;
      exercises = buildExercises({ vocab: lesson.vocab, sentences: lesson.sentences, pool: vocabPool(course, idx + 6), count, isNew });
    }
    title = `${L(lesson.unit, 'title')} · ${lesson.checkpoint ? t('Kiểm tra chương') : L(lesson, 'title')}`;
    after = res => {
      const rec = store.s.lessons[lesson.id] || { n: 0, best: 0 };
      rec.n++; rec.best = Math.max(rec.best, res.acc); rec.at = Date.now();
      store.s.lessons[lesson.id] = rec;
      if (lesson.checkpoint) {
        // Học vượt: qua bài kiểm tra thì coi như đã học các bài trong chương.
        course.flat.filter(l => l.ui === lesson.ui && !l.checkpoint && !isDone(l.id)).forEach(l => { store.s.lessons[l.id] = { n: 1, best: res.acc, at: Date.now() }; });
      }
      lesson.vocab.forEach(v => store.addCard(v, lesson.id));
      completedLevels(course).forEach(lv => store.award(`level-${lv}`));
    };
  }

  const cleanup = runPlayer(main, exercises, {
    title, xpBase,
    onQuit: back,
    onFinish: res => {
      after(res);
      store.addXp(res.xp);
      back();
      setTimeout(showNewBadges, 400);
    },
  });
  return cleanup;
}
