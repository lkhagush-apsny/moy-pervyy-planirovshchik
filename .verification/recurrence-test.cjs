'use strict';
const assert = require('node:assert/strict'), C = require('../script.js');
const now = '2026-10-19T09:00:00.000Z'; let sequence = 0, passed = 0;
const id = () => `generated-${++sequence}`;
const template = (extra = {}) => ({ title: 'Встреча', context: 'Контекст', category: 'work', priority: 'high', startDate: '2026-10-05', endDate: null, weekdays: [1,4], ...extra });
const seed = (extra = {}, horizon = '2026-10-25') => { const s = C.emptyState(); C.addSeries(s, template(extra), 'series-1', now); C.generate(s, horizon, now, id); return s; };
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
test('selected weekdays, inclusive end and independent todo instances', () => {
  const s = seed({ endDate: '2026-10-22' }); assert.deepEqual(s.tasks.map(t => t.date), ['2026-10-05','2026-10-08','2026-10-12','2026-10-15','2026-10-19','2026-10-22']);
  assert.ok(s.tasks.every(t => t.status === 'todo' && t.scheduledDate === t.date)); C.changeStatus(s.tasks[0], 'done', now); assert.equal(s.tasks[1].status,'todo'); C.validate(s);
});
test('first occurrence, empty interval and invalid rules', () => {
  assert.equal(C.firstOccurrence('2026-10-20',[1,4]),'2026-10-22');
  for (const extra of [{weekdays:[]},{weekdays:[1,1]},{weekdays:[8]},{endDate:'2026-10-01'},{startDate:'2026-10-20',endDate:'2026-10-21',weekdays:[1]}]) assert.throws(() => C.seriesFields(template(extra)));
  assert.equal(C.firstOccurrence('2100-12-31',[1]),null);
});
test('future series generate only within horizon; every day allowed', () => {
  const s = seed({startDate:'2026-11-01',weekdays:[1,2,3,4,5,6,7]}); assert.equal(s.tasks.length,0);
  C.generate(s,'2026-11-08',now,id); assert.equal(s.tasks.length,8); C.validate(s);
});
test('generation after long break is idempotent and preserves future instances', () => {
  const s = seed({startDate:'2026-01-01'}); const count=s.tasks.length; assert.ok(count>70);
  assert.equal(C.generate(s,'2026-10-25',now,id),0); C.generate(s,'2026-12-31',now,id); const future=s.tasks.length;
  assert.equal(C.generate(s,'2026-10-25',now,id),0); assert.equal(s.tasks.length,future); C.validate(s);
});
test('moved instance not recreated and coexists with scheduled instance', () => {
  const s=seed(), task=s.tasks[0]; C.move(s,task.id,'2026-10-19',null,now);
  assert.equal(task.scheduledDate,'2026-10-05'); assert.equal(C.generate(s,'2026-10-25',now,id),0); assert.equal(C.list(s,'2026-10-19').length,2); C.validate(s);
});
test('edit one does not alter template', () => {
  const s=seed(), t=s.tasks[0]; C.saveTask(s,{...t,title:'Только одна',status:'deferred'},t.id,null,now);
  assert.equal(s.series[0].title,'Встреча'); assert.equal(s.tasks[1].title,'Встреча'); C.validate(s);
});
test('single deletion creates exclusion; undo restores only that occurrence', () => {
  const s=seed(), record=C.remove(s,s.tasks[0].id); assert.equal(s.excludedOccurrences.length,1); assert.equal(C.generate(s,'2026-10-25',now,id),0);
  s.tasks[0].context='Новая правка'; C.restore(s,record); assert.equal(s.excludedOccurrences.length,0); assert.equal(s.tasks[0].context,'Новая правка'); C.validate(s);
});
test('split uses scheduled date after moving; future statuses reset', () => {
  const s=seed(), t=s.tasks[2], past=C.clone(s.tasks[0]); C.move(s,t.id,'2026-11-01',null,now); C.changeStatus(s.tasks[3],'done',now);
  C.changeSeries(s,t.id,template({title:'Новая серия',weekdays:[2]}),true,'series-2','2026-10-25',now,id);
  assert.equal(s.series[0].endDate,'2026-10-11'); assert.equal(s.series[1].startDate,'2026-10-12');
  assert.deepEqual(s.tasks.find(x=>x.id===past.id),past); const future=s.tasks.filter(x=>x.seriesId==='series-2');
  assert.deepEqual(future.map(x=>x.date),['2026-10-13','2026-10-20']); assert.ok(future.every(x=>x.status==='todo'&&!x.moveHistory.length)); C.validate(s);
});
test('split preserves previously materialized future horizon', () => {
  const s=seed({},'2026-12-31'), t=s.tasks[2]; C.changeSeries(s,t.id,template(),true,'series-2','2026-10-25',now,id);
  assert.ok(s.tasks.some(t=>t.seriesId==='series-2'&&t.date==='2026-12-31')); C.validate(s);
});
test('disable repeat keeps selected current date, status and ID', () => {
  const s=seed(), t=s.tasks[2], originalId=t.id; C.move(s,t.id,'2026-11-01',null,now); C.changeStatus(t,'done',now);
  C.changeSeries(s,t.id,template({title:'Самостоятельная'}),false,null,'2026-10-25',now,id);
  const left=s.tasks.find(x=>x.id===originalId); assert.equal(left.date,'2026-11-01'); assert.equal(left.status,'done'); assert.equal(left.seriesId,null); assert.equal(left.scheduledDate,null); C.validate(s);
});
test('future delete includes moved and done; undo preserves unrelated changes', () => {
  const s=seed(), selected=s.tasks[2]; C.move(s,s.tasks[4].id,'2026-10-01',null,now); C.changeStatus(s.tasks[3],'done',now);
  const record=C.deleteFuture(s,selected.id,now); assert.equal(s.tasks.length,2); assert.equal(C.generate(s,'2026-10-25',now,id),0);
  s.tasks[0].title='Сохранить правку'; C.restoreFuture(s,record); assert.equal(s.tasks.length,6); assert.equal(s.tasks[0].title,'Сохранить правку'); assert.equal(s.tasks.find(t=>t.scheduledDate==='2026-10-19').date,'2026-10-01'); C.validate(s);
});
test('stop at first occurrence supports minimum calendar date', () => {
  const s=seed({startDate:'1900-01-01',endDate:'1900-01-01',weekdays:[1]},'1900-01-01'); C.deleteFuture(s,s.tasks[0].id,now); C.validate(s); assert.equal(C.generate(s,'2026-10-25',now,id),0);
});
test('rollover covers categories and deferred, not done or current week', () => {
  const s=seed(); C.changeStatus(s.tasks[0],'done',now); s.tasks[1].category='personal'; C.changeStatus(s.tasks[1],'deferred',now);
  const candidates=C.candidates(s,'2026-10-19'); assert.equal(candidates.length,3); const ids=candidates.slice(0,2).map(t=>t.id);
  C.rollover(s,ids,'2026-10-19',now); assert.equal(s.tasks.find(t=>t.id===ids[0]).status,'deferred');
  assert.equal(s.tasks.find(t=>t.id===ids[0]).moveHistory.at(-1).reason,'rollover'); assert.equal(C.candidates(s,'2026-10-19').length,1);
  assert.deepEqual(C.list(s,'2026-10-19').slice(-2).map(t=>t.id),ids); C.validate(s);
});
test('duplicate occurrence and dangling series are rejected', () => {
  const s=seed(); s.tasks.push({...C.clone(s.tasks[0]),id:'other'}); assert.throws(()=>C.validate(s)); s.tasks.pop(); s.tasks[0].seriesId='missing'; assert.throws(()=>C.validate(s));
});
test('generation, split and rollover roll back atomically on quota error', () => {
  for (const mutate of [s=>C.generate(s,'2026-11-30',now,id),s=>C.changeSeries(s,s.tasks[2].id,template(),true,'new','2026-10-25',now,id),s=>C.rollover(s,C.candidates(s,'2026-10-19').map(t=>t.id),'2026-10-19',now)]) {
    let raw=JSON.stringify(seed()), fail=false; const storage={getItem:()=>raw,setItem:(k,v)=>{if(fail)throw new DOMException('full','QuotaExceededError');if(k===C.KEY)raw=v;},removeItem:()=>{}};
    const repo=new C.Repository(storage);repo.load();const before=raw, beforeState=C.clone(repo.state);fail=true;assert.throws(()=>repo.commit(mutate));assert.equal(raw,before);assert.deepEqual(repo.state,beforeState);
  }
});
test('20000-task limit prevents partial generation from being committed', () => {
  const s=seed({weekdays:[1,2,3,4,5,6,7],startDate:'1900-01-01'} ,'1900-01-01'); assert.throws(()=>C.generate(s,'2100-12-31',now,id),/20 000/);
});
console.log(`RESULT: ${passed} recurrence test groups passed`);
