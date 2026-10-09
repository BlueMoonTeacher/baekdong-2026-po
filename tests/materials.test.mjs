import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceMatchesLesson,materialCells} from '../src/materials.js';

test('shared worksheets link all covered lessons and merge only identical material cells',()=>{
 const rows=[{project:3,group:'21'},{project:3,group:'22'},{project:3,group:'23'},{project:3,group:'24~25'},{project:3,group:'26'}];
 const shared=[{id:'data',project:3,lessonId:'21',lessonIds:['21','22']},{id:'policy',project:3,lessonId:'23',lessonIds:['23','24','25']}];
 assert.equal(resourceMatchesLesson(shared[0],rows[1]),true);
 assert.equal(resourceMatchesLesson(shared[0],rows[2]),false);
 assert.deepEqual(materialCells(rows,shared).map(c=>[c.rowSpan,c.hidden]),[[2,false],[1,true],[2,false],[1,true],[1,false]]);
 const withSpecific=[...shared,{id:'ppt22',project:3,lessonId:'22'}];
 assert.equal(materialCells(rows,withSpecific)[0].rowSpan,1);
 assert.equal(materialCells(rows,withSpecific)[1].hidden,false);
 assert.equal(resourceMatchesLesson({project:3,lessonId:'25'},rows[3]),true);
 assert.equal(resourceMatchesLesson({project:3,lessonId:''},rows[4]),true);
 assert.equal(resourceMatchesLesson({project:2,lessonId:''},rows[4]),false);
});
