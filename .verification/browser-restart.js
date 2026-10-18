async (hostPage) => {
  const type = hostPage.context().browser().browserType(), results = [];
  const url = 'file:///C:/Users/L.khagush/Desktop/%D0%9B%D0%9E%D0%9D%D0%94%D0%90%20%D0%94%D0%9E%D0%9A%D0%98/Codex/index.html';
  const key = 'my-week-planner.v1';
  for (const channel of ['chrome', 'msedge']) {
    let context;
    const profile = `C:/Users/L.khagush/Desktop/ЛОНДА ДОКИ/Codex/.verification/profiles/${channel}-${Date.now()}`;
    try {
      context = await type.launchPersistentContext(profile, { channel, headless: true, viewport: { width: 1366, height: 768 }, timezoneId: 'Europe/Moscow' });
      let page = context.pages()[0] || await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.clock.install({ time: new Date('2026-10-19T09:00:00.000Z') }); await page.goto(url);
      await page.locator('#add-task').click(); await page.locator('#task-title').fill('Сохранить после полного перезапуска'); await page.locator('#save-task').click();
      await page.locator('.drag-handle').dragTo(page.locator('.day[data-date="2026-10-21"] .day-header'));
      await page.locator('.status-select').selectOption('in_progress'); await page.locator('.done-toggle').check(); await page.locator('.done-toggle').uncheck();
      await page.locator('[data-filter="work"]').click();
      const expected = await page.evaluate(key => localStorage.getItem(key), key), browserVersion = context.browser()?.version();
      if (!expected || JSON.parse(expected).tasks[0].date !== '2026-10-21') throw Error('Не удалось сохранить или переместить задачу');
      await context.close(); context = null;
      // Новый процесс браузера с тем же отдельным тестовым профилем.
      context = await type.launchPersistentContext(profile, { channel, headless: true, viewport: { width: 1366, height: 768 }, timezoneId: 'Asia/Tokyo' });
      page = context.pages()[0] || await context.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.clock.install({ time: new Date('2026-10-19T09:00:00.000Z') }); await page.goto(url);
      const actual = await page.evaluate(key => localStorage.getItem(key), key);
      if (actual !== expected) throw Error('Данные изменились после перезапуска');
      if (await page.locator('.day[data-date="2026-10-21"] .card').count() !== 1) throw Error('Смещение даты после смены часового пояса');
      if (await page.locator('.status-select').inputValue() !== 'in_progress') throw Error('Не восстановлен предыдущий статус');
      if (await page.locator('[data-filter="work"]').getAttribute('aria-pressed') !== 'true') throw Error('Не восстановлен фильтр');
      if (errors.length) throw Error(errors.join('; '));
      results.push({ channel, version: browserVersion, result: 'PASS', checks: ['file://', 'создание', 'drag-and-drop', 'готово и возврат статуса', 'полное закрытие и новый процесс', 'сохранение localStorage и фильтра', 'Москва → Токио: дата не смещается', 'нет ошибок JS'] });
    } catch (e) { results.push({ channel, result: 'FAIL', error: e.message }); }
    finally { if (context) await context.close(); }
  }
  return results;
}
