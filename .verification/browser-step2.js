async (hostPage) => {
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
    await setDays([]);await page.locator('#save-task').click();check(await page.locator('#form-error').isVisible(),'пустой набор дней отклонён');
    await setDays([1,4]);await page.locator('#repeat-end').fill('2026-10-18');await page.locator('#save-task').click();check(await page.locator('#form-error').isVisible(),'окончание раньше начала отклонено');
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
