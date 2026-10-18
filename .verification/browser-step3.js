// Подготовлен для запуска после восстановления доступа к браузерным проверкам.
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
