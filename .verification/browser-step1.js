async (hostPage) => {
  const browser = hostPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, timezoneId: 'Europe/Moscow', locale: 'ru-RU' });
  const page = await context.newPage(), results = [], errors = [], remote = [];
  const url = 'file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html';
  page.on('pageerror', e => errors.push(e.message)); page.on('request', req => { if (/^https?:/.test(req.url())) remote.push(req.url()); });
  const check = (condition, name) => { if (!condition) throw Error(name); results.push(name); };
  const data = () => page.evaluate(() => JSON.parse(localStorage.getItem('my-week-planner.v1')));
  const create = async (title, options = {}) => {
    await page.locator('#add-task').click(); await page.locator('#task-title').fill(title);
    for (const key of ['category', 'priority', 'status']) if (options[key]) await page.locator(`#task-${key}`).selectOption(options[key]);
    for (const key of ['date', 'context']) if (options[key]) await page.locator(`#task-${key}`).fill(options[key]);
    await page.locator('#save-task').click();
  };
  try {
    await page.clock.install({ time: new Date('2026-10-19T09:00:00.000Z') });
    await page.goto(url);
    check(await page.locator('.day').count() === 7, 'UC-01: семь пустых дней');
    check(await page.locator('#progress-label').innerText() === 'Пока нет задач', 'пустой прогресс');
    await page.getByRole('button', { name: 'Добавить задачу: Среда', exact: true }).click();
    check(await page.locator('#task-date').inputValue() === '2026-10-21', 'UC-02: дата из колонки');
    check(await page.locator('#task-category').inputValue() === 'work' && await page.locator('#task-priority').inputValue() === 'medium', 'начальные значения');
    await page.locator('#task-title').fill('   '); await page.locator('#save-task').click();
    check(await page.locator('#title-error').isVisible(), 'UC-03: пустое название');
    await page.locator('#task-title').fill('a'.repeat(151)); await page.locator('#save-task').click();
    check(await page.locator('#title-error').isVisible(), 'название длиннее лимита');
    await page.locator('#task-title').fill('Подготовить предложение'); await page.locator('#task-context').fill('a'.repeat(1001)); await page.locator('#save-task').click();
    check(await page.locator('#context-error').isVisible(), 'контекст длиннее лимита');
    await page.locator('#task-context').fill('Собрать идеи и согласовать детали'); await page.locator('#save-task').click();
    check((await data()).tasks.length === 1 && !await page.locator('#editor').isVisible(), 'создание и закрытие формы');
    await page.locator('.task-title').click(); await page.locator('#task-title').fill('Несохранённая правка'); await page.locator('#cancel-editor').click();
    check(await page.locator('#discard-prompt').isVisible(), 'UC-05: подтверждение отмены');
    await page.locator('#keep-editing').click(); check(await page.locator('#task-title').inputValue() === 'Несохранённая правка', 'сохранение ввода при продолжении');
    await page.keyboard.press('Escape'); await page.locator('#discard-changes').click();
    check((await data()).tasks[0].title === 'Подготовить предложение', 'отмена не меняет сохранение');
    await page.locator('.task-title').click(); await page.locator('#task-category').selectOption('personal'); await page.locator('#task-priority').selectOption('high'); await page.locator('#save-task').click();
    check((await data()).tasks[0].category === 'personal' && (await data()).tasks[0].priority === 'high', 'UC-04: редактирование категории и приоритета');
    await page.locator('.status-select').selectOption('in_progress'); await page.locator('.done-toggle').check();
    check(await page.locator('#progress-percent').innerText() === '100%', 'UC-06: завершение и прогресс');
    await page.locator('.task-title').click(); await page.locator('#task-context').fill('Обновлённые детали'); await page.locator('#save-task').click(); await page.locator('.done-toggle').uncheck();
    check((await data()).tasks[0].status === 'in_progress', 'возврат статуса после редактирования готовой задачи');
    await page.locator('.status-select').selectOption('deferred'); check((await data()).tasks[0].date === '2026-10-21' && await page.locator('#progress-percent').innerText() === '0%', 'UC-07: отложено без изменения даты');
    await page.locator('[data-filter="work"]').click(); check(await page.locator('.card').count() === 0 && await page.locator('#progress-label').innerText() === 'Пока нет задач', 'UC-11: фильтр и прогресс');
    await page.locator('[data-filter="personal"]').click(); await page.locator('#add-task').click();
    check(await page.locator('#task-category').inputValue() === 'work', 'категория по умолчанию не наследует фильтр');
    await page.locator('#task-title').fill('Рабочая задача'); await page.locator('#save-task').click();
    check(await page.getByRole('button', { name: 'Показать', exact: true }).isVisible(), 'уведомление о скрытой фильтром задаче');
    await page.getByRole('button', { name: 'Показать', exact: true }).click(); check(await page.locator('.card').count() === 2 && (await data()).settings.categoryFilter === 'all', 'Показать сбрасывает фильтр');
    const work = page.locator('.card').filter({ has: page.getByRole('button', { name: 'Рабочая задача', exact: true }) });
    await work.locator('summary').click(); await work.getByRole('button', { name: 'Копировать', exact: true }).click();
    check(await page.locator('#task-title').inputValue() === 'Рабочая задача' && await page.locator('#task-status').inputValue() === 'todo', 'UC-13: форма копии');
    await page.locator('#task-title').fill('Копия рабочей'); await page.locator('#save-task').click();
    check((await data()).tasks.length === 3 && new Set((await data()).tasks.map(t => t.id)).size === 3, 'копия с новым ID');
    const copy = page.locator('.card').filter({ has: page.getByRole('button', { name: 'Копия рабочей', exact: true }) });
    await copy.locator('summary').click(); await copy.getByRole('button', { name: 'Выше', exact: true }).click();
    check((await data()).tasks.find(t => t.title === 'Копия рабочей').order === 0, 'UC-09: порядок кнопкой');
    await page.getByRole('button', { name: 'Копия рабочей', exact: true }).click(); await page.locator('#task-date').fill('2026-10-26'); await page.locator('#save-task').click();
    check(await page.getByRole('button', { name: 'Показать', exact: true }).isVisible(), 'UC-10: перенос в другую неделю');
    await page.getByRole('button', { name: 'Показать', exact: true }).click();
    check((await page.locator('#current-week').innerText()).includes('19 октября') && (await page.locator('#view-week').innerText()).includes('26 октября'), 'UC-35: текущая и просматриваемая недели');
    await page.locator('#today').click();
    // Настоящий drag-and-drop мышью между днями.
    const handle = page.locator('.card').filter({ has: page.getByRole('button', { name: 'Рабочая задача', exact: true }) }).locator('.drag-handle');
    await handle.dragTo(page.locator('.day[data-date="2026-10-23"] .day-header'));
    check((await data()).tasks.find(t => t.title === 'Рабочая задача').date === '2026-10-23', 'UC-08: реальное перетаскивание между днями');
    check((await data()).tasks.find(t => t.title === 'Рабочая задача').moveHistory.length === 1, 'история переноса');
    await create('Важное', { date: '2026-10-23', priority: 'high' }); await page.locator('#sort-tasks').click();
    check((await data()).tasks.find(t => t.title === 'Важное').order === 0, 'UC-12: сортировка по приоритету');
    // Два удаления, новая правка, затем две независимые отмены.
    for (const title of ['Важное', 'Рабочая задача']) {
      const item = page.locator('.card').filter({ has: page.getByRole('button', { name: title, exact: true }) }); await item.locator('summary').click(); await item.getByRole('button', { name: 'Удалить', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Подготовить предложение', exact: true }).click(); await page.locator('#task-context').fill('Не откатывать эту правку'); await page.locator('#save-task').click();
    await page.locator('.toast').getByRole('button', { name: 'Отменить', exact: true }).first().click(); await page.locator('.toast').getByRole('button', { name: 'Отменить', exact: true }).first().click();
    check((await data()).tasks.length === 4 && (await data()).tasks.find(t => t.title === 'Подготовить предложение').context === 'Не откатывать эту правку', 'UC-14: независимые отмены не откатывают другие правки');
    const item = page.locator('.card').filter({ has: page.getByRole('button', { name: 'Важное', exact: true }) }); await item.locator('summary').click(); await item.getByRole('button', { name: 'Удалить', exact: true }).click();
    await page.clock.fastForward(10001); check(await page.locator('.toast').getByRole('button', { name: 'Отменить', exact: true }).count() === 0, 'UC-15: отмена истекает');
    const beforeReload = await data(); await page.reload(); check(JSON.stringify(await data()) === JSON.stringify(beforeReload), 'UC-34: сохранение после перезагрузки');
    check((await page.locator('#view-week').innerText()).startsWith('Текущая неделя'), 'новое открытие текущей недели');
    await create('<img src=x onerror="window.injected=1">', { context: '<script>alert(1)</script>' });
    check(await page.locator('.card img,.card script').count() === 0 && await page.evaluate(() => window.injected === undefined), 'пользовательский HTML отображается только текстом');
    await page.locator('#add-task').click(); await page.locator('#task-title').fill('Не сохранять при ошибке');
    const originalData = await data();
    await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('test', 'QuotaExceededError'); }; });
    await page.locator('#save-task').click(); check(await page.locator('#editor').isVisible() && await page.locator('#form-error').isVisible(), 'ошибка записи оставляет форму и ошибку');
    check(JSON.stringify(await data()) === JSON.stringify(originalData), 'ошибка записи не меняет данные');
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await page.locator('#cancel-editor').click(); await page.locator('#discard-changes').click();
    await page.locator('#add-task').click(); await page.locator('#task-title').fill('Двойное сохранение');
    await page.locator('#task-form').evaluate(form => { form.dispatchEvent(new Event('submit', { cancelable: true })); form.dispatchEvent(new Event('submit', { cancelable: true })); });
    check((await data()).tasks.filter(t => t.title === 'Двойное сохранение').length === 1, 'повторная отправка формы не создаёт дубль');
    check(errors.length === 0, 'нет ошибок JavaScript'); check(remote.length === 0, 'нет сетевых запросов');
    await page.screenshot({ path: 'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step1-functional.png', fullPage: true });
    return { browser: browser.version(), passed: results.length, results, errors, remote };
  } catch (error) {
    await page.screenshot({ path: 'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step1-failure.png', fullPage: true });
    return { passed: results.length, results, failure: error.message, errors, screenshot: '.verification/step1-failure.png' };
  } finally { await context.close(); }
}
