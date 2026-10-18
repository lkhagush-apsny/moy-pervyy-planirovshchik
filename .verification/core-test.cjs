'use strict';
const assert = require('node:assert/strict');
const C = require('../script.js');
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`PASS ${name}`); };
const time = '2026-10-19T09:00:00.000Z';
const input = (overrides = {}) => ({ title: 'Задача', context: '', date: '2026-10-19', category: 'work', priority: 'medium', status: 'todo', ...overrides });
const add = (s, id, overrides) => C.saveTask(s, input(overrides), null, id, time);
test('calendar: Monday, Sunday, year boundary, leap day', () => {
  assert.equal(C.monday('2026-10-19'), '2026-10-19'); assert.equal(C.monday('2026-10-18'), '2026-10-12');
  assert.equal(C.monday('2027-01-01'), '2026-12-28'); assert.equal(C.addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(C.addDays('2024-02-29', 1), '2024-03-01'); assert.equal(C.validDate('2025-02-29'), false);
  assert.equal(C.validDate('1900-01-01'), true); assert.equal(C.validDate('2100-12-31'), true); assert.equal(C.validDate('2101-01-01'), false);
});
test('Unicode limits, trimmed whitespace and no truncation', () => {
  assert.deepEqual(C.fields(input({ title: '😀'.repeat(150), context: '😀'.repeat(1000) })).errors, {});
  assert.ok(C.fields(input({ title: '😀'.repeat(151) })).errors.title);
  assert.ok(C.fields(input({ context: 'a'.repeat(1001) })).errors.context);
  assert.ok(C.fields(input({ title: ' \n ' })).errors.title);
  assert.equal(C.fields(input({ title: '  текст  ', context: ' a\nb ' })).value.context, 'a\nb');
});
test('all 16 status transitions and preservation of done timestamps', () => {
  for (const from of Object.keys(C.statuses)) for (const to of Object.keys(C.statuses)) {
    const s = C.emptyState(), t = add(s, 'id', { status: from });
    C.changeStatus(t, to, '2026-10-20T09:00:00.000Z'); assert.equal(t.status, to);
    assert.equal(t.completedAt !== null, to === 'done'); C.validate(s);
  }
  const s = C.emptyState(), t = add(s, 'id', { status: 'in_progress' }); C.changeStatus(t, 'done', time);
  C.saveTask(s, input({ status: 'done', context: 'новый контекст' }), 'id', null, '2026-10-20T09:00:00.000Z');
  assert.equal(t.previousStatus, 'in_progress'); assert.equal(t.completedAt, time);
  C.changeStatus(t, t.previousStatus, time); assert.equal(t.status, 'in_progress'); assert.equal(t.completedAt, null);
});
test('progress: empty, zero, 67%, 100%, category and deferred', () => {
  const s = C.emptyState(); assert.deepEqual(C.progress(s, '2026-10-19', 'all'), { total: 0, done: 0, percent: 0 });
  add(s, 'a'); add(s, 'b', { status: 'deferred' }); add(s, 'c', { category: 'personal' });
  assert.equal(C.progress(s, '2026-10-19', 'all').percent, 0);
  C.changeStatus(s.tasks[0], 'done', time); C.changeStatus(s.tasks[2], 'done', time);
  assert.equal(C.progress(s, '2026-10-19', 'all').percent, 67); assert.equal(C.progress(s, '2026-10-19', 'work').percent, 50);
  assert.equal(C.progress(s, '2026-10-19', 'personal').percent, 100);
  C.changeStatus(s.tasks[1], 'done', time); assert.equal(C.progress(s, '2026-10-19', 'all').percent, 100);
});
test('moves preserve ID, original date, status and record only date changes', () => {
  const s = C.emptyState(); add(s, 'a', { status: 'done' }); add(s, 'b');
  C.move(s, 'b', '2026-10-19', 'a', time); assert.deepEqual(C.list(s, '2026-10-19').map(t => t.id), ['b', 'a']);
  assert.equal(s.tasks[1].moveHistory.length, 0);
  C.move(s, 'a', '2026-10-23', null, time); const t = s.tasks.find(t => t.id === 'a');
  assert.equal(t.originalDate, '2026-10-19'); assert.equal(t.status, 'done'); assert.equal(t.moveHistory.length, 1);
  assert.equal(C.progress(s, '2026-10-19', 'all').done, 1); C.validate(s);
});
test('filtered reordering leaves hidden positions and filtered drop keeps hidden relative order', () => {
  const s = C.emptyState(); add(s, 'a'); add(s, 'x', { category: 'personal' }); add(s, 'b'); add(s, 'y', { category: 'personal' });
  C.step(s, 'b', -1, 'work'); assert.deepEqual(C.list(s, '2026-10-19').map(t => t.id), ['b', 'x', 'a', 'y']);
  C.move(s, 'b', '2026-10-19', null, time); assert.deepEqual(C.list(s, '2026-10-19').map(t => t.id), ['x', 'a', 'y', 'b']);
});
test('stable priority sorting includes hidden categories and other weeks untouched', () => {
  const s = C.emptyState(); add(s, 'a', { priority: 'low' }); add(s, 'b', { category: 'personal', priority: 'high' }); add(s, 'c', { priority: 'high' }); add(s, 'd', { date: '2026-10-26' });
  C.sortWeek(s, '2026-10-19'); assert.deepEqual(C.list(s, '2026-10-19').map(t => t.id), ['b', 'c', 'a']); assert.equal(s.tasks[3].order, 0);
});
test('independent undo does not revert later edits, adds or other deletions', () => {
  const s = C.emptyState(); add(s, 'a'); add(s, 'b'); add(s, 'c');
  const ra = C.remove(s, 'a'), rb = C.remove(s, 'b'); s.tasks[0].context = 'keep me'; add(s, 'd');
  C.restore(s, rb); C.restore(s, ra); assert.equal(s.tasks.find(t => t.id === 'c').context, 'keep me');
  assert.deepEqual(C.list(s, '2026-10-19').map(t => t.id), ['a', 'b', 'c', 'd']); C.validate(s);
});
class MemoryStorage { constructor() { this.map = new Map(); this.fail = false; } getItem(k) { return this.map.get(k) ?? null; } setItem(k, v) { if (this.fail) { const e = Error('quota'); e.name = 'QuotaExceededError'; throw e; } this.map.set(k, v); } removeItem(k) { this.map.delete(k); } }
test('repository saves, reloads and rolls back quota failures', () => {
  const storage = new MemoryStorage(), r = new C.Repository(storage); r.load(); r.commit(s => add(s, 'a'));
  const saved = storage.getItem(C.KEY); assert.equal(new C.Repository(storage).load().tasks[0].id, 'a');
  storage.fail = true; assert.throws(() => r.commit(s => add(s, 'b'))); assert.equal(r.state.tasks.length, 1); assert.equal(storage.getItem(C.KEY), saved);
});
test('stale writer cannot overwrite another saved state', () => {
  const storage = new MemoryStorage(), a = new C.Repository(storage), b = new C.Repository(storage); a.load(); b.load(); a.commit(s => add(s, 'a'));
  assert.throws(() => b.commit(s => add(s, 'b')), /другой вкладке/); assert.equal(new C.Repository(storage).load().tasks.length, 1);
});
test('damaged or unknown saved state is not reset', () => {
  for (const raw of ['{', '{"schemaVersion":99}', '{"__proto__":{}}']) {
    const storage = new MemoryStorage(); storage.setItem(C.KEY, raw); assert.throws(() => new C.Repository(storage).load()); assert.equal(storage.getItem(C.KEY), raw);
  }
});
test('bad IDs, types, history and timestamps rejected', () => {
  for (const mutate of [t => { t.id = '<script>'; }, t => { t.order = '0'; }, t => { t.completedAt = time; }, t => { t.createdAt = '2026-02-30T00:00:00.000Z'; }, t => { t.moveHistory = Array(1001).fill({}); }]) {
    const s = C.emptyState(); const t = add(s, 'a'); mutate(t); assert.throws(() => C.validate(s));
  }
});
test('2000-task day stays logically complete and performs within target', () => {
  const s = C.emptyState(); for (let i = 0; i < 2000; i++) add(s, `id-${i}`, { status: i % 2 ? 'done' : 'todo' });
  const start = performance.now(); C.sortWeek(s, '2026-10-19'); C.validate(s); const stats = C.progress(s, '2026-10-19', 'all');
  assert.equal(stats.total, 2000); assert.equal(stats.percent, 50); const elapsed = performance.now() - start;
  assert.ok(elapsed < 300, `elapsed ${elapsed}ms`); console.log(`  2000 tasks: ${elapsed.toFixed(1)}ms`);
});
test('local date functions remain unchanged across timezones and DST', () => {
  const original = process.env.TZ;
  for (const zone of ['Europe/Moscow', 'Asia/Tokyo', 'America/New_York', 'Pacific/Honolulu']) {
    process.env.TZ = zone; assert.equal(C.dateKey(C.parseDate('2026-10-19')), '2026-10-19'); assert.equal(C.addDays('2026-03-08', 1), '2026-03-09'); assert.equal(C.monday('2026-10-19'), '2026-10-19');
  }
  if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
});
console.log(`RESULT: ${passed} test groups passed`);
