async (hostPage) => {
  const browser = await hostPage.context().browser().browserType().launch({channel: 'msedge', headless: true}), results = [], timings = [], errors = [];
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, timezoneId: 'Europe/Moscow', locale: 'ru-RU' });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const url = 'file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html';
  const key = 'my-week-planner.v1', time = '2026-10-19T09:00:00.000Z';
  const check = (ok, name) => { if (!ok) throw Error(name); results.push(name); };
  const fixture = count => ({ schemaVersion: 1, revision: 1, series: [], excludedOccurrences: [], settings: { categoryFilter: 'all' }, meta: { lastAutoTransferPromptWeek: null, backupReminderAfter: null }, tasks: Array.from({ length: count }, (_, i) => ({ id: `id-${i}`, title: `Задача ${i + 1}`, context: '', date: '2026-10-19', originalDate: '2026-10-19', category: 'work', priority: 'medium', status: i % 2 ? 'done' : 'todo', previousStatus: 'todo', completedAt: i % 2 ? time : null, order: i, seriesId: null, scheduledDate: null, createdAt: time, updatedAt: time, moveHistory: [] })) });
  const seed = async value => { await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value }); await page.reload(); };
  try {
    await page.clock.install({ time: new Date(time) }); await page.goto(url); await seed(fixture(120));
    check(await page.locator('.card').count() === 50 && await page.locator('#progress-label').innerText() === 'Готово 60 из 120', 'UC-36: 50 карточек, прогресс по 120');
    await page.getByRole('button', { name: 'Следующая страница: Понедельник' }).click(); await page.getByRole('button', { name: 'Следующая страница: Понедельник' }).click();
    check(await page.locator('.card').count() === 20 && (await page.locator('.pager').innerText()).includes('101–120'), 'третья страница содержит 20 карточек');
    await page.getByRole('button', { name: 'Предыдущая страница: Понедельник' }).click();
    let card = page.locator('.card').filter({ has: page.getByRole('button', { name: 'Задача 51', exact: true }) }); await card.locator('summary').click(); await card.getByRole('button', { name: 'Выше', exact: true }).click();
    check(await page.getByRole('button', { name: 'Задача 51', exact: true }).isVisible(), 'UC-37: перемещение на предыдущую страницу');
    check(await page.evaluate(() => document.activeElement.textContent === 'Задача 51'), 'фокус следует за перемещённой задачей');
    await page.clock.runFor(50); check((await page.locator('#announcer').innerText()).includes('позиция 50 из 120'), 'aria-live содержит позицию полного списка');
    await page.locator('#next-week').click(); await page.locator('#add-task').click(); check(await page.locator('#task-date').inputValue() === '2026-10-26', 'общая кнопка в будущей неделе выбирает понедельник'); await page.locator('#cancel-editor').click();
    await page.locator('#previous-week').click(); check((await page.locator('.pager').innerText()).includes('1–50'), 'навигация сбрасывает страницу');
    await page.locator('#add-task').click();
    check(await page.evaluate(() => document.activeElement.id === 'task-title'), 'фокус в названии при открытии формы');
    let allInside = true;
    for (let i = 0; i < 16; i++) { await page.keyboard.press('Tab'); allInside &&= await page.evaluate(() => document.querySelector('#editor').contains(document.activeElement)); }
    check(allInside, 'Tab удерживается внутри диалога');
    await page.mouse.click(10, 10); check(await page.locator('#editor').isVisible(), 'щелчок по фону не закрывает форму');
    await page.keyboard.press('Escape'); check(!await page.locator('#editor').isVisible(), 'Escape закрывает неизменённую форму');
    check(await page.evaluate(() => document.activeElement.id === 'add-task'), 'фокус вернулся к кнопке открытия');
    // Сортировка скрытой категории и перетаскивание при фильтре.
    const mixed = fixture(4); mixed.tasks[1].category = 'personal'; mixed.tasks[1].priority = 'high'; mixed.tasks[3].category = 'personal'; mixed.tasks[0].priority = 'low';
    await seed(mixed); await page.locator('[data-filter="work"]').click();
    await page.locator('.card[data-id="id-2"] .drag-handle').dragTo(page.locator('.card[data-id="id-0"] .task-title'));
    let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    check(saved.tasks.filter(t => t.category === 'personal').sort((a,b) => a.order-b.order).map(t => t.id).join(',') === 'id-1,id-3', 'перетаскивание при фильтре сохраняет скрытые карточки');
    await page.locator('#sort-tasks').click(); saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    check(saved.tasks.find(t => t.id === 'id-1').order === 0, 'сортировка включает скрытую категорию');
    const beforeInvalid = JSON.stringify(saved); await page.locator('.card[data-id="id-0"] .drag-handle').dragTo(page.locator('.brand'));
    check(await page.evaluate(key => localStorage.getItem(key), key) === beforeInvalid, 'сброс вне доски ничего не меняет');
    await page.reload(); check(await page.locator('[data-filter="work"]').getAttribute('aria-pressed') === 'true', 'фильтр восстановлен после перезагрузки');
    await page.locator('#next-week').click(); await page.clock.setSystemTime(new Date('2026-10-26T09:00:00.000Z')); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    check((await page.locator('#view-week').innerText()).startsWith('Текущая неделя: 26 октября'), 'новая локальная дата обновляет текущую неделю');
    await page.clock.setSystemTime(new Date(time)); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    check((await page.locator('#view-week').innerText()).includes('26 октября') && (await page.locator('#current-week').innerText()).includes('19 октября'), 'обновление даты не переключает просматриваемую неделю');
    // Полный день остаётся постраничным даже при 2 000 задачах.
    await seed(fixture(2000));
    const start = Date.now(); await page.locator('#sort-tasks').click(); const elapsed = Date.now() - start; timings.push({ operation: 'click sort, 2000 tasks, including automation', ms: elapsed });
    check(await page.locator('.card').count() === 50 && await page.locator('#progress-percent').innerText() === '50%', '2000 задач: DOM ограничен, прогресс полный');
    // Дизайн: реалистичные примеры только в изолированном профиле.
    const sample = fixture(10), names = ['Подготовить предложение', 'Записаться к врачу', 'Собрать обратную связь', 'Разобрать рабочую почту', 'Прогулка после работы', 'Обновить план проекта', 'Выбрать подарок', 'Отправить документы', 'Встреча с друзьями', 'Спокойное утро'];
    sample.tasks.forEach((t,i) => { t.title = names[i]; t.date = `2026-10-${19 + i % 7}`; t.originalDate = t.date; t.order = Math.floor(i / 7); t.category = [1,4,6,8,9].includes(i) ? 'personal' : 'work'; t.priority = i === 0 || i === 7 ? 'high' : i === 9 ? 'low' : 'medium'; t.status = i === 3 ? 'done' : i === 0 ? 'in_progress' : 'todo'; t.completedAt = t.status === 'done' ? time : null; t.context = i === 0 ? 'Собрать идеи и согласовать детали с командой' : i === 2 ? 'Записать основные выводы по итогам недели' : ''; });
    await seed(sample); await page.locator('#today').click();
    for (const width of [1366,1920,1024]) {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 768 }); await page.screenshot({ path: `C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step1-${width}.png`, fullPage: true });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `нет горизонтального переполнения страницы при ${width}`);
    }
    await page.setViewportSize({ width: 1366, height: 768 }); await page.locator('#add-task').click(); await page.screenshot({ path: 'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step1-editor.png' }); await page.locator('#cancel-editor').click();
    await seed(fixture(120)); await page.evaluate(() => window.scrollTo(0,700));
    check(Math.abs((await page.locator('.weekbar').boundingBox()).y) < 1, 'текущая неделя закреплена при прокрутке');
    // Неверное сохранение не перезаписывается.
    await page.evaluate(key => localStorage.setItem(key, '{broken'), key); await page.reload();
    check(await page.locator('#storage-error').isVisible() && await page.locator('#add-task').isDisabled(), 'повреждённое сохранение блокирует запись');
    check(await page.evaluate(key => localStorage.getItem(key), key) === '{broken', 'исходное повреждённое сохранение сохранено');
    await page.evaluate(key => localStorage.removeItem(key), key);
    await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('test', 'SecurityError'); }; }); await page.reload();
    check(await page.locator('#storage-error').isVisible() && await page.locator('#add-task').isDisabled(), 'запрет localStorage обработан');
    check(errors.length === 0, 'нет ошибок JavaScript');
    return { passed: results.length, results, timings, errors };
  } catch (error) {
    await page.screenshot({ path: 'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step1-edge-failure.png', fullPage: true });
    return { passed: results.length, results, failure: error.message, errors };
  } finally { await context.close(); await browser.close(); }
}
