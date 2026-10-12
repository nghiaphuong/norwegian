// Truy vấn giáo trình và trạng thái mở khóa bài học.
import { loadData } from './ui.js';
import { store } from './store.js';

let cache = null;
export async function getCourse() {
  if (cache) return cache;
  const c = await loadData('course');
  const flat = [];
  c.units.forEach((u, ui) => {
    u.lessons.forEach((l, li) => flat.push({ ...l, unit: u, ui, li }));
    flat.push({ id: `${u.id}-check`, title: 'Kiểm tra chương', checkpoint: true, unit: u, ui, li: u.lessons.length, vocab: u.lessons.flatMap(l => l.vocab), sentences: u.lessons.flatMap(l => l.sentences) });
  });
  cache = { ...c, flat, byId: Object.fromEntries(flat.map(l => [l.id, l])) };
  return cache;
}

export const isDone = id => (store.s.lessons[id]?.n || 0) > 0;

export function status(course, lesson) {
  if (isDone(lesson.id)) return 'done';
  const idx = course.flat.indexOf(lesson);
  if (store.s.settings.unlockAll || idx === 0) return 'open';
  return isDone(course.flat[idx - 1].id) ? 'open' : 'locked';
}

export function nextLesson(course) {
  return course.flat.find(l => !isDone(l.id)) || course.flat[course.flat.length - 1];
}

export function vocabPool(course, uptoIndex = Infinity) {
  return course.flat.filter((l, i) => !l.checkpoint && i <= uptoIndex).flatMap(l => l.vocab);
}

export function progress(course) {
  const real = course.flat.filter(l => !l.checkpoint);
  return { done: real.filter(l => isDone(l.id)).length, total: real.length };
}
