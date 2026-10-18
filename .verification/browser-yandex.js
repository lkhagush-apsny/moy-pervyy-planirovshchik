async(hostPage)=>{const browser=await hostPage.context().browser().browserType().launch({executablePath:"C:/Program Files/Yandex/YandexBrowser/Application/browser.exe",headless:true});const context=await browser.newContext();const page=await context.newPage();const results=[];try{results.push({suite:"browser-audit-fixes.js",result:await (async(hostPage)=>{
 const c=await hostPage.context().browser().newContext({timezoneId:'Europe/Moscow'}),p=await c.newPage(),passed=[],errors=[];
 const check=(v,n)=>{if(!v)throw Error(n);passed.push(n);};p.on('pageerror',e=>errors.push(e.message));
 try{
 await p.clock.install({time:new Date('2026-10-19T09:00:00Z')});await p.goto('file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html');
 await p.locator('#add-task').click();await p.locator('#task-title').fill('Audit');await p.locator('#task-date').fill('2026-10-21');await p.locator('#repeat-enabled').check();
 check(await p.locator('.weekdays input:checked').inputValue()==='3','повторение выбирает день изменённой даты');
 await p.locator('.weekdays input:checked').uncheck();await p.locator('.weekdays input[value="5"]').check();await p.locator('#repeat-enabled').uncheck();await p.locator('#repeat-enabled').check();check(await p.locator('.weekdays input:checked').inputValue()==='5','повторное включение сохраняет явный выбор');
 await p.locator('.weekdays input:checked').uncheck();await p.locator('#save-task').click();check(await p.locator('#weekdays-error').isVisible()&&await p.evaluate(()=>document.activeElement.closest('fieldset')?.id)==='weekdays','ошибка дней возле поля и фокус на группе');
 await p.locator('.weekdays input[value="3"]').check();await p.locator('#repeat-end').fill('2026-10-20');await p.locator('#save-task').click();check(await p.locator('#repeat-end-error').isVisible()&&await p.evaluate(()=>document.activeElement.id)==='repeat-end','ошибка окончания возле поля и фокус');
 await p.locator('#cancel-editor').click();await p.locator('#discard-changes').click();await p.locator('#add-task').click();await p.locator('#task-title').fill('Audit');await p.locator('#task-context').fill('Полный контекст '.repeat(50));await p.locator('#save-task').click();
 await p.locator('.card summary').click();await p.clock.fastForward(60001);check(await p.locator('.card-menu').getAttribute('open')!==null&&await p.evaluate(()=>document.activeElement.tagName)==='SUMMARY','таймер сохраняет меню и фокус');
 await p.locator('.card summary').click();await p.locator('.task-title').click();await p.locator('#cancel-editor').click();await p.clock.fastForward(100);check(await p.evaluate(()=>document.activeElement.className)==='task-title','после закрытия редактора фокус остаётся на карточке');
 await p.evaluate(()=>window.dispatchEvent(new Event('focus')));check(await p.evaluate(()=>document.activeElement.className)==='task-title','возврат во вкладку не сбрасывает фокус');
 const normalized=await p.evaluate(()=>{const C=PlannerCore,s=JSON.parse(localStorage.getItem(C.KEY));s.tasks[0].title='  Task  ';s.tasks[0].context='  line1\nline2  ';C.addSeries(s,{title:'Series',context:'context',category:'work',priority:'medium',startDate:'2027-01-01',endDate:null,weekdays:[1]},'audit-series',new Date().toISOString());s.series[0].title='  Series  ';s.series[0].context='  context  ';const raw=JSON.stringify({format:'my-week-planner',exportedAt:new Date().toISOString(),data:s});const imported=C.importBackup(raw,'copy.json',raw.length);const loaded=C.decode(JSON.stringify(s));localStorage.setItem(C.KEY,JSON.stringify(s));return [imported,loaded].every(x=>x.tasks[0].title==='Task'&&x.tasks[0].context==='line1\nline2'&&x.series[0].title==='Series'&&x.series[0].context==='context');});check(normalized,'импорт и загрузка нормализуют задачи и серии, сохраняя переносы строк');
 await p.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Audit denial','SecurityError');};});await p.reload();const before=await p.evaluate(()=>localStorage.getItem('my-week-planner.v1'));await p.locator('.task-title').click();check(await p.locator('#editor-title').innerText()==='Просмотр задачи'&&await p.locator('#task-context').inputValue()==='line1\nline2','полный просмотр при запрете записи');check(await p.locator('#save-task').isHidden()&&await p.locator('#task-title').isDisabled(),'просмотр не разрешает изменения');await p.locator('#cancel-editor').click();check(await p.evaluate(()=>localStorage.getItem('my-week-planner.v1'))===before,'просмотр не изменяет сохранение');
 check(!errors.length,'нет ошибок JS');return{passed:passed.length,checks:passed};
 }catch(e){return{passed:passed.length,checks:passed,failure:e.message,errors};}finally{await c.close();}
}
)(page)});
results.push({suite:"browser-step1.js",result:await (async (hostPage) => {
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
)(page)});
results.push({suite:"browser-step2.js",result:await (async (hostPage) => {
  const context = await hostPage.context().browser().newContext({viewport:{width:1366,height:768},timezoneId:'Europe/Moscow',locale:'ru-RU'});
  const page=await context.newPage(), results=[], errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html';
  const check=(ok,name)=>{if(!ok)throw Error(name);results.push(name);};
  const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('my-week-planner.v1')));
  const card=id=>page.locator(`.card[data-id="${id}"]`);
  const setDays=async values=>{for(let n=1;n<=7;n++)await page.locator(`.weekdays input[value="${n}"]`).setChecked(values.includes(n));};
  const deleteCard=async id=>{await card(id).locator('summary').click();await card(id).getByRole('button',{name:'Удалить',exact:true}).click();};
  try {
    await page.clock.install({time:new Date('2026-10-19T09:00:00.000Z')});await page.goto(url);
    await page.locator('#add-task').click();await page.locator('#task-title').fill('Планёрка');await page.locator('#repeat-enabled').check();
    check(await page.locator('#task-status').isDisabled()&&await page.locator('#task-status').inputValue()==='todo','новая серия начинается с Не начато');
    await setDays([]);await page.locator('#save-task').click();check(await page.locator('#weekdays-error').isVisible(),'пустой набор дней отклонён');
    await setDays([1,4]);await page.locator('#repeat-end').fill('2026-10-18');await page.locator('#save-task').click();check(await page.locator('#repeat-end-error').isVisible(),'окончание раньше начала отклонено');
    await page.locator('#repeat-end').fill('2026-10-29');await page.locator('#save-task').click();
    check((await data()).series.length===1&&(await data()).tasks.length===2,'UC-16: серия по понедельникам и четвергам');
    check(await page.locator('.repeat-icon').count()===2,'значки повторений на карточках');
    const before=JSON.stringify(await data());await page.reload();check(JSON.stringify(await data())===before,'UC-17: перезагрузка не создаёт дублей и лишних записей');
    await page.locator('#next-week').click();check((await data()).tasks.length===4,'просмотр будущей недели создаёт следующие экземпляры');await page.locator('#today').click();
    let task=(await data()).tasks.find(t=>t.scheduledDate==='2026-10-19');await card(task.id).locator('.task-title').click();
    check(await page.locator('#repeat-enabled').isDisabled(),'расписание одного экземпляра заблокировано');
    await page.locator('#task-title').fill('Особая планёрка');await page.locator('#task-status').selectOption('deferred');await page.locator('#task-date').fill('2026-10-20');await page.locator('#save-task').click();
    let s=await data();check(s.series[0].title==='Планёрка'&&s.tasks.find(t=>t.id===task.id).title==='Особая планёрка','UC-19: изменён только один экземпляр');
    check(s.tasks.find(t=>t.id===task.id).scheduledDate==='2026-10-19'&&await card(task.id).getByText('Повторение за 19.10.2026').isVisible(),'UC-23: плановая дата сохранена и показана');
    await card(task.id).locator('.drag-handle').dragTo(page.locator('.day[data-date="2026-10-22"] .day-header'));
    check(await page.locator('.day[data-date="2026-10-22"] .card').count()===2,'перенесённое и новое повторения сосуществуют');
    const second=(await data()).tasks.find(t=>t.scheduledDate==='2026-10-22');await deleteCard(second.id);await page.locator('#delete-one').click();
    check((await data()).excludedOccurrences.length===1,'UC-21: удаление одного добавляет исключение');
    await card(task.id).locator('.task-title').click();await page.locator('#edit-scope').selectOption('future');await page.locator('#save-task').click();
    check((await page.locator('#form-error').innerText()).includes('дождитесь'),'расписание заблокировано на время отмены удаления');
    await page.locator('#cancel-editor').click();if(await page.locator('#discard-prompt').isVisible())await page.locator('#discard-changes').click();
    await page.locator('.toast').getByRole('button',{name:'Отменить',exact:true}).last().click();check((await data()).excludedOccurrences.length===0&&(await data()).tasks.some(t=>t.id===second.id),'отмена восстановила экземпляр и исключение');
    await deleteCard(second.id);await page.locator('#delete-one').click();await page.clock.fastForward(10001);await page.reload();check(!(await data()).tasks.some(t=>t.scheduledDate==='2026-10-22'),'удалённое повторение не восстановилось при перезагрузке');
    await card(task.id).locator('.task-title').click();await page.locator('#edit-scope').selectOption('future');
    check(await page.locator('#task-date').inputValue()==='2026-10-19'&&await page.locator('#task-date').isDisabled(),'граница серии — плановая дата перенесённой задачи');
    await page.locator('#task-title').fill('Новый ритм');await setDays([2]);await page.locator('#save-task').click();
    check(await page.locator('#series-confirm').isVisible(),'UC-20: предупреждение перед заменой серии');
    await page.screenshot({path:'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step2-series.png'});
    const oldRaw=JSON.stringify(await data());await page.locator('#cancel-series-confirm').click();check(JSON.stringify(await data())===oldRaw,'отмена подтверждения ничего не меняет');
    await page.locator('#save-task').click();await page.locator('#apply-series').click();s=await data();
    check(s.series.length===2&&s.series[0].endDate==='2026-10-18','серия разделена по плановой границе');
    check(s.tasks.every(t=>t.title==='Новый ритм'&&t.status==='todo'&&!t.moveHistory.length)&&s.tasks.length===2,'новые экземпляры имеют сброшенные статусы и даты');
    task=s.tasks.find(t=>t.date==='2026-10-20');await card(task.id).locator('.status-select').selectOption('in_progress');await card(task.id).locator('.task-title').click();await page.locator('#edit-scope').selectOption('future');await page.locator('#repeat-enabled').uncheck();await page.locator('#save-task').click();await page.locator('#apply-series').click();
    s=await data();check(s.tasks.length===1&&s.tasks[0].id===task.id&&s.tasks[0].seriesId===null&&s.tasks[0].status==='in_progress'&&s.tasks[0].date==='2026-10-20','отключение повторения сохраняет выбранную задачу');
    await card(task.id).locator('.task-title').click();await page.locator('#repeat-enabled').check();await page.locator('#repeat-end').fill('2026-10-27');await page.locator('#save-task').click();
    check((await page.locator('#series-confirm-text').innerText()).includes('заменена серией'),'превращение обычной задачи требует подтверждения');await page.locator('#apply-series').click();
    check((await data()).tasks.every(t=>t.status==='todo'&&t.seriesId),'обычная задача заменена серией');
    await page.locator('#next-week').click();const future=(await data()).tasks.find(t=>t.date==='2026-10-27');await card(future.id).locator('.done-toggle').check();await page.locator('#today').click();task=(await data()).tasks.find(t=>t.date==='2026-10-20');
    await deleteCard(task.id);await page.locator('#delete-future').click();check((await page.locator('#delete-warning').innerText()).includes('(2)'),'массовое удаление учитывает будущий готовый экземпляр');await page.locator('#confirm-delete-future').click();
    check((await data()).tasks.length===0,'UC-22: удаление выбранного и будущих');await page.locator('.toast').getByRole('button',{name:'Отменить',exact:true}).last().click();
    check((await data()).tasks.length===2&&(await data()).tasks.find(t=>t.id===future.id).status==='done','отмена удаления серии сохраняет её прежние статусы');
    await deleteCard(task.id);await page.locator('#delete-future').click();await page.locator('#confirm-delete-future').click();await page.clock.fastForward(10001);await page.reload();check((await data()).tasks.length===0,'прекращённая серия больше не генерируется');
    // Первый экземпляр за пределами просматриваемого горизонта.
    await page.locator('#add-task').click();await page.locator('#task-title').fill('Будущая серия');await page.locator('#task-date').fill('2026-12-01');await page.locator('#repeat-enabled').check();await setDays([1]);
    check((await page.locator('#repeat-preview').innerText()).includes('07.12.2026'),'первая дата вычисляется по выбранному дню');await page.locator('#save-task').click();
    check((await data()).tasks.length===0&&await page.getByRole('button',{name:'Показать',exact:true}).isVisible(),'серия сохранена до первого экземпляра');await page.getByRole('button',{name:'Показать',exact:true}).click();
    check((await data()).tasks.some(t=>t.date==='2026-12-07')&&await page.locator('.card').count()===1,'Показать открывает и создаёт первую будущую неделю');
    check(errors.length===0,'нет ошибок JavaScript');return{passed:results.length,results,errors};
  } catch(error){await page.screenshot({path:'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step2-series-failure.png',fullPage:true});return{passed:results.length,results,failure:error.message,errors};}
  finally{await context.close();}
}
)(page)});
results.push({suite:"browser-step3.js",result:await (// Подготовлен для запуска после восстановления доступа к браузерным проверкам.
// Требует инструмента Playwright с аргументом page.
async (hostPage) => {
  const context=await hostPage.context().browser().newContext({viewport:{width:1366,height:768},timezoneId:'Europe/Moscow',acceptDownloads:true});
  const page=await context.newPage(),results=[],errors=[];
  const url='file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html';
  const key='my-week-planner.v1',check=(ok,name)=>{if(!ok)throw Error(name);results.push(name);};
  const data=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  async function menu(id){await page.locator('#data-menu>summary').click();await page.locator(id).click();}
  try{
    await page.clock.install({time:new Date('2026-10-19T09:00:00.000Z')});await page.goto(url);
    await page.locator('#add-task').click();await page.locator('#task-title').fill('Рабочая задача');await page.locator('#save-task').click();
    check(await page.locator('#backup-reminder').isVisible(),'первое напоминание при наличии данных');
    await page.locator('#reminder-later').click();check(!await page.locator('#backup-reminder').isVisible(),'отложить напоминание');
    check(Math.abs(Date.parse((await data()).meta.backupReminderAfter)-Date.parse('2026-10-20T09:00:00.000Z'))<10000,'отложено на сутки');
    const downloadPromise=page.waitForEvent('download');await menu('#export-data');const download=await downloadPromise;
    check(/^my-week-backup-2026-10-19-\d{6}\.json$/.test(download.suggestedFilename()),'имя резервной копии');
    const file='C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step3-export.json';await download.saveAs(file);
    const stream=await download.createReadStream();let raw='';for await(const chunk of stream)raw+=chunk.toString('utf8');const backup=JSON.parse(raw);
    check(backup.format==='my-week-planner'&&backup.data.tasks.length===1,'реальный файл скачан и прочитан');
    check(Math.abs(Date.parse((await data()).meta.backupReminderAfter)-Date.parse('2026-10-26T09:00:00.000Z'))<10000,'после скачивания следующий срок через семь суток');
    await page.locator('#add-task').click();await page.locator('#task-title').fill('Личная задача');await page.locator('#task-category').selectOption('personal');await page.locator('#save-task').click();
    await page.locator('#import-file').setInputFiles([]);await page.locator('#import-file').setInputFiles(file);await page.locator('#confirm-data').waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.querySelector('#confirm-data').disabled);await page.locator('#cancel-data').click();check((await data()).tasks.length===2,'отмена импорта сохраняет данные');
    await page.locator('#import-file').setInputFiles([]);await page.locator('#import-file').setInputFiles(file);await page.waitForFunction(()=>!document.querySelector('#confirm-data').disabled);await page.locator('#confirm-data').click();
    check((await data()).tasks.length===1,'подтверждённый импорт полностью заменяет данные');
    // Очистка с реальными задачами, исключениями и откатом ошибок проверяется также моделью.
    await page.locator('.task-title').click();await page.locator('#task-date').fill('2026-01-01');await page.locator('#task-status').selectOption('done');await page.locator('#save-task').click();
    if(await page.locator('#data-menu').getAttribute('open')!==null)await page.locator('#data-menu>summary').click();await menu('#storage-data');
    check(await page.locator('#cleanup-date').inputValue()==='2026-04-19','граница очистки шесть месяцев');
    check((await page.locator('#confirm-data').innerText()).includes('1'),'предварительный подсчёт очистки');await page.locator('#cancel-data').click();check((await data()).tasks.length===1,'отмена очистки');
    await menu('#storage-data');await page.locator('#confirm-data').click();check((await data()).tasks.length===0,'подтверждённая очистка');
    // Другая вкладка в том же изолированном браузерном контексте.
    const other=await context.newPage();await other.goto(url);await other.locator('#add-task').click();await other.locator('#task-title').fill('Из другой вкладки');await other.locator('#save-task').click();
    await page.waitForFunction(()=>document.querySelectorAll('.card').length===1);check(await page.locator('.task-title').innerText()==='Из другой вкладки','изменения вкладки обновили доску');
    await page.locator('.task-title').click();await page.locator('#task-context').fill('Мой несохранённый ввод');
    await other.locator('.task-title').click();await other.locator('#task-title').fill('Новое название');await other.locator('#save-task').click();
    await page.waitForFunction(()=>!document.querySelector('#external-change').hidden);check(await page.locator('#task-context').inputValue()==='Мой несохранённый ввод','конфликт не стирает форму');
    await page.locator('#save-task').click();check((await data()).tasks[0].title==='Новое название','устаревшая запись заблокирована');
    await page.locator('#cancel-editor').click();await page.locator('#discard-changes').click();await page.locator('#reload-data').click();
    check(await page.locator('.task-title').innerText()==='Новое название','явное обновление данных');await other.close();
    // Восстановление повреждённого сохранения требует явного решения.
    await page.evaluate(k=>localStorage.setItem(k,'{broken'),key);await page.reload();check(await page.locator('#recovery-actions').isVisible(),'экран восстановления');
    const rawDownloadPromise=page.waitForEvent('download');await page.locator('#download-raw').click();const rawDownload=await rawDownloadPromise;let original='';for await(const chunk of await rawDownload.createReadStream())original+=chunk.toString('utf8');check(original==='{broken','исходное повреждённое сохранение скачано без изменений');
    await page.locator('#reset-data').click();await page.locator('#cancel-data').click();check(await page.evaluate(k=>localStorage.getItem(k),key)==='{broken','отмена сброса сохраняет исходник');
    await page.locator('#reset-data').click();await page.locator('#confirm-data').click();check((await data()).tasks.length===0&&!await page.locator('#recovery-actions').isVisible(),'явный сброс создал пустой планировщик');
    await page.screenshot({path:'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step3-data.png',fullPage:true});check(errors.length===0,'нет ошибок JS');return{passed:results.length,results,errors};
  }catch(error){return{passed:results.length,results,failure:error.message,errors};}finally{await context.close();}
}
)(page)});
results.push({suite:"browser-edgecases.js",result:await (async (hostPage) => {
  const browser = hostPage.context().browser(), results = [], timings = [], errors = [];
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
  } finally { await context.close(); }
}
)(page)});
results.push({suite:"browser-final.js",result:await (async (hostPage) => {
 const context=await hostPage.context().browser().newContext({viewport:{width:1366,height:768},timezoneId:'Europe/Moscow'}),page=await context.newPage(),results=[],errors=[],timings=[];
 const url='file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html',key='my-week-planner.v1';
 page.on('pageerror',e=>errors.push(e.message)); const check=(v,n)=>{if(!v)throw Error(n);results.push(n);},data=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 const seed=async(n,date,status='todo',seriesCount=0)=>page.evaluate(({n,date,status,seriesCount})=>{const C=PlannerCore,s=C.emptyState(),now=new Date().toISOString();for(let i=0;i<n;i++)C.saveTask(s,{title:'Задача '+i,context:'',date,category:i%2?'personal':'work',priority:'medium',status},null,'t'+i,now);for(let i=0;i<seriesCount;i++)C.addSeries(s,{title:'Серия '+i,context:'',category:'work',priority:'medium',startDate:'2026-10-19',endDate:null,weekdays:[1]},'s'+i,now);localStorage.setItem(C.KEY,JSON.stringify(s));},{n,date,status,seriesCount});
 const fail=async(on)=>page.evaluate(on=>{if(!window.originalSet)window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=on?function(k,v){if(k==='my-week-planner.v1')throw new DOMException('Test quota','QuotaExceededError');return window.originalSet.call(this,k,v);}:window.originalSet;},on);
 try{
 await page.clock.install({time:new Date('2026-10-19T09:00:00Z')});await page.goto(url);await seed(55,'2026-10-12');await page.reload();
 check(await page.locator('#transfer-dialog').isVisible(),'автоперенос прошлой недели');check(await page.locator('#transfer-list input').count()===50,'перенос: страницы по 50');
 await page.locator('#select-none-transfer').click();await page.locator('#transfer-list input').first().check();await page.locator('#transfer-next').click();await page.locator('#transfer-list input').first().check();check((await page.locator('#transfer-selected').innerText()).includes('2 из 55'),'выбор сохраняется между страницами');
 const raw=JSON.stringify(await data());await fail(true);await page.locator('#confirm-transfer').click();check(JSON.stringify(await data())===raw&&await page.locator('#transfer-dialog').isVisible(),'ошибка переноса: атомарность и открытое окно');await fail(false);await page.locator('#confirm-transfer').click();check((await data()).tasks.filter(t=>t.date==='2026-10-19').length===2,'частичный перенос на понедельник');await page.reload();check(!await page.locator('#transfer-dialog').isVisible(),'автопоказ не повторяется в ту же неделю');
 await page.locator('#unfinished').click();await page.locator('#select-none-transfer').click();await page.locator('#confirm-transfer').click();check((await data()).tasks.filter(t=>t.date==='2026-10-12').length===53,'нулевой выбор сохраняет даты');
 await page.locator('#unfinished').click();await page.locator('#later-transfer').click();check((await data()).tasks.filter(t=>t.date==='2026-10-12').length===53,'Позже сохраняет даты');
 await page.locator('#unfinished').click();await page.clock.setSystemTime(new Date('2026-10-26T09:00:00Z'));await page.locator('#confirm-transfer').click();check(await page.locator('#transfer-warning').isVisible()&&(await data()).tasks.every(t=>t.date!=='2026-10-26'),'новая неделя требует повторного подтверждения');await page.locator('#confirm-transfer').click();check((await data()).tasks.every(t=>t.date==='2026-10-26'&&t.moveHistory.at(-1).reason==='rollover'),'все задачи перенесены на новый понедельник');
 await page.locator('#unfinished').click();check(!await page.locator('#transfer-dialog').isVisible(),'пустой список не открывает окно');
 await page.locator('#add-task').click();await page.locator('#task-title').fill('Несохранённое');await page.clock.setSystemTime(new Date('2026-11-02T09:00:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));check(!await page.locator('#transfer-dialog').isVisible()&&await page.locator('#task-title').inputValue()==='Несохранённое','новая неделя не перекрывает редактор');await page.locator('#cancel-editor').click();await page.locator('#discard-changes').click();await page.locator('#transfer-dialog').waitFor();check(true,'перенос открыт после закрытия редактора');await page.locator('#later-transfer').click();
 // Ошибка записи очистки и импорта не меняет исходное сохранение.
 await seed(2,'2026-01-01','done');await page.reload();await page.locator('#data-menu>summary').click();await page.locator('#storage-data').click();const old=JSON.stringify(await data());await fail(true);await page.locator('#confirm-data').click();check(JSON.stringify(await data())===old&&await page.locator('#data-error').isVisible(),'ошибка очистки оставляет данные');await fail(false);await page.locator('#cancel-data').click();
 const backup=await page.evaluate(()=>PlannerCore.exportBackup(JSON.parse(localStorage.getItem(PlannerCore.KEY)),new Date().toISOString()));await page.locator('#import-file').setInputFiles('C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/step3-export.json');await page.waitForFunction(()=>!document.querySelector('#confirm-data').disabled);await fail(true);await page.locator('#confirm-data').click();check(JSON.stringify(await data())===old&&await page.locator('#data-error').isVisible(),'ошибка импорта оставляет данные');await fail(false);await page.locator('#cancel-data').click();
 // Производительность и ограничение DOM при 2000 задачах плюс 50 серий.
 await page.clock.setSystemTime(new Date('2026-10-19T09:00:00Z'));await seed(2000,'2026-10-19','todo',50);let start=Date.now();await page.reload();timings.push({operation:'startup 2000 tasks + 50 series',ms:Date.now()-start});check(await page.locator('.card').count()===50&&(await data()).tasks.length===2050,'2000 задач и 50 серий: полный набор и ограниченный DOM');start=Date.now();await page.locator('#sort-tasks').click();timings.push({operation:'sort including automation',ms:Date.now()-start});
 await page.screenshot({path:'C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/final-load.png'});
 await seed(2000,'2026-10-19','done',50);await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem(PlannerCore.KEY));s.tasks.forEach((t,i)=>t.date=t.originalDate=PlannerCore.addDays('2025-01-01',i%600));s.tasks.forEach(t=>t.order=0);localStorage.setItem(PlannerCore.KEY,JSON.stringify(s));});start=Date.now();await page.reload();timings.push({operation:'startup distributed 2000 tasks + 50 series',ms:Date.now()-start});check(await page.locator('.card').count()<=350,'распределённая история отображает только неделю');
 await seed(2,'2026-10-19');await page.reload();await page.locator('.card summary').first().click();await page.locator('.card').first().getByRole('button',{name:'Удалить',exact:true}).click();await page.locator('#data-menu>summary').click();await page.locator('#storage-data').click();check(await page.locator('#confirm-data').isDisabled()&&(await page.locator('#cleanup-summary').innerText()).includes('отмен'),'очистка заблокирована во время отмены удаления');await page.locator('#cancel-data').click();
 await seed(0,'2026-10-19','todo',1);await page.reload();await fail(true);await page.locator('#next-week').click();check(await page.locator('#generation-error').isVisible()&&(await data()).tasks.length===1,'ошибка генерации не сохраняет частичный пакет');await fail(false);await page.locator('#retry-generation').click();check(!await page.locator('#generation-error').isVisible()&&(await data()).tasks.length===2,'Повторить восстанавливает генерацию');
 await page.locator('#reminder-later').click();await page.clock.fastForward(86400001);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));check(await page.locator('#backup-reminder').isVisible(),'напоминание возвращается через сутки');
 check(!errors.length,'нет ошибок JS');return{passed:results.length,results,timings,errors};
 }catch(e){return{passed:results.length,results,failure:e.message,timings,errors};}finally{await context.close();}
}
)(page)});return {version:browser.version(),results};}finally{await context.close();await browser.close();}}