import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planSchedule} from '../src/scheduling.js';
const lessons=JSON.parse(fs.readFileSync(new URL('../src/curriculum.json',import.meta.url)));
const base={lessons,classes:[{id:'a',name:'1반'},{id:'b',name:'2반'}],selectedClasses:['a'],progress:{},events:{},startDate:'2026-10-09',weekdays:[2,4]};
test('Tuesday/Thursday two-period lessons finish P2 and P3 before November 26',()=>{
 const result=planSchedule(base);
 assert.equal(result.canSave,true);assert.equal(result.rows.length,20);
 assert.deepEqual(result.rows.map(r=>r.number),Array.from({length:20},(_,i)=>11+i));
 assert.equal(result.rows[0].value.date,'2026-10-13');assert.equal(result.rows.at(-1).value.date,'2026-11-17');
 for(const r of result.rows){assert.ok(r.value.date<'2026-11-26');assert.ok([2,4].includes(new Date(`${r.value.date}T00:00:00Z`).getUTCDay()));}
 const days=Object.groupBy(result.rows,r=>r.value.date);assert.ok(Object.values(days).every(day=>day.length<=2));
 const grouped=result.rows.filter(r=>[24,25].includes(r.number));
 assert.deepEqual(grouped[0].value.time,grouped[1].value.time);
 assert.deepEqual(grouped[0].value.endTime,grouped[1].value.endTime);
 assert.equal(grouped[0].value.endTime,'10:30');
});
test('three-lesson units reserve two consecutive school periods and cannot cross dates',()=>{
 const trio=[24,25,26].map(n=>({...lessons[n-1],group:'24~26'}));
 const result=planSchedule({...base,lessons:trio,startPeriod:3});
 assert.equal(result.canSave,true);assert.equal(result.rows.length,3);
 assert.ok(result.rows.every(r=>r.value.date==='2026-10-13'&&r.value.time==='10:40'&&r.value.endTime==='12:10'));
 assert.equal(planSchedule({...base,lessons:trio,periodsPerDay:1}).canSave,false);
 const fixed=Object.fromEntries(result.rows.map(r=>[String(r.number),{id:String(r.number),...r.value}]));
 assert.equal(planSchedule({...base,lessons:trio,events:fixed,startPeriod:3}).issues.length,0);
});
test('completed lessons, excluded dates, conflicts, and each class are respected',()=>{
 const event={id:'fixed',classId:'a',lessonId:'1',date:'2026-10-13',time:'09:00',endTime:'09:40',note:''};
 const result=planSchedule({...base,selectedClasses:['a','b'],progress:{a_11:{activity:true}},events:{fixed:event},excludedDates:['2026-10-15']});
 assert.equal(result.canSave,true);assert.equal(result.rows.length,39);
 assert.ok(!result.rows.some(r=>r.value.date==='2026-10-15'));
 assert.ok(!result.rows.some(r=>r.number===11&&r.value.classId==='a'));
 assert.equal(result.rows.find(r=>r.value.classId==='a').value.time,'09:50');
 assert.equal(result.rows.find(r=>r.value.classId==='b').value.time,'09:00');
});
test('rebalance only replaces future pending lessons in selected projects and keeps notes',()=>{
 const event=(id,lessonId,date,note='')=>({id,classId:'a',lessonId,date,time:'09:00',endTime:'09:40',note});
 const events={past:event('past','11','2026-10-08'),future:event('future','12','2026-12-01','준비물 유지'),done:event('done','13','2026-10-15'),p1:event('p1','1','2026-10-20')};
 const result=planSchedule({...base,mode:'rebalance',events,progress:{a_13:{activity:true}}});
 assert.equal(result.canSave,true);assert.deepEqual(result.removeIds,['future']);
 assert.equal(result.rows.find(r=>r.number===12).value.note,'준비물 유지');
 assert.ok(!result.rows.some(r=>[11,13].includes(r.number)));
});
test('fixed dates constrain order and missing capacity prevents saving',()=>{
 const fixed={id:'fixed',classId:'a',lessonId:'12',date:'2026-10-13',time:'09:50',endTime:'10:30',note:''};
 const result=planSchedule({...base,events:{fixed}});
 assert.equal(result.canSave,true);assert.equal(result.rows[0].number,11);assert.equal(result.rows[0].value.time,'09:00');
 const late=planSchedule({...base,events:{fixed:{...fixed,time:'11:00',endTime:'11:40'}}});
 assert.equal(late.rows.filter(r=>r.value.date==='2026-10-13').length,1);
 const short=planSchedule({...base,startDate:'2026-11-24'});
 assert.equal(short.canSave,false);assert.equal(short.summaries[0].missing,18);assert.ok(short.issues.length);
 assert.equal(planSchedule({...base,startDate:'2026-02-30'}).canSave,false);
 const overdue=planSchedule({...base,events:{fixed:{...fixed,date:'2026-11-26'}}});assert.equal(overdue.canSave,false);
});
