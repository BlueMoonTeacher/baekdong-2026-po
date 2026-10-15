import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/${name}`,import.meta.url),'utf8'));
const lessons=read('curriculum.json'),previews=read('lesson-plan-previews.json');
const asset=url=>new URL(`../public${url}`,import.meta.url);
test('all 30 periods have a source-linked PDF; shared periods use their original guide',()=>{
 assert.equal(Object.keys(previews).length,27);
 assert.deepEqual(Object.values(previews).flatMap(guide=>guide.lessonIds).map(Number).sort((a,b)=>a-b),Array.from({length:30},(_,i)=>i+1));
 for(const lesson of lessons){
  const guide=previews[lesson.group];
  assert.ok(guide.lessonIds.includes(String(lesson.number)));
  assert.equal(guide.project,lesson.project);
 }
 assert.deepEqual(previews['3~4'].lessonIds,['3','4']);
 assert.deepEqual(previews['24~25'].lessonIds,['24','25']);
 assert.deepEqual(previews['28~29'].lessonIds,['28','29']);
});
test('every source page belongs to exactly one guide, including its assessment pages',()=>{
 const pages=Object.values(previews).flatMap(guide=>guide.sourcePages).sort((a,b)=>a-b);
 assert.deepEqual(pages,Array.from({length:45},(_,i)=>i+1));
 const hash=crypto.createHash('sha256').update(fs.readFileSync(asset('/materials/lesson-plan.pdf'))).digest('hex');
 for(const guide of Object.values(previews))assert.equal(guide.sourceSha256,hash);
 assert.deepEqual(previews['28~29'].sourcePages,[42,43]);
 assert.equal(previews['28~29'].pageCount,2,'the revised shared guide has no heading-only orphan page');
});
test('all PDF and page-image URLs point to complete deployable documents',()=>{
 for(const guide of Object.values(previews)){
  assert.equal(fs.readFileSync(asset(guide.staticPath)).subarray(0,5).toString(),'%PDF-');
  assert.equal(guide.previewImages.length,guide.pageCount);
  for(const url of guide.previewImages){
   const bytes=fs.readFileSync(asset(url));
   assert.equal(bytes.subarray(0,4).toString(),'RIFF');
   assert.equal(bytes.subarray(8,12).toString(),'WEBP');
   assert.ok(bytes.length>1000);
  }
 }
});
