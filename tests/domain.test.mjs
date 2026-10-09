import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hasConflict,classStats,safeUrl,monthCells} from '../src/domain.js';
const lessons=JSON.parse(fs.readFileSync(new URL('../src/curriculum.json',import.meta.url)));
test('all 30 periods occur once in the requested project order',()=>{
 assert.deepEqual(lessons.map(l=>l.number),Array.from({length:30},(_,i)=>i+1));
 assert.match(lessons[10].title,/인터뷰/);assert.equal(lessons[10].project,2);
 assert.match(lessons[20].title,/인구|데이터/);assert.equal(lessons[20].project,3);
 assert.equal(lessons[23].group,'24~25');assert.equal(lessons[28].group,'28~29');
});
test('check types and classes are counted independently',()=>{
 const stats=classStats('a',{'a_1':{activity:true,worksheet:true},'a_2':{padlet:true},'b_3':{activity:true}},lessons);
 assert.deepEqual(stats,{activity:1,worksheet:1,padlet:1,percent:3});
});
test('calendar prevents overlaps within a class but permits adjacent or different-class slots',()=>{
 const e={id:'x',classId:'a',date:'2026-10-09',time:'09:00',endTime:'09:40'};
 assert.equal(hasConflict({x:e},{...e,time:'09:20',endTime:'10:00'}),true);
 assert.equal(hasConflict({x:e},{...e,time:'09:40',endTime:'10:20'}),false);
 assert.equal(hasConflict({x:e},{...e,classId:'b'}),false);
 assert.equal(hasConflict({x:e},e,'x'),false);
});
test('link safety and calendar weekday boundaries',()=>{
 assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('http://example.com'),null);
 assert.equal(safeUrl('https://padlet.com/abc'),'https://padlet.com/abc');
 const cells=monthCells(2026,9);assert.equal(cells[4],'2026-10-01');assert.equal(cells.filter(Boolean).length,31);
});
