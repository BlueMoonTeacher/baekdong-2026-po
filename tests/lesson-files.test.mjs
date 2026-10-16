import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lessonFileId,resolveLessonFiles,saveLessonFiles,validateLessonFile,lessonFileSlots,lessonMaterialLibrary} from '../src/lesson-files.js';
import {mergeMaterialCells} from '../src/materials.js';
const read=name=>JSON.parse(readFileSync(new URL('../src/'+name,import.meta.url),'utf8'));
const lessons=read('curriculum.json'),base=read('local-resources.json'),previews=read('lesson-plan-previews.json');
const lesson=n=>lessons.find(l=>l.number===n);
const saved=(n,key,seconds=100)=>({id:lessonFileId(lesson(n),key),name:`new-${key}.${key.endsWith('hwp')?'hwpx':key==='ppt-original'?'pptx':'pdf'}`,url:`https://example.test/new-${key}`,path:`materials/${lessonFileId(lesson(n),key)}/file.pdf`,updatedAt:{seconds}});
test('unmodified lessons preserve their original PDFs, preview images and editable downloads',()=>{
 for(const l of lessons){const files=resolveLessonFiles(l,base,{},previews);assert(files.guide.staticPath);assert(files.guide.previewImages.length);assert(files.ppt.staticPath);assert(files.ppt.previewImages.length);}
});
test('a per-period PPT replacement never changes other periods sharing the base PPT',()=>{
 const source=saved(16,'ppt-original'),pdf=saved(16,'ppt-pdf');const resources=Object.fromEntries([source,pdf].map(r=>[r.id,r]));
 const changed=resolveLessonFiles(lesson(16),base,resources,previews).ppt;
 assert.equal(changed.staticPath,source.url);assert.equal(changed.pdfPath,pdf.url);assert.equal(changed.renderPdf,true);assert.deepEqual(changed.previewImages,[]);
 for(const n of [15,17])assert.notEqual(resolveLessonFiles(lesson(n),base,resources,previews).ppt.staticPath,source.url);
 const rows=[lesson(15),lesson(16),lesson(17)];const cells=mergeMaterialCells(rows,rows.map(l=>({resources:[resolveLessonFiles(l,base,resources,previews).ppt],rowSpan:1,hidden:false})));
 assert(cells.every(c=>!c.hidden&&c.rowSpan===1));
});
test('shared guide overrides apply to both periods and do not retain old preview images',()=>{
 const guide=saved(28,'guide-pdf'),resources={[guide.id]:guide};
 for(const n of [28,29]){const value=resolveLessonFiles(lesson(n),base,resources,previews).guide;assert.equal(value.staticPath,guide.url);assert.equal(value.renderPdf,true);assert.equal(value.lessonRange,'28~29');assert.deepEqual(value.previewImages,[]);}
 assert.notEqual(resolveLessonFiles(lesson(30),base,resources,previews).guide.staticPath,guide.url);
 assert(lessonMaterialLibrary(lessons,base,resources,previews).some(r=>r.staticPath===guide.url));
});
test('replacing an original suppresses a stale PDF until its matching PDF is registered',()=>{
 for(const [sourceKey,pdfKey,category] of [['ppt-original','ppt-pdf','ppt'],['worksheet-hwp','worksheet-pdf','worksheet'],['guide-hwp','guide-pdf','guide']]){
  const source=saved(26,sourceKey,200),old=saved(26,pdfKey,100),resources={[source.id]:source,[old.id]:old};
  const stale=resolveLessonFiles(lesson(26),base,resources,previews)[category];assert.equal(category==='ppt'?stale.pdfPath:stale.staticPath,null);assert(stale.previewNotice);assert.deepEqual(stale.previewImages,[]);
  resources[old.id]={...old,updatedAt:{seconds:200}};
  const current=resolveLessonFiles(lesson(26),base,resources,previews)[category];assert.equal(category==='ppt'?current.pdfPath:current.staticPath,old.url);assert.equal(current.previewNotice,undefined);
 }
});
test('file validation rejects wrong formats, empty files, oversized files and renamed files',async()=>{
 const slot=lessonFileSlots[0];
 await validateLessonFile(new File(['%PDF-1.7\ncontent'],'guide.PDF'),slot);
 await assert.rejects(validateLessonFile(new File(['bad'],'guide.pdf'),slot),/파일 형식/);
 await assert.rejects(validateLessonFile(new File(['%PDF-1.7'],'guide.exe'),slot),/\.pdf/);
 await assert.rejects(validateLessonFile(new File([],'guide.pdf'),slot),/비어/);
 await assert.rejects(validateLessonFile({size:51*1024*1024,name:'guide.pdf'},slot),/50MB/);
});
test('all uploads publish atomically; a failed publication only removes newly uploaded files',async()=>{
 const selected={'guide-pdf':new File(['%PDF-1.7 content'],'guide.pdf'),'ppt-pdf':new File(['%PDF-1.7 content'],'slides.pdf')},uploaded=[],deleted=[];let published;
 await saveLessonFiles({lesson:lesson(26),selected,upload:async(path,file,progress)=>{uploaded.push(path);progress(1);return 'https://example.test/'+path;},publish:async rows=>{assert.equal(uploaded.length,2);published=rows;},discard:async path=>deleted.push(path)});
 assert.equal(published.length,2);assert.equal(deleted.length,0);
 for(const row of published){assert(row.value.path.startsWith(`materials/${row.id}/`));assert.equal(row.value.lessonId,'26');assert.deepEqual(Object.keys(row.value).sort(),['description','lessonId','name','path','project','size','type','url']);}
 const cleanup=[];let count=0;
 await assert.rejects(saveLessonFiles({lesson:lesson(26),selected,upload:async path=>{count++;return 'https://example.test/'+path;},publish:async()=>{throw Error('catalog-failed');},discard:async path=>cleanup.push(path)}),/catalog-failed/);
 assert.equal(count,2);assert.equal(cleanup.length,2);assert(cleanup.every(path=>!uploaded.includes(path)));
 let wrote=false;
 await assert.rejects(saveLessonFiles({lesson:lesson(26),selected:{'guide-pdf':new File(['wrong'],'bad.pdf')},upload:async()=>{wrote=true;},publish:async()=>{},discard:async()=>{}}));assert.equal(wrote,false);
});
