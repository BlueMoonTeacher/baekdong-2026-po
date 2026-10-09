import test from 'node:test';
import assert from 'node:assert/strict';
import {availableUnits,eventBlocks,periodLabel,periodSlot,unitPeriodCount} from '../src/lesson-periods.js';
import {bulkProgressRows} from '../src/progress.js';
const lessons=[{id:'1',number:1,project:1,group:'1'},{id:'3',number:3,project:1,group:'3~4'},{id:'4',number:4,project:1,group:'3~4'}];

test('completed units disappear from new schedules, while other classes and editing remain available',()=>{
 const progress={a_1:{activity:true},a_3:{activity:true},a_4:{activity:true}};
 assert.equal(availableUnits(lessons,progress,['a']).length,0);
 assert.deepEqual(availableUnits(lessons,progress,['a','b']).map(u=>u.group),['1','3~4']);
 assert.deepEqual(availableUnits(lessons,progress,['a'],'4').map(u=>u.group),['3~4']);
 assert.equal(unitPeriodCount(availableUnits(lessons,{},['a'])[1]),2);
 assert.deepEqual(periodSlot(5,2),{time:'12:20',endTime:'13:50'});
 assert.throws(()=>periodSlot(6,2));
});
test('grouped calendar entries retain all lesson IDs and permit per-class independent schedules',()=>{
 const events=[{id:'a3',classId:'a',lessonId:'3',date:'2026-10-13',...periodSlot(2,2)},{id:'a4',classId:'a',lessonId:'4',date:'2026-10-13',...periodSlot(2,2)},{id:'b4',classId:'b',lessonId:'4',date:'2026-10-13',...periodSlot(2,2)}];
 const blocks=eventBlocks(events,lessons);
 assert.equal(blocks.length,2);
 assert.deepEqual(blocks[0].relatedIds,['a3','a4']);
 assert.deepEqual(blocks[0].lessonIds,['3','4']);
 assert.equal(periodLabel(blocks[0]),'2~3교시');
 assert.equal(periodLabel(periodSlot(1)),'1교시');
});
test('bulk completion and release patch only the chosen column, class and filtered project',()=>{
 const progress={a_1:{activity:true,padlet:true,worksheet:true},a_3:{activity:false,padlet:false},b_3:{activity:true,padlet:true}};
 const filtered=lessons.slice(1);
 assert.deepEqual(bulkProgressRows(filtered,progress,'a','padlet',true),[{id:'a_3',value:{classId:'a',number:3,padlet:true}},{id:'a_4',value:{classId:'a',number:4,padlet:true}}]);
 const release=bulkProgressRows(lessons,progress,'a','worksheet',false);
 assert.deepEqual(release,[{id:'a_1',value:{classId:'a',number:1,worksheet:false}}]);
 assert.equal(progress.a_1.activity,true);assert.equal(progress.b_3.padlet,true);
});
