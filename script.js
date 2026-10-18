/* Моя неделя. Чистая модель отделена от DOM; все записи проходят через Repository. */
'use strict';
const PlannerCore = (() => {
  const KEY = 'my-week-planner.v1';
  const categories = { work: 'Работа', personal: 'Личное' };
  const priorities = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
  const statuses = { todo: 'Не начато', in_progress: 'В работе', deferred: 'Отложено', done: 'Готово' };
  const clone = value => JSON.parse(JSON.stringify(value));
  const pad = n => String(n).padStart(2, '0');
  function dateKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  function parseDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Некорректная дата');
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    if (dateKey(date) !== value) throw Error('Несуществующая дата');
    return date;
  }
  function validDate(value) { try { parseDate(value); return value >= '1900-01-01' && value <= '2100-12-31'; } catch { return false; } }
  function addDays(value, amount) { const date = parseDate(value); date.setDate(date.getDate() + amount); return dateKey(date); }
  function monday(value) { const date = parseDate(value); return addDays(value, -((date.getDay() + 6) % 7)); }
  function emptyState() { return { schemaVersion: 1, revision: 0, tasks: [], series: [], excludedOccurrences: [], settings: { categoryFilter: 'all' }, meta: { lastAutoTransferPromptWeek: null, backupReminderAfter: null } }; }
  function fields(input) {
    const value = { title: String(input.title ?? '').trim(), context: String(input.context ?? '').trim(), date: input.date, category: input.category, priority: input.priority, status: input.status };
    const errors = {};
    if (!value.title || [...value.title].length > 150) errors.title = 'Введите название от 1 до 150 символов.';
    if ([...value.context].length > 1000) errors.context = 'Контекст — не больше 1 000 символов.';
    if (!validDate(value.date)) errors.date = 'Выберите дату с 1900 по 2100 год.';
    if (!Object.hasOwn(categories, value.category) || !Object.hasOwn(priorities, value.priority) || !Object.hasOwn(statuses, value.status)) errors.form = 'Проверьте категорию, приоритет и статус.';
    return { value, errors };
  }
  const iso = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
  const idValid = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(x);
  function assert(ok, message) { if (!ok) throw Error(message); }
  function required(value, keys, label) {
    assert(value && typeof value === 'object' && !Array.isArray(value), `Неверный объект: ${label}`);
    for (const key of keys) assert(Object.hasOwn(value, key), `Отсутствует поле ${label}.${key}`);
  }
  function validate(state) {
    required(state, ['schemaVersion','revision','tasks','series','excludedOccurrences','settings','meta'], 'data');
    assert(state && state.schemaVersion === 1, 'Неизвестная версия сохранения. Исходные данные не изменены.');
    assert(Number.isSafeInteger(state.revision) && state.revision >= 0, 'Неверная версия записи');
    assert(Array.isArray(state.tasks) && state.tasks.length <= 20000, 'Некорректный список задач или превышен предел 20 000 задач');
    assert(Array.isArray(state.series) && Array.isArray(state.excludedOccurrences), 'Неверные данные повторений');
    assert(state.series.length <= 2000 && state.excludedOccurrences.length <= 50000, 'Превышен предел серий или исключений');
    const seriesIds = new Set(), occurrenceKeys = new Set();
    for (const series of state.series) {
      required(series, ['id','title','context','category','priority','startDate','endDate','weekdays','createdAt','updatedAt'], 'series');
      assert(idValid(series.id) && !seriesIds.has(series.id), 'Неверный или повторяющийся ID серии'); seriesIds.add(series.id);
      assert(typeof series.title === 'string' && typeof series.context === 'string' && !Object.keys(fields({ ...series, date: series.startDate, status: 'todo' }).errors).length, 'Неверный шаблон серии');
      assert(series.endDate === null || validDate(series.endDate) || (series.startDate === '1900-01-01' && series.endDate === '1899-12-31'), 'Неверное окончание серии');
      assert(Array.isArray(series.weekdays) && series.weekdays.length >= 1 && series.weekdays.length <= 7 && new Set(series.weekdays).size === series.weekdays.length && series.weekdays.every(n => Number.isInteger(n) && n >= 1 && n <= 7), 'Выберите дни недели');
      assert(iso(series.createdAt) && iso(series.updatedAt), 'Неверное время серии');
    }
    for (const excluded of state.excludedOccurrences) {
      required(excluded, ['seriesId','scheduledDate'], 'excludedOccurrences');
      assert(seriesIds.has(excluded.seriesId) && validDate(excluded.scheduledDate), 'Неверное исключение серии');
      const key = occurrenceKey(excluded); assert(!occurrenceKeys.has(key), 'Повторяющееся исключение'); occurrenceKeys.add(key);
    }
    required(state.settings, ['categoryFilter'], 'settings'); required(state.meta, ['lastAutoTransferPromptWeek'], 'meta');
    assert(['all', 'work', 'personal'].includes(state.settings.categoryFilter), 'Неверная категория фильтра');
    assert(state.meta && (state.meta.lastAutoTransferPromptWeek === null || (validDate(state.meta.lastAutoTransferPromptWeek) && monday(state.meta.lastAutoTransferPromptWeek) === state.meta.lastAutoTransferPromptWeek)), 'Неверная дата недели');
    if (state.meta.backupReminderAfter === undefined) state.meta.backupReminderAfter = null;
    assert(state.meta.backupReminderAfter === null || iso(state.meta.backupReminderAfter), 'Неверная дата напоминания');
    const ids = new Set();
    for (const task of state.tasks) {
      required(task, ['id','title','context','date','originalDate','category','priority','status','previousStatus','completedAt','order','seriesId','scheduledDate','createdAt','updatedAt','moveHistory'], 'task');
      assert(task && typeof task.title === 'string' && typeof task.context === 'string', 'Неверный текст задачи');
      assert(!Object.keys(fields(task).errors).length, 'Некорректные поля задачи');
      assert(idValid(task.id) && !ids.has(task.id), 'Некорректный или повторяющийся ID'); ids.add(task.id);
      assert(validDate(task.originalDate) && iso(task.createdAt) && iso(task.updatedAt), 'Неверные даты задачи');
      assert(Number.isSafeInteger(task.order) && task.order >= 0, 'Неверный порядок задачи');
      assert(['todo', 'in_progress', 'deferred'].includes(task.previousStatus), 'Неверный предыдущий статус');
      assert(task.status === 'done' ? iso(task.completedAt) : task.completedAt === null, 'Неверное время завершения');
      if (task.seriesId === null) assert(task.scheduledDate === null, 'Неверная связь с серией');
      else {
        assert(seriesIds.has(task.seriesId) && validDate(task.scheduledDate), 'Не найдена серия или неверная плановая дата');
        const key = occurrenceKey(task); assert(!occurrenceKeys.has(key), 'Повторение дублируется или исключено'); occurrenceKeys.add(key);
      }
      assert(Array.isArray(task.moveHistory) && task.moveHistory.length <= 1000, 'Превышен предел истории перемещений');
      for (const move of task.moveHistory) { required(move, ['fromDate','toDate','at','reason'], 'moveHistory'); assert(validDate(move.fromDate) && validDate(move.toDate) && iso(move.at) && ['manual', 'rollover'].includes(move.reason), 'Неверная история перемещений'); }
    }
    return state;
  }
  function safeTree(value, depth = 0) {
      assert(depth <= 12, 'Превышена глубина сохранения');
      if (value && typeof value === 'object') for (const key of Object.keys(value)) {
        assert(!['__proto__', 'prototype', 'constructor'].includes(key), 'Недопустимый ключ в сохранении'); safeTree(value[key], depth + 1);
      }
  }
  function canonical(state) {
    validate(state);
    const pick = (obj, keys) => Object.fromEntries(keys.map(key => [key, obj[key]]));
    const result = {
      schemaVersion: 1, revision: state.revision,
      tasks: state.tasks.map(task => ({ ...pick(task, ['id','title','context','date','originalDate','category','priority','status','previousStatus','completedAt','order','seriesId','scheduledDate','createdAt','updatedAt']), moveHistory: task.moveHistory.map(move => pick(move,['fromDate','toDate','at','reason'])) })),
      series: state.series.map(series => ({ ...pick(series,['id','title','context','category','priority','startDate','endDate','createdAt','updatedAt']), weekdays: [...series.weekdays] })),
      excludedOccurrences: state.excludedOccurrences.map(e => pick(e,['seriesId','scheduledDate'])),
      settings: { categoryFilter: state.settings.categoryFilter }, meta: { lastAutoTransferPromptWeek: state.meta.lastAutoTransferPromptWeek, backupReminderAfter: state.meta.backupReminderAfter }
    };
    for (const item of [...result.tasks, ...result.series]) { item.title = item.title.trim(); item.context = item.context.trim(); }
    new Set(result.tasks.map(t => t.date)).forEach(date => normalize(result,date)); return result;
  }
  function decode(raw) { const state = JSON.parse(raw); safeTree(state); return canonical(state); }
  function importBackup(raw, filename, size) {
    assert(/\.json$/i.test(filename), 'Выберите файл с расширением .json.');
    assert(Number.isFinite(size) && size >= 0 && size <= 10 * 1024 * 1024, 'Размер файла не должен превышать 10 MiB.');
    let backup; try { backup = JSON.parse(raw); } catch { throw Error('Файл содержит некорректный JSON.'); }
    safeTree(backup); required(backup,['format','exportedAt','data'],'backup');
    assert(backup.format === 'my-week-planner' && iso(backup.exportedAt), 'Неверный формат резервной копии или дата экспорта.');
    return canonical(backup.data);
  }
  function exportBackup(state, now) { return JSON.stringify({ format: 'my-week-planner', exportedAt: now, data: canonical(clone(state)) }, null, 2); }
  function storageBytes(state) { return 2 * (KEY.length + JSON.stringify(state).length); }
  function sixMonthsAgo(date) {
    const d = parseDate(date), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() - 6);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).getDate(); d.setDate(Math.min(day,last));
    return dateKey(d) < '1900-01-01' ? '1900-01-01' : dateKey(d);
  }
  function cleanup(state, boundary) {
    assert(validDate(boundary), 'Выберите корректную дату очистки.');
    const next = clone(state), doomed = next.tasks.filter(t => t.status === 'done' && t.date < boundary), ids = new Set(doomed.map(t => t.id));
    for (const task of doomed) if (task.seriesId) next.excludedOccurrences.push({seriesId:task.seriesId, scheduledDate:task.scheduledDate});
    next.tasks = next.tasks.filter(t => !ids.has(t.id)); new Set(doomed.map(t => t.date)).forEach(date => normalize(next,date));
    next.revision++; validate(next);
    return { state: next, count: doomed.length, freed: storageBytes(state) - storageBytes(next) };
  }
  function reminderDue(state, now) {
    return (state.tasks.length > 0 || state.series.length > 0) && (state.meta.backupReminderAfter === null || Date.parse(state.meta.backupReminderAfter) <= Date.parse(now));
  }
  function list(state, date, filter = 'all') { return state.tasks.filter(t => t.date === date && (filter === 'all' || t.category === filter)).sort((a, b) => a.order - b.order); }
  function normalize(state, date) { list(state, date).forEach((task, i) => { task.order = i; }); }
  function progress(state, week, filter) {
    const tasks = state.tasks.filter(t => t.date >= week && t.date <= addDays(week, 6) && (filter === 'all' || t.category === filter));
    const done = tasks.filter(t => t.status === 'done').length;
    return { total: tasks.length, done, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  }
  function changeStatus(task, status, now) {
    assert(Object.hasOwn(statuses, status), 'Неизвестный статус');
    if (task.status === status) return;
    if (status === 'done') { task.previousStatus = task.status; task.completedAt = now; }
    else { task.previousStatus = status; task.completedAt = null; }
    task.status = status; task.updatedAt = now;
  }
  function move(state, id, date, beforeId, now, reason = 'manual') {
    assert(validDate(date), 'Недопустимая дата');
    const task = state.tasks.find(t => t.id === id); assert(task, 'Задача не найдена');
    if (beforeId === id) return;
    const oldDate = task.date;
    const target = list(state, date).filter(t => t.id !== id);
    const index = beforeId ? target.findIndex(t => t.id === beforeId) : target.length;
    assert(index >= 0, 'Место вставки изменилось');
    if (oldDate !== date) { task.moveHistory.push({ fromDate: oldDate, toDate: date, at: now, reason }); task.date = date; }
    task.updatedAt = now; target.splice(index, 0, task); target.forEach((t, i) => { t.order = i; });
    if (oldDate !== date) normalize(state, oldDate);
  }
  function saveTask(state, input, existingId, newId, now) {
    const { value, errors } = fields(input); assert(!Object.keys(errors).length, Object.values(errors).join(' '));
    let task;
    if (existingId) {
      task = state.tasks.find(t => t.id === existingId); assert(task, 'Задача больше не существует');
      if (task.date !== value.date) move(state, task.id, value.date, null, now);
      changeStatus(task, value.status, now);
      Object.assign(task, value, { updatedAt: now });
    } else {
      task = { ...value, id: newId, originalDate: value.date, order: list(state, value.date).length, previousStatus: 'todo', completedAt: value.status === 'done' ? now : null, seriesId: null, scheduledDate: null, createdAt: now, updatedAt: now, moveHistory: [] };
      state.tasks.push(task);
    }
    return task;
  }
  function step(state, id, direction, filter) {
    const task = state.tasks.find(t => t.id === id); assert(task, 'Задача не найдена');
    const visible = list(state, task.date, filter), index = visible.findIndex(t => t.id === id), other = visible[index + direction];
    if (other) [task.order, other.order] = [other.order, task.order];
  }
  function sortWeek(state, week) {
    const rank = { high: 0, medium: 1, low: 2 };
    for (let i = 0; i < 7; i++) list(state, addDays(week, i)).sort((a, b) => rank[a.priority] - rank[b.priority]).forEach((t, j) => { t.order = j; });
  }
  function remove(state, id, exclude = true) {
    const task = state.tasks.find(t => t.id === id); assert(task, 'Задача не найдена');
    const day = list(state, task.date), index = day.findIndex(t => t.id === id);
    const record = { task: clone(task), before: day[index + 1]?.id, after: day[index - 1]?.id };
    if (task.seriesId && exclude) {
      state.excludedOccurrences.push({ seriesId: task.seriesId, scheduledDate: task.scheduledDate }); record.excluded = true;
    }
    state.tasks = state.tasks.filter(t => t.id !== id); normalize(state, task.date); return record;
  }
  function restore(state, record) {
    assert(!state.tasks.some(t => t.id === record.task.id), 'Задача уже восстановлена');
    const day = list(state, record.task.date), task = clone(record.task);
    let index = day.findIndex(t => t.id === record.before);
    if (index < 0) { const after = day.findIndex(t => t.id === record.after); index = after >= 0 ? after + 1 : Math.min(task.order, day.length); }
    day.splice(index, 0, task); state.tasks.push(task); day.forEach((t, i) => { t.order = i; });
    if (record.excluded) state.excludedOccurrences = state.excludedOccurrences.filter(e => occurrenceKey(e) !== occurrenceKey(task));
  }
  // Повторения идентифицируются плановой датой, независимо от перемещений.
  function occurrenceKey(value) { return `${value.seriesId}|${value.scheduledDate}`; }
  function weekday(date) { return (parseDate(date).getDay() + 6) % 7 + 1; }
  function firstOccurrence(start, weekdays, end = null) {
    if (!validDate(start) || !Array.isArray(weekdays) || !weekdays.length) return null;
    for (let i = 0; i < 7; i++) { const date = addDays(start, i); if (date > (end || '2100-12-31')) return null; if (weekdays.includes(weekday(date))) return date; }
    return null;
  }
  function seriesFields(input) {
    const base = fields({ ...input, date: input.startDate, status: 'todo' });
    assert(!Object.keys(base.errors).length, Object.values(base.errors).join(' '));
    assert(Array.isArray(input.weekdays) && input.weekdays.length > 0 && input.weekdays.every(n => Number.isInteger(n) && n >= 1 && n <= 7) && new Set(input.weekdays).size === input.weekdays.length, 'Выберите хотя бы один день недели.');
    const endDate = input.endDate || null;
    assert(endDate === null || (validDate(endDate) && endDate >= input.startDate), 'Окончание серии должно быть не раньше её начала.');
    assert(firstOccurrence(input.startDate, input.weekdays, endDate), 'В выбранном интервале нет дней повторения.');
    return { title: base.value.title, context: base.value.context, category: base.value.category, priority: base.value.priority, startDate: input.startDate, endDate, weekdays: [...input.weekdays].sort((a,b) => a-b) };
  }
  function addSeries(state, input, id, now) {
    assert(state.series.length < 2000, 'Превышен предел 2 000 серий.');
    const series = { ...seriesFields(input), id, createdAt: now, updatedAt: now }; state.series.push(series); return series;
  }
  function generate(state, horizon, now, makeId) {
    const used = new Set(state.excludedOccurrences.map(occurrenceKey));
    const order = new Map();
    for (const task of state.tasks) { if (task.seriesId) used.add(occurrenceKey(task)); order.set(task.date, Math.max(order.get(task.date) || 0, task.order + 1)); }
    let count = 0;
    for (const series of state.series) {
      const end = [horizon, series.endDate || '2100-12-31', '2100-12-31'].sort()[0];
      for (let date = series.startDate; date <= end; date = addDays(date, 1)) {
        if (!series.weekdays.includes(weekday(date))) continue;
        const key = occurrenceKey({ seriesId: series.id, scheduledDate: date }); if (used.has(key)) continue;
        assert(state.tasks.length < 20000, 'Не удалось создать повторения: превышен предел 20 000 задач.');
        state.tasks.push({ id: makeId(), title: series.title, context: series.context, category: series.category, priority: series.priority, date, originalDate: date, status: 'todo', previousStatus: 'todo', completedAt: null, order: order.get(date) || 0, seriesId: series.id, scheduledDate: date, createdAt: now, updatedAt: now, moveHistory: [] });
        order.set(date, (order.get(date) || 0) + 1); used.add(key); count++;
      }
    }
    return count;
  }
  function futureTasks(state, task) { return state.tasks.filter(t => t.seriesId === task.seriesId && t.scheduledDate >= task.scheduledDate); }
  function changeSeries(state, taskId, input, repeat, newSeriesId, horizon, now, makeId) {
    const task = state.tasks.find(t => t.id === taskId); assert(task?.seriesId, 'Не найдена задача серии');
    const series = state.series.find(s => s.id === task.seriesId), boundary = task.scheduledDate;
    const affected = futureTasks(state, task), dates = new Set(affected.map(t => t.date));
    const endHorizon = [horizon, ...affected.map(t => t.scheduledDate)].sort().at(-1);
    const nextInput = { ...input, startDate: boundary };
    if (repeat) seriesFields(nextInput);
    series.endDate = addDays(boundary, -1); series.updatedAt = now;
    const ids = new Set(affected.map(t => t.id)); state.tasks = state.tasks.filter(t => !ids.has(t.id));
    if (repeat) { addSeries(state, nextInput, newSeriesId, now); generate(state, endHorizon, now, makeId); }
    else {
      const standalone = clone(task); standalone.seriesId = null; standalone.scheduledDate = null;
      Object.assign(standalone, { title: input.title.trim(), context: input.context.trim(), category: input.category, priority: input.priority, updatedAt: now }); state.tasks.push(standalone);
    }
    dates.forEach(date => normalize(state, date));
    return repeat ? state.tasks.find(t => t.seriesId === newSeriesId)?.id || null : taskId;
  }
  function deleteFuture(state, taskId, now) {
    const task = state.tasks.find(t => t.id === taskId); assert(task?.seriesId, 'Не найдена задача серии');
    const series = state.series.find(s => s.id === task.seriesId), record = { series: clone(series), tasks: [] };
    const affected = futureTasks(state, task).sort((a,b) => a.date.localeCompare(b.date) || b.order-a.order);
    for (const item of affected) record.tasks.push(remove(state, item.id, false));
    series.endDate = addDays(task.scheduledDate, -1); series.updatedAt = now; return record;
  }
  function restoreFuture(state, record) {
    const index = state.series.findIndex(s => s.id === record.series.id); assert(index >= 0, 'Не найдена серия');
    state.series[index] = clone(record.series); [...record.tasks].reverse().forEach(item => restore(state, item));
  }
  function candidates(state, currentWeek) { return state.tasks.filter(t => t.date < currentWeek && t.status !== 'done').sort((a,b) => a.date.localeCompare(b.date) || a.order-b.order); }
  function rollover(state, ids, currentWeek, now) {
    const selected = new Set(ids);
    for (const task of candidates(state, currentWeek)) if (selected.has(task.id)) move(state, task.id, currentWeek, null, now, 'rollover');
  }
  class Repository {
    constructor(storage) { this.storage = storage; this.state = emptyState(); this.readonly = false; this.raw = null; this.valid = false; }
    load() {
      this.raw = this.storage.getItem(KEY);
      if (this.raw !== null) this.state = decode(this.raw);
      this.valid = true;
      const probe = `${KEY}.probe-${Date.now()}-${Math.random()}`;
      try { this.storage.setItem(probe, '1'); this.storage.removeItem(probe); } catch (error) {
        this.readonly = error.name !== 'QuotaExceededError';
        throw Error(this.readonly ? 'Браузер не разрешает локальное сохранение. Изменения недоступны.' : 'Хранилище заполнено. Скачайте копию и откройте «Хранилище и очистка».');
      }
      return this.state;
    }
    commit(operation) {
      if (this.readonly) throw Error('Сохранение недоступно. Изменения не записаны.');
      if (this.storage.getItem(KEY) !== this.raw) throw Error('Данные изменились в другой вкладке. Перезагрузите страницу перед сохранением.');
      const next = clone(this.state); const result = operation(next);
      next.revision++; validate(next); const raw = JSON.stringify(next);
      this.storage.setItem(KEY, raw); this.raw = raw; this.state = next; return result;
    }
    replace(imported) {
      if (!this.storage) throw Error('Браузер не разрешает доступ к хранилищу.');
      if (this.storage.getItem(KEY) !== this.raw) throw Error('Данные изменились в другой вкладке. Сначала обновите данные.');
      const next = canonical(clone(imported)); next.revision = (this.valid ? this.state.revision : 0) + 1; validate(next);
      const raw = JSON.stringify(next); this.storage.setItem(KEY,raw);
      this.state = next; this.raw = raw; this.valid = true; this.readonly = false;
    }
  }
  return { KEY, categories, priorities, statuses, clone, dateKey, parseDate, validDate, addDays, monday, emptyState, fields, validate, decode, canonical, importBackup, exportBackup, storageBytes, sixMonthsAgo, cleanup, reminderDue, list, normalize, progress, changeStatus, move, saveTask, step, sortWeek, remove, restore, weekday, firstOccurrence, seriesFields, addSeries, generate, futureTasks, changeSeries, deleteFuture, restoreFuture, candidates, rollover, Repository };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PlannerCore;

if (typeof document !== 'undefined') (() => {
  const C = PlannerCore, $ = id => document.getElementById(id);
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  let today = C.dateKey(new Date()), week = C.monday(today), pages = {}, editing = null, baseline = '', opener = null, busy = false, dragged = null;
  let generationBlocked = false, maintenanceRunning = false, deleteId = null, modalOpener = null;
  let renderedKey = null, repeatInitialized = false;
  let transferWeek = null, transferPage = 0, transferRows = [], transferSelected = new Set();
  const seriesUndoLocks = new Map();
  const pendingUndo = new Set();
  let dataMode = null, pendingImport = null, dataOpener = null, externalPending = false, importReadVersion = 0;
  let repository, startupError = '';
  try { repository = new C.Repository(window.localStorage); repository.load(); } catch (error) {
    startupError = error.message;
    if (!repository) repository = new C.Repository(null);
    repository.readonly = !repository.valid || repository.readonly;
  }
  const state = () => repository.state;
  const filter = () => state().settings.categoryFilter;
  const now = () => new Date().toISOString();
  const fullDate = value => C.parseDate(value).toLocaleDateString('ru-RU');
  const shortDate = value => C.parseDate(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const range = start => `${shortDate(start)} — ${shortDate(C.addDays(start, 6))}`;
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function button(text, action, className = '') { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; }
  function announce(message) { $('announcer').textContent = ''; requestAnimationFrame(() => { $('announcer').textContent = message; }); }
  function toast(message, actionText, action, lifetime = 6000, error = false) {
    const item = el('div', `toast${error ? ' error' : ''}`); item.append(el('span', '', message));
    if (action) item.append(button(actionText, () => { if (action() !== false) item.remove(); }));
    $('toasts').append(item); announce(message); setTimeout(() => item.remove(), lifetime); return item;
  }
  function errorMessage(error) {
    if (error.name === 'QuotaExceededError') return 'Не удалось сохранить данные: хранилище браузера заполнено. Изменения не записаны.';
    if (error.name === 'SecurityError') return 'Браузер запретил сохранение. Изменения не записаны.';
    return error.message || 'Не удалось сохранить данные. Изменения не записаны.';
  }
  function transact(operation) {
    try { repository.commit(operation); updateDataNotices(); return true; }
    catch (error) { const message = errorMessage(error); toast(message, null, null, 10000, true); for (const [dialog, field] of [['editor','form-error'],['delete-dialog','delete-error'],['transfer-dialog','transfer-error'],['data-dialog','data-error']]) if ($(dialog).open) { $(field).textContent = message; $(field).hidden = false; } return false; }
  }
  function uid() {
    if (!globalThis.crypto?.getRandomValues) throw Error('Браузер не поддерживает создание безопасных идентификаторов.');
    const bytes = crypto.getRandomValues(new Uint8Array(16)); return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  function horizon() { return [C.addDays(C.monday(today), 6), C.addDays(week, 6)].sort().at(-1); }
  function hasDialog() { return !!document.querySelector('dialog[open]'); }
  function locked(seriesId) { return (seriesUndoLocks.get(seriesId) || []).some(token => token.deadline > Date.now()); }
  function addUndo(message, operation, seriesId = null) {
    const deadline = Date.now() + 10000;
    const token = { deadline };
    pendingUndo.add(token);
    if (seriesId) seriesUndoLocks.set(seriesId, [...(seriesUndoLocks.get(seriesId) || []), token]);
    const unlock = () => { pendingUndo.delete(token); if (seriesId) seriesUndoLocks.set(seriesId, (seriesUndoLocks.get(seriesId) || []).filter(t => t !== token)); if (dataMode === 'cleanup' && $('data-dialog').open) previewCleanup(); };
    setTimeout(unlock, 10000);
    toast(message, 'Отменить', () => {
      if (Date.now() >= deadline || !pendingUndo.has(token)) return true;
      if (!transact(operation)) return false;
      unlock(); render(); announce('Удаление отменено.'); return true;
    }, 10000);
  }
  function maintenance(force = false) {
    if (repository.readonly || externalPending || maintenanceRunning) return false;
    if (generationBlocked && !force) return false;
    maintenanceRunning = true;
    try {
      const draft = C.clone(state()); const added = C.generate(draft, horizon(), now(), uid);
      if (added) repository.commit(s => { s.tasks = draft.tasks; });
      generationBlocked = false; $('generation-error').hidden = true; render(); return true;
    } catch (error) {
      generationBlocked = true;
      $('generation-message').textContent = error.name === 'QuotaExceededError' ? 'Не удалось создать повторения: недостаточно места. Прежние задачи сохранены.' : `Не удалось создать повторения. ${errorMessage(error)}`;
      $('generation-error').hidden = false; $('unfinished').disabled = true; return false;
    } finally { maintenanceRunning = false; }
  }
  function autoTransfer() {
    if (hasDialog() || repository.readonly || externalPending || generationBlocked) return;
    const current = C.monday(today);
    if (state().meta.lastAutoTransferPromptWeek !== current && C.candidates(state(), current).length) openTransfer();
  }
  function afterDialog() { setTimeout(() => { if (!hasDialog()) { refreshDate(); autoTransfer(); } }, 0); }
  function focusTask(id) {
    const card = Array.from($('board').querySelectorAll('.card')).find(n => n.dataset.id === id);
    if (card) { card.querySelector('.task-title').focus({ preventScroll: true }); card.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function reveal(id, clearFilter = false) {
    const task = state().tasks.find(t => t.id === id); if (!task) return false;
    if (clearFilter && filter() !== 'all' && !transact(s => { s.settings.categoryFilter = 'all'; })) return false;
    week = C.monday(task.date);
    pages[task.date] = Math.floor(C.list(state(), task.date, filter()).findIndex(t => t.id === id) / 50);
    render(); focusTask(id); return true;
  }
  function movedAnnouncement(id) {
    const task = state().tasks.find(t => t.id === id); if (!task) return;
    const visible = C.list(state(), task.date, filter()), index = visible.findIndex(t => t.id === id);
    const day = days[(C.parseDate(task.date).getDay() + 6) % 7];
    announce(`Задача ${task.title} перемещена: ${day}, ${fullDate(task.date)}, ${index < 0 ? 'Не отображается при текущем фильтре' : `позиция ${index + 1} из ${visible.length}`}.`);
  }
  function moveTask(id, date, before = null) {
    if (transact(s => C.move(s, id, date, before, now()))) { reveal(id); movedAnnouncement(id); }
    else render();
  }
  function setStatus(id, status) {
    if (transact(s => { const task = s.tasks.find(t => t.id === id); C.changeStatus(task, status, now()); })) {
      render(); focusTask(id); announce(`Статус изменён: ${C.statuses[status]}.`);
    } else render();
  }
  function deleteTask(id) {
    const task = state().tasks.find(t => t.id === id);
    if (task?.seriesId) {
      deleteId = id; modalOpener = document.activeElement; $('delete-description').textContent = `${task.title} · повторение за ${fullDate(task.scheduledDate)}`;
      $('delete-choices').hidden = false; $('delete-confirm').hidden = true; $('delete-error').hidden = true; $('delete-dialog').showModal(); $('delete-one').focus(); return;
    }
    deleteSingle(id);
  }
  function deleteSingle(id) {
    let record;
    if (!transact(s => { record = C.remove(s, id); })) return;
    if ($('delete-dialog').open) closeDelete();
    render(); $('add-task').focus({ preventScroll: true });
    addUndo('Задача удалена', s => C.restore(s, record), record.task.seriesId);
  }
  function card(task, visible, index) {
    const node = el('article', `card ${task.category}${task.status === 'done' ? ' done' : ''}`); node.dataset.id = task.id;
    const top = el('div', 'card-top'); top.append(el('span', 'category-label', C.categories[task.category]));
    if (task.seriesId) { const repeat = el('span', 'repeat-icon', '↻'); repeat.title = 'Повторяющаяся задача'; repeat.setAttribute('aria-label', 'Повторяющаяся задача'); top.append(repeat); }
    const handle = button('⠿', () => {}, 'drag-handle'); handle.title = 'Перетащить задачу'; handle.setAttribute('aria-label', `Перетащить: ${task.title}. Для клавиатуры используйте меню задачи.`); handle.draggable = !repository.readonly; handle.disabled = repository.readonly;
    handle.addEventListener('dragstart', event => { dragged = task.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.setDragImage(node, 25, 20); document.body.classList.add('is-dragging'); node.classList.add('dragging'); });
    handle.addEventListener('dragend', clearDrag);
    top.append(handle);
    const menu = el('details', 'card-menu'), summary = el('summary', '', '···'); summary.setAttribute('aria-label', `Действия: ${task.title}`);
    const panel = el('div', 'menu-panel');
    const actions = [['Редактировать', () => openEditor(task)], ['Копировать', () => openEditor(task, true)], ['Выше', () => changeOrder(-1)], ['Ниже', () => changeOrder(1)], ['Удалить', () => deleteTask(task.id)]];
    actions.forEach(([label, action], n) => { const b = button(label, action, n === 4 ? 'danger' : ''); b.disabled = repository.readonly || (n === 2 && index === 0) || (n === 3 && index === visible.length - 1); panel.append(b); });
    menu.append(summary, panel); top.append(menu); node.append(top);
    function changeOrder(direction) { if (transact(s => C.step(s, task.id, direction, filter()))) { reveal(task.id); movedAnnouncement(task.id); } }
    const titleRow = el('div', 'title-row'), check = el('input', 'done-toggle'); check.type = 'checkbox'; check.checked = task.status === 'done'; check.disabled = repository.readonly; check.setAttribute('aria-label', `Готово: ${task.title}`); check.addEventListener('change', () => setStatus(task.id, check.checked ? 'done' : task.previousStatus));
    const title = button(task.title, () => openEditor(task), 'task-title'); titleRow.append(check, title); node.append(titleRow);
    if (task.context) node.append(el('p', 'task-context', task.context));
    const bottom = el('div', 'card-bottom'); bottom.append(el('span', `priority ${task.priority}`, `${task.priority === 'high' ? '↑ ' : task.priority === 'low' ? '↓ ' : ''}${C.priorities[task.priority]}`));
    const select = el('select', 'status-select'); select.setAttribute('aria-label', `Статус: ${task.title}`); select.disabled = repository.readonly;
    for (const [value, text] of Object.entries(C.statuses)) { const option = el('option', '', text); option.value = value; select.append(option); } select.value = task.status;
    select.addEventListener('change', () => setStatus(task.id, select.value)); bottom.append(select); node.append(bottom);
    if (task.moveHistory.length) node.append(el('span', 'moved-note', `Перенесено с ${fullDate(task.moveHistory.at(-1).fromDate)}`));
    if (task.seriesId && task.date !== task.scheduledDate) node.append(el('span', 'moved-note', `Повторение за ${fullDate(task.scheduledDate)}`));
    return node;
  }
  function clearDrop() { document.querySelectorAll('.drop-target,.drop-before').forEach(n => n.classList.remove('drop-target', 'drop-before')); }
  function clearDrag() { dragged = null; clearDrop(); document.body.classList.remove('is-dragging'); document.querySelectorAll('.dragging').forEach(n => n.classList.remove('dragging')); }
  function render() {
    updateDataNotices();
    const renderKey = JSON.stringify([state(), week, today, pages, repository.readonly, generationBlocked]);
    if (renderKey === renderedKey) return;
    const active = document.activeElement, activeCard = active?.closest('.card');
    const activeId = activeCard?.dataset.id, activeClass = active?.className, activeTag = active?.tagName;
    const openMenus = new Set(Array.from($('board').querySelectorAll('.card-menu[open]')).map(n => n.closest('.card').dataset.id));
    const current = C.monday(today), sameWeek = week === current;
    $('view-week').textContent = `${sameWeek ? 'Текущая неделя' : 'Просматриваемая неделя'}: ${range(week)}`;
    $('current-week').textContent = sameWeek ? '' : `Текущая неделя: ${range(current)}`; $('current-week').hidden = sameWeek;
    $('previous-week').disabled = C.addDays(week, -7) < '1900-01-01'; $('next-week').disabled = C.addDays(week, 7) > '2100-12-31';
    $('add-task').disabled = repository.readonly; $('sort-tasks').disabled = repository.readonly;
    $('unfinished-count').textContent = String(C.candidates(state(), C.monday(today)).length); $('unfinished').disabled = repository.readonly || generationBlocked;
    document.querySelectorAll('[data-filter]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.filter === filter())); b.disabled = repository.readonly; });
    const stats = C.progress(state(), week, filter()); $('progress').value = stats.percent; $('progress-percent').textContent = stats.total ? `${stats.percent}%` : ''; $('progress-label').textContent = stats.total ? `Готово ${stats.done} из ${stats.total}` : 'Пока нет задач';
    $('board').replaceChildren();
    for (let i = 0; i < 7; i++) {
      const date = C.addDays(week, i), dateObject = C.parseDate(date), visible = C.list(state(), date, filter()), total = C.list(state(), date).length;
      const section = el('section', `day${date === today ? ' is-today' : ''}${i > 4 ? ' is-weekend' : ''}`); section.dataset.date = date; section.setAttribute('aria-label', `${days[i]}, ${fullDate(date)}`);
      const header = el('div', 'day-header'), heading = el('div'); heading.append(el('h3', 'day-name', days[i]));
      const number = el('p', 'day-date', String(dateObject.getDate())); number.append(el('span', 'day-month', dateObject.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''))); heading.append(number); if (date === today) heading.append(el('span', 'today-badge', 'СЕГОДНЯ'));
      header.append(heading, el('span', 'day-count', String(visible.length))); section.append(header);
      const list = el('div', 'task-list');
      const page = Math.min(Math.max(0, pages[date] || 0), Math.max(0, Math.ceil(visible.length / 50) - 1)); pages[date] = page;
      visible.slice(page * 50, page * 50 + 50).forEach((task, j) => list.append(card(task, visible, page * 50 + j)));
      if (!visible.length) { const empty = el('div', 'empty-day'); empty.append(el('span', 'empty-symbol', '—'), el('p', '', total ? 'Нет задач в этой категории' : 'Нет задач')); list.append(empty); }
      section.append(list);
      const end = el('div', 'end-drop', 'В конец дня'); section.append(end);
      if (visible.length > 50) {
        const pager = el('div', 'pager'), prev = button('←', () => { pages[date]--; render(); focusPager(date); }), next = button('→', () => { pages[date]++; render(); focusPager(date); });
        prev.setAttribute('aria-label', `Предыдущая страница: ${days[i]}`); next.setAttribute('aria-label', `Следующая страница: ${days[i]}`); prev.disabled = page === 0; next.disabled = (page + 1) * 50 >= visible.length;
        pager.append(prev, el('span', '', `${page * 50 + 1}–${Math.min(visible.length, page * 50 + 50)} из ${visible.length}`), next); section.append(pager);
      }
      const add = button('＋ Задача', () => openEditor(null, false, date), 'day-add'); add.setAttribute('aria-label', `Добавить задачу: ${days[i]}`); add.disabled = repository.readonly || !C.validDate(date); section.append(add);
      section.addEventListener('dragover', event => { if (!dragged || repository.readonly || !C.validDate(date)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; clearDrop(); section.classList.add('drop-target'); const target = event.target.closest('.card'); if (target && target.dataset.id !== dragged) target.classList.add('drop-before'); });
      section.addEventListener('drop', event => { if (!dragged || repository.readonly || !C.validDate(date)) return; event.preventDefault(); const id = dragged, target = event.target.closest('.card'); clearDrag(); moveTask(id, date, target?.dataset.id || null); });
      $('board').append(section);
    }
    for (const node of $('board').querySelectorAll('.card')) {
      if (openMenus.has(node.dataset.id)) node.querySelector('.card-menu').open = true;
      if (activeId === node.dataset.id) {
        const target = Array.from(node.querySelectorAll('button,input,select,summary')).find(n => n.tagName === activeTag && n.className === activeClass && n.textContent === active.textContent);
        (target || node.querySelector('.task-title')).focus({preventScroll:true});
      }
    }
    renderedKey = JSON.stringify([state(), week, today, pages, repository.readonly, generationBlocked]);
  }
  function focusPager(date) { const day = Array.from($('board').children).find(n => n.dataset.date === date); day?.querySelector('.pager button:not(:disabled)')?.focus({ preventScroll: true }); }
  function readForm() { return { title: $('task-title').value, context: $('task-context').value, date: $('task-date').value, category: $('task-category').value, priority: $('task-priority').value, status: $('task-status').value, repeat: $('repeat-enabled').checked, weekdays: Array.from(document.querySelectorAll('.weekdays input:checked')).map(n => Number(n.value)), endDate: $('repeat-end').value || null, scope: $('edit-scope').value }; }
  function editTask() { return state().tasks.find(t => t.id === editing); }
  function seriesInput(input) { return { ...input, startDate: editTask()?.seriesId && input.scope === 'future' ? editTask().scheduledDate : input.date }; }
  function updateRepeatUI() {
    const task = editTask(), linked = !!task?.seriesId, future = linked && $('edit-scope').value === 'future', repeat = $('repeat-enabled').checked;
    $('repeat-enabled').disabled = linked && !future; $('repeat-options').hidden = !repeat;
    document.querySelectorAll('.weekdays input').forEach(n => { n.disabled = linked && !future; }); $('repeat-end').disabled = linked && !future;
    $('task-date').disabled = future || (!!task && !linked && repeat);
    $('task-status').disabled = future || (!linked && repeat);
    if (!linked && repeat) $('task-status').value = 'todo';
    $('repeat-note').hidden = !repeat || (linked && !future);
    $('scope-note').textContent = future ? `Граница изменения — повторение за ${fullDate(task.scheduledDate)}. Статусы и переносы будущих повторений будут сброшены.` : 'Изменения этой карточки не меняют расписание остальных повторений.';
    const input = readForm(), start = seriesInput(input).startDate, first = C.firstOccurrence(start, input.weekdays, input.endDate);
    $('repeat-preview').textContent = linked && !future ? 'Расписание доступно в режиме «Эту и будущие».' : first ? `Первое повторение: ${fullDate(first)}` : 'Выберите дни и подходящий интервал повторения.';
  }
  function openEditor(task = null, copy = false, date = null) {
    if (repository.readonly && (!task || copy)) return;
    $('task-form').querySelectorAll('input,textarea,select').forEach(n => { n.disabled = false; });
    $('save-task').hidden = repository.readonly;
    $('cancel-editor').textContent = repository.readonly ? 'Закрыть' : 'Отмена';
    opener = document.activeElement; editing = task && !copy ? task.id : null;
    const data = task ? { ...task, status: copy ? 'todo' : task.status } : { title: '', context: '', date: date || (week === C.monday(today) ? today : week), category: 'work', priority: 'medium', status: 'todo' };
    $('editor-title').textContent = repository.readonly ? 'Просмотр задачи' : editing ? 'Редактировать задачу' : copy ? 'Копия задачи' : 'Новая задача';
    for (const key of ['title', 'context', 'date', 'category', 'priority', 'status']) $(`task-${key}`).value = data[key];
    const linked = task?.seriesId && !copy, series = linked ? state().series.find(s => s.id === task.seriesId) : null;
    repeatInitialized = !!linked;
    clearRepeatErrors();
    $('scope-field').hidden = !linked; $('edit-scope').value = 'one'; $('repeat-enabled').checked = !!linked; $('repeat-end').value = series?.endDate || '';
    document.querySelectorAll('.weekdays input').forEach(n => { n.checked = (series?.weekdays || [C.weekday(data.date)]).includes(Number(n.value)); });
    $('series-confirm').hidden = true; updateRepeatUI();
    for (const key of ['title', 'context', 'date']) { $(`${key}-error`).hidden = true; $(`task-${key}`).removeAttribute('aria-invalid'); }
    $('form-error').hidden = true; $('discard-prompt').hidden = true; $('save-task').disabled = false;
    $('history-list').replaceChildren(); $('history').hidden = !editing || !task.moveHistory.length; $('history').open = false;
    if (editing) task.moveHistory.forEach(move => $('history-list').append(el('li', '', `${fullDate(move.fromDate)} → ${fullDate(move.toDate)} · ${new Date(move.at).toLocaleString('ru-RU')}`)));
    if (repository.readonly) $('task-form').querySelectorAll('input,textarea,select').forEach(n => { n.disabled = true; });
    baseline = JSON.stringify(readForm()); $('editor').showModal(); (repository.readonly ? $('cancel-editor') : $('task-title')).focus();
  }
  function closeEditor() { $('editor').close(); editing = null; if (opener?.isConnected) opener.focus(); else $('add-task').focus({ preventScroll: true }); afterDialog(); }
  function askClose() { if (JSON.stringify(readForm()) === baseline) closeEditor(); else { $('discard-prompt').hidden = false; $('keep-editing').focus(); } }
  $('close-editor').addEventListener('click', askClose); $('cancel-editor').addEventListener('click', askClose);
  $('editor').addEventListener('cancel', event => { event.preventDefault(); askClose(); });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll('button,input,select,textarea,summary,[tabindex]')).filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first?.focus(); }
  }));
  $('keep-editing').addEventListener('click', () => { $('discard-prompt').hidden = true; $('task-title').focus(); });
  $('discard-changes').addEventListener('click', closeEditor);
  $('task-form').addEventListener('submit', event => { event.preventDefault(); saveEditor(false); });
  $('apply-series').addEventListener('click', () => saveEditor(true));
  $('cancel-series-confirm').addEventListener('click', () => { $('series-confirm').hidden = true; $('task-title').focus(); });
  $('task-form').addEventListener('input', () => { $('series-confirm').hidden = true; });
  $('repeat-enabled').addEventListener('change', () => {
    const task = editTask(); if (task && !task.seriesId && $('repeat-enabled').checked) $('task-date').value = task.date;
    if ($('repeat-enabled').checked && !repeatInitialized && C.validDate($('task-date').value)) {
      document.querySelectorAll('.weekdays input').forEach(n => { n.checked = Number(n.value) === C.weekday($('task-date').value); });
      repeatInitialized = true;
    }
    if (!$('repeat-enabled').checked && !task?.seriesId) $('task-status').value = task?.status || 'todo';
    updateRepeatUI();
  });
  for (const id of ['task-date','repeat-end']) $(id).addEventListener('change', updateRepeatUI);
  document.querySelectorAll('.weekdays input').forEach(n => n.addEventListener('change', updateRepeatUI));
  $('edit-scope').addEventListener('change', () => {
    const task = editTask(); if (!task?.seriesId) return;
    const future = $('edit-scope').value === 'future', series = state().series.find(s => s.id === task.seriesId), source = future ? series : task;
    for (const key of ['title','context','category','priority']) $(`task-${key}`).value = source[key];
    $('task-date').value = future ? task.scheduledDate : task.date; $('task-status').value = future ? 'todo' : task.status;
    $('repeat-enabled').checked = true; $('repeat-end').value = series.endDate || '';
    document.querySelectorAll('.weekdays input').forEach(n => { n.checked = series.weekdays.includes(Number(n.value)); }); updateRepeatUI(); $('series-confirm').hidden = true;
  });
  function clearRepeatErrors() {
    for (const id of ['weekdays','repeat-end']) { $(id + '-error').hidden = true; $(id).removeAttribute('aria-invalid'); }
  }
  function saveEditor(confirmed) {
    if (busy || repository.readonly || !$('editor').open) return;
    clearRepeatErrors();
    const input = readForm(), result = C.fields(input); $('form-error').hidden = true;
    for (const key of ['title', 'context', 'date']) { const error = result.errors[key]; $(`${key}-error`).textContent = error || ''; $(`${key}-error`).hidden = !error; $(`task-${key}`).setAttribute('aria-invalid', String(!!error)); }
    if (Object.keys(result.errors).length) { const key = Object.keys(result.errors)[0]; if (key === 'form') { $('form-error').textContent = result.errors.form; $('form-error').hidden = false; } else $(`task-${key}`).focus(); announce('Проверьте заполнение полей.'); return; }
    const oldTask = editTask(), future = !!oldTask?.seriesId && input.scope === 'future', seriesCreation = !oldTask?.seriesId && input.repeat;
    try {
      if (future && locked(oldTask.seriesId)) throw Error('Сначала отмените удаление или дождитесь окончания срока отмены.');
      if (seriesCreation || (future && input.repeat)) C.seriesFields(seriesInput(input));
    } catch (error) {
      if ((seriesCreation || (future && input.repeat)) && !(future && locked(oldTask.seriesId))) {
        const id = input.weekdays.length ? 'repeat-end' : 'weekdays';
        $(id + '-error').textContent = error.message; $(id + '-error').hidden = false; $(id).setAttribute('aria-invalid','true');
        (id === 'weekdays' ? $('weekdays').querySelector('input') : $(id)).focus();
      } else { $('form-error').textContent = error.message; $('form-error').hidden = false; }
      return;
    }
    if (!confirmed && (future || (seriesCreation && oldTask))) {
      $('series-confirm-text').textContent = future ? input.repeat ? `Выбранное и будущие повторения будут созданы заново. Их отдельные изменения, переносы и статусы, включая «Готово», будут сброшены. Заменяемых экземпляров: ${C.futureTasks(state(), oldTask).length}.` : `Будущие повторения будут удалены (${C.futureTasks(state(), oldTask).length - 1}), а выбранная задача станет самостоятельной с прежней датой и статусом.` : 'Задача будет заменена серией; новые повторения начнутся со статуса «Не начато».';
      $('series-confirm').hidden = false; $('apply-series').focus(); return;
    }
    busy = true; $('save-task').disabled = true; $('apply-series').disabled = true;
    try {
      const id = editing || uid(), old = state().tasks.find(t => t.id === id), oldDate = old?.date;
      let resultId = id, firstDate = null;
      if (transact(s => {
        if (future) resultId = C.changeSeries(s, id, input, input.repeat, uid(), horizon(), now(), uid);
        else if (seriesCreation) {
          if (old) C.remove(s, old.id);
          const series = C.addSeries(s, seriesInput(input), uid(), now()); firstDate = C.firstOccurrence(series.startDate, series.weekdays, series.endDate);
          C.generate(s, horizon(), now(), uid); resultId = s.tasks.find(t => t.seriesId === series.id)?.id || null;
        } else C.saveTask(s, input, editing, id, now());
        if (future && input.repeat && !resultId) firstDate = C.firstOccurrence(old.scheduledDate, input.weekdays, input.endDate);
      })) {
        const task = state().tasks.find(t => t.id === resultId), isVisible = task && task.date >= week && task.date <= C.addDays(week, 6) && (filter() === 'all' || task.category === filter());
        closeEditor(); render();
        if (isVisible) { reveal(resultId); announce('Задача сохранена.'); }
        else if (task) toast('Задача сохранена', 'Показать', () => reveal(resultId, true));
        else toast(`Серия сохранена. Первое повторение: ${fullDate(firstDate)}`, 'Показать', () => { week = C.monday(firstDate); pages = {}; if (filter() !== 'all') transact(s => { s.settings.categoryFilter = 'all'; }); maintenance(); render(); });
        if (task && oldDate && oldDate !== task.date && !future && !seriesCreation) movedAnnouncement(resultId);
      }
    } catch (error) { $('form-error').textContent = errorMessage(error); $('form-error').hidden = false; }
    finally { busy = false; $('save-task').disabled = false; $('apply-series').disabled = false; }
  }
  // Управление данными: подтверждения, восстановление и уведомления.
  function updateDataNotices() {
    $('export-data').disabled = !repository.valid;
    $('storage-data').disabled = !repository.valid;
    $('recovery-actions').hidden = repository.valid && !repository.readonly;
    $('download-raw').disabled = repository.raw === null;
    $('backup-reminder').hidden = !repository.valid || !C.reminderDue(state(), now());
    $('reminder-later').disabled = repository.readonly || externalPending;
    $('volume-warning').hidden = !repository.valid || C.storageBytes(state()) < 3 * 1024 * 1024;
  }
  function downloadText(text, filename) {
    const blob = new Blob([text], {type:'application/json;charset=utf-8'}), url = URL.createObjectURL(blob), link = el('a');
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function filename(prefix) { const d = new Date(), pad = n => String(n).padStart(2,'0'); return `${prefix}-${C.dateKey(d)}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`; }
  function exportData() {
    try {
      if (!repository.valid) throw Error('Нет корректного сохранения для экспорта. Скачайте исходное сохранение.');
      downloadText(C.exportBackup(state(), now()), filename('my-week-backup')); toast('Скачивание резервной копии начато');
      if (!repository.readonly && !externalPending) transact(s => { s.meta.backupReminderAfter = new Date(Date.now() + 7 * 86400000).toISOString(); });
    } catch (error) { toast(errorMessage(error),null,null,10000,true); }
  }
  function exportRaw() { if (repository.raw !== null) { downloadText(repository.raw,filename('my-week-original')); toast('Скачивание исходного сохранения начато'); } }
  function clearTransient() { pendingUndo.clear(); seriesUndoLocks.clear(); $('toasts').replaceChildren(); pages = {}; generationBlocked = false; $('generation-error').hidden = true; externalPending = false; $('external-change').hidden = true; }
  function closeData() {
    $('data-dialog').close(); dataMode = null; pendingImport = null; importReadVersion++;
    if (dataOpener?.isConnected) dataOpener.focus(); else $('data-menu').querySelector('summary').focus(); afterDialog();
  }
  function openData(mode) {
    if (hasDialog()) return false;
    dataMode = mode; dataOpener = document.activeElement; $('data-menu').open = false; $('data-error').hidden = true;
    for (const name of ['import','cleanup','reset','refresh']) $(`${name}-panel`).hidden = name !== mode;
    $('data-dialog-title').textContent = {import:'Восстановить резервную копию',cleanup:'Хранилище и очистка',reset:'Начать заново',refresh:'Обновить данные'}[mode];
    $('confirm-data').textContent = {import:'Заменить данные',cleanup:'Удалить готовые задачи',reset:'Начать заново',refresh:'Обновить без сохранения'}[mode];
    $('confirm-data').disabled = mode === 'import'; $('import-backup').disabled = !repository.valid; $('reset-backup').disabled = repository.raw === null;
    if (mode === 'cleanup') { $('cleanup-date').value = C.sixMonthsAgo(C.dateKey(new Date())); previewCleanup(); }
    $('data-dialog').showModal(); $('cancel-data').focus(); return true;
  }
  function previewCleanup() {
    if (dataMode !== 'cleanup') return;
    $('storage-size').textContent = `Размер сохранения: примерно ${(C.storageBytes(state()) / (1024*1024)).toFixed(2)} MiB`;
    try {
      const preview = C.cleanup(state(), $('cleanup-date').value), lockedUndo = [...pendingUndo].some(t => t.deadline > Date.now());
      $('cleanup-summary').textContent = lockedUndo ? 'Сначала отмените недавние удаления или дождитесь окончания срока отмены.' : `${preview.count} готовых задач. Можно освободить примерно ${Math.max(0,preview.freed / 1024).toFixed(1)} KiB.${preview.count && preview.freed <= 0 ? ' Эта операция не освободит место.' : ''}`;
      $('confirm-data').textContent = `Удалить ${preview.count} готовых задач`;
      $('confirm-data').disabled = repository.readonly || externalPending || lockedUndo || !preview.count || preview.freed <= 0;
    } catch (error) { $('cleanup-summary').textContent = error.message; $('confirm-data').disabled = true; }
  }
  function chooseImport() { $('data-menu').open = false; $('import-file').value = ''; $('import-file').click(); }
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files[0]; if (!file || !openData('import')) return;
    pendingImport = null; $('import-summary').textContent = 'Проверяем резервную копию…'; const version = ++importReadVersion;
    try {
      if (file.size > 10*1024*1024) throw Error('Размер файла не должен превышать 10 MiB.');
      if (!/\.json$/i.test(file.name)) throw Error('Выберите файл с расширением .json.');
      const raw = await file.text(); if (version !== importReadVersion || dataMode !== 'import') return;
      pendingImport = C.importBackup(raw,file.name,file.size);
      $('import-summary').textContent = `Задач: ${pendingImport.tasks.length}. Серий: ${pendingImport.series.length}. Исключений: ${pendingImport.excludedOccurrences.length}.`;
      $('confirm-data').disabled = externalPending;
    } catch (error) {
      if (version !== importReadVersion || dataMode !== 'import') return;
      $('import-summary').textContent = 'Копия не прошла проверку. Текущие данные не изменены.'; $('data-error').textContent = error.message || 'Не удалось прочитать файл.'; $('data-error').hidden = false;
    }
  });
  $('confirm-data').addEventListener('click', () => {
    if (!$('data-dialog').open || $('confirm-data').disabled) return;
    try {
      if (dataMode === 'cleanup') {
        if ([...pendingUndo].some(t => t.deadline > Date.now())) throw Error('Дождитесь окончания срока отмены удалений.');
        const result = C.cleanup(state(),$('cleanup-date').value); if (!result.count || result.freed <= 0) throw Error('Выбранная операция не освободит место.');
        if (!transact(s => { s.tasks = result.state.tasks; s.excludedOccurrences = result.state.excludedOccurrences; })) return;
        closeData(); render(); toast(`Удалено готовых задач: ${result.count}`); return;
      }
      if (dataMode === 'refresh') { closeData(); adoptExternal(); return; }
      if (dataMode === 'import' && !pendingImport) return;
      const imported = dataMode === 'import'; repository.replace(imported ? pendingImport : C.emptyState());
      clearTransient(); $('storage-error').hidden = true; startupError = ''; today = C.dateKey(new Date()); week = C.monday(today); closeData();
      maintenance(true); render(); toast(imported ? 'Резервная копия восстановлена' : 'Создан пустой планировщик'); autoTransfer();
    } catch (error) { $('data-error').textContent = errorMessage(error); $('data-error').hidden = false; }
  });
  $('close-data').addEventListener('click',closeData); $('cancel-data').addEventListener('click',closeData);
  $('data-dialog').addEventListener('cancel',event => { event.preventDefault(); closeData(); });
  $('cleanup-date').addEventListener('change',previewCleanup);
  for (const id of ['export-data','reminder-export','import-backup','cleanup-backup']) $(id).addEventListener('click',exportData);
  for (const id of ['download-raw','reset-backup']) $(id).addEventListener('click',exportRaw);
  for (const id of ['import-data','recovery-import']) $(id).addEventListener('click',chooseImport);
  $('reset-data').addEventListener('click',() => openData('reset'));
  $('storage-data').addEventListener('click',() => openData('cleanup'));
  $('reminder-later').addEventListener('click',() => { transact(s => { s.meta.backupReminderAfter = new Date(Date.now()+86400000).toISOString(); }); });
  function adoptExternal() {
    try {
      const next = new C.Repository(window.localStorage);
      try { next.load(); } catch(error) { next.readonly = !next.valid || next.readonly; startupError = error.message; }
      document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); editing = null; dataMode = null; pendingImport = null; importReadVersion++;
      repository = next; clearTransient();
      $('storage-error').hidden = !repository.readonly;
      if (repository.readonly) $('storage-error').textContent = `Не удалось открыть сохранение: ${startupError}. Исходные данные не перезаписаны.`;
      maintenance(); render(); autoTransfer();
    } catch(error) { toast(errorMessage(error),null,null,10000,true); }
  }
  $('reload-data').addEventListener('click',() => { if (!hasDialog()) adoptExternal(); });
  window.addEventListener('storage',event => {
    if (event.key !== C.KEY && event.key !== null) return;
    if (!hasDialog()) { adoptExternal(); return; }
    externalPending = true; $('external-change').hidden = false;
    const dialog = document.querySelector('dialog[open]');
    const field = {editor:'form-error','delete-dialog':'delete-error','transfer-dialog':'transfer-error','data-dialog':'data-error'}[dialog.id];
    $(field).replaceChildren(el('span','','Данные изменились в другой вкладке. Ваш ввод сохранён в форме, но запись устаревших данных заблокирована. '),button('Обновить без сохранения формы',adoptExternal)); $(field).hidden = false;
    if (dataMode) $('confirm-data').disabled = true; updateDataNotices();
  });
  function closeDelete() { $('delete-dialog').close(); deleteId = null; if (modalOpener?.isConnected) modalOpener.focus(); else $('add-task').focus(); afterDialog(); }
  $('close-delete').addEventListener('click', closeDelete); $('cancel-delete').addEventListener('click', closeDelete);
  $('delete-dialog').addEventListener('cancel', event => { event.preventDefault(); closeDelete(); });
  $('delete-one').addEventListener('click', () => deleteSingle(deleteId));
  $('delete-future').addEventListener('click', () => {
    const task = state().tasks.find(t => t.id === deleteId); if (!task) return;
    if (locked(task.seriesId)) { $('delete-error').textContent = 'Сначала отмените удаление или дождитесь окончания срока отмены.'; $('delete-error').hidden = false; return; }
    $('delete-choices').hidden = true; $('delete-confirm').hidden = false;
    $('delete-warning').textContent = `Удалить выбранное и будущие повторения (${C.futureTasks(state(), task).length}), включая готовые и перенесённые? Граница — ${fullDate(task.scheduledDate)}. Прошлые повторения сохранятся.`;
    $('confirm-delete-future').focus();
  });
  $('confirm-delete-future').addEventListener('click', () => {
    const task = state().tasks.find(t => t.id === deleteId); if (!task) return;
    let record;
    if (!transact(s => { if (locked(task.seriesId)) throw Error('Сначала отмените удаление или дождитесь окончания срока отмены.'); record = C.deleteFuture(s, deleteId, now()); })) return;
    closeDelete(); render(); addUndo('Повторения удалены', s => C.restoreFuture(s, record), task.seriesId);
  });
  function resetTransfer() {
    transferWeek = C.monday(today); transferPage = 0; transferRows = C.candidates(state(), transferWeek); transferSelected = new Set(transferRows.map(t => t.id));
  }
  function renderTransfer() {
    $('transfer-destination').textContent = `Выбранные задачи будут перенесены на понедельник, ${fullDate(transferWeek)}. Остальные останутся на прежних датах.`;
    $('transfer-selected').textContent = `Выбрано ${transferSelected.size} из ${transferRows.length}`;
    $('confirm-transfer').textContent = transferSelected.size ? 'Подтвердить' : 'Оставить на прежних датах';
    $('transfer-list').replaceChildren();
    for (const task of transferRows.slice(transferPage * 50, transferPage * 50 + 50)) {
      const row = el('label', 'transfer-row'), box = el('input'); box.type = 'checkbox'; box.checked = transferSelected.has(task.id); box.dataset.id = task.id;
      box.setAttribute('aria-label', `Перенести: ${task.title}, ${fullDate(task.date)}`);
      box.addEventListener('change', () => { if (box.checked) transferSelected.add(task.id); else transferSelected.delete(task.id); $('transfer-selected').textContent = `Выбрано ${transferSelected.size} из ${transferRows.length}`; $('confirm-transfer').textContent = transferSelected.size ? 'Подтвердить' : 'Оставить на прежних датах'; });
      const text = el('div'); text.append(el('strong','',task.title),el('small','',`${fullDate(task.date)} · ${C.categories[task.category]} · ${C.statuses[task.status]}`));
      if (task.seriesId) text.append(el('small','','Повторение за ' + fullDate(task.scheduledDate)));
      row.append(box,text); $('transfer-list').append(row);
    }
    if (!transferRows.length) $('transfer-list').append(el('p','help-text','Незавершённых задач прошлых недель нет.'));
    $('transfer-prev').disabled = transferPage === 0; $('transfer-next').disabled = (transferPage + 1) * 50 >= transferRows.length;
    $('transfer-page').textContent = transferRows.length ? `${transferPage * 50 + 1}–${Math.min(transferRows.length, (transferPage + 1) * 50)} из ${transferRows.length}` : '0 задач';
  }
  function openTransfer() {
    if (hasDialog() || repository.readonly || generationBlocked) return;
    resetTransfer();
    if (!transferRows.length) { toast('Незавершённых задач прошлых недель нет'); return; }
    modalOpener = document.activeElement; $('transfer-warning').hidden = true; $('transfer-error').hidden = true; renderTransfer(); $('transfer-dialog').showModal();
    // Отмечаем автопоказ только после фактического открытия диалога.
    if (state().meta.lastAutoTransferPromptWeek !== transferWeek && !transact(s => { s.meta.lastAutoTransferPromptWeek = transferWeek; })) {
      $('transfer-dialog').close(); generationBlocked = true; $('generation-message').textContent = 'Не удалось сохранить факт показа переноса. Повторите после устранения ошибки сохранения.'; $('generation-error').hidden = false; render(); return;
    }
    $('later-transfer').focus();
  }
  function closeTransfer() { $('transfer-dialog').close(); if (modalOpener?.isConnected) modalOpener.focus(); else $('unfinished').focus(); afterDialog(); }
  $('unfinished').addEventListener('click', () => { today = C.dateKey(new Date()); if (maintenance()) openTransfer(); });
  $('close-transfer').addEventListener('click', closeTransfer); $('later-transfer').addEventListener('click', closeTransfer);
  $('transfer-dialog').addEventListener('cancel', event => { event.preventDefault(); closeTransfer(); });
  $('select-all-transfer').addEventListener('click', () => { transferSelected = new Set(transferRows.map(t => t.id)); renderTransfer(); });
  $('select-none-transfer').addEventListener('click', () => { transferSelected.clear(); renderTransfer(); });
  $('transfer-prev').addEventListener('click', () => { transferPage--; renderTransfer(); $('transfer-next').focus(); });
  $('transfer-next').addEventListener('click', () => { transferPage++; renderTransfer(); $('transfer-prev').focus(); });
  $('confirm-transfer').addEventListener('click', () => {
    if (!$('transfer-dialog').open) return;
    today = C.dateKey(new Date());
    if (C.monday(today) !== transferWeek) {
      if (!maintenance()) { $('transfer-error').textContent = 'Не удалось обновить повторения. Закройте окно и нажмите «Повторить».'; $('transfer-error').hidden = false; return; }
      resetTransfer(); renderTransfer(); $('transfer-warning').textContent = 'Неделя изменилась. Проверьте новую дату и список, затем подтвердите ещё раз.'; $('transfer-warning').hidden = false; return;
    }
    if (generationBlocked) { $('transfer-error').textContent = 'Сначала восстановите создание повторений кнопкой «Повторить».'; $('transfer-error').hidden = false; return; }
    const count = transferSelected.size;
    if (transact(s => { C.rollover(s, [...transferSelected], transferWeek, now()); s.meta.lastAutoTransferPromptWeek = transferWeek; })) { closeTransfer(); render(); toast(count ? `Перенесено задач: ${count}` : 'Задачи оставлены на прежних датах'); }
  });
  $('retry-generation').addEventListener('click', () => { if (maintenance(true)) autoTransfer(); });
  $('add-task').addEventListener('click', () => openEditor());
  function navigate(offset) { week = C.addDays(week, offset); pages = {}; maintenance(); render(); autoTransfer(); }
  $('previous-week').addEventListener('click', () => navigate(-7));
  $('next-week').addEventListener('click', () => navigate(7));
  $('today').addEventListener('click', () => { today = C.dateKey(new Date()); week = C.monday(today); pages = {}; maintenance(); render(); autoTransfer(); });
  $('filters').addEventListener('click', event => { const b = event.target.closest('[data-filter]'); if (b && b.dataset.filter !== filter() && transact(s => { s.settings.categoryFilter = b.dataset.filter; })) { pages = {}; render(); } });
  $('sort-tasks').addEventListener('click', () => { if (transact(s => C.sortWeek(s, week))) { render(); announce('Задачи недели упорядочены по приоритету.'); } });
  document.addEventListener('click', event => { document.querySelectorAll('.card-menu[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; }); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !hasDialog()) { document.querySelectorAll('.card-menu[open]').forEach(menu => { menu.open = false; menu.querySelector('summary').focus(); }); clearDrag(); } });
  function refreshDate() { today = C.dateKey(new Date()); maintenance(); render(); autoTransfer(); }
  window.addEventListener('focus', refreshDate); document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDate(); }); setInterval(refreshDate, 60000);
  window.addEventListener('beforeunload', event => { if ($('editor').open && JSON.stringify(readForm()) !== baseline) { event.preventDefault(); event.returnValue = ''; } });
  render();
  if (startupError) { $('storage-error').textContent = `Не удалось открыть сохранение: ${startupError} Исходные данные не перезаписаны.`; $('storage-error').hidden = false; }
  else { maintenance(); autoTransfer(); }
})();
