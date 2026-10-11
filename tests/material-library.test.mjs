import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,open,readdir} from 'node:fs/promises';
import {resourceMatchesLesson} from '../src/materials.js';
import {publishedOriginal} from '../src/material-storage.js';
const resources=JSON.parse(await readFile(new URL('../src/local-resources.json',import.meta.url),'utf8'));
const common=JSON.parse(await readFile(new URL('../src/common-materials.json',import.meta.url),'utf8'));
const storageCatalog=JSON.parse(await readFile(new URL('../추가자료/수업자료Storage목록.json',import.meta.url),'utf8'));
const lessons=JSON.parse(await readFile(new URL('../src/curriculum.json',import.meta.url),'utf8'));
const publicFile=path=>new URL('../public'+path,import.meta.url);

test('every period has its correct project PPT and revised worksheets have PDF, editable source and page previews',async()=>{
 const ppts=resources.filter(r=>r.type==='PPT');
 for(const ppt of ppts){
  assert(ppt.previewImages?.length>0,`${ppt.name} slide previews missing`);
  assert.equal(ppt.previewBasis,'pdf');assert.match(ppt.pdfPath,/\.pdf$/);
  assert.equal(ppt.previewImages.length,ppt.previewPageCount);
  assert(ppt.previewImages.every(path=>path.includes('-pdf-'+ppt.previewVersion)));
 }
 for(const lesson of lessons)assert(ppts.some(r=>resourceMatchesLesson(r,lesson)),`${lesson.number}차시 PPT missing`);
 for(const period of [26,27,28,29,30]){
  const worksheet=resources.find(r=>r.type==='활동지'&&r.lessonIds?.includes(String(period)));
  assert(worksheet,`${period}차시 worksheet missing`);
  assert.match(worksheet.name,/\.pdf$/i);assert.match(worksheet.editableName,/\.hwpx$/i);
  assert(worksheet.previewImages?.length>0);assert.match(worksheet.description,/최소 수정/);
 }
 for(const resource of resources){
  for(const path of [resource.staticPath,resource.pdfPath,resource.editablePath,...resource.previewImages||[]].filter(p=>p?.startsWith('/')))assert((await stat(publicFile(path))).size>0,path);
  if(resource.type==='활동지'||resource.pdfPath){
   const file=await open(publicFile(resource.pdfPath||resource.staticPath));
   try{const header=Buffer.alloc(5);await file.read(header,0,5,0);assert.equal(header.toString(),'%PDF-');}finally{await file.close();}
  }
 }
});

test('PPT and HWP originals use verified Storage records while PDF previews stay on Hosting',async()=>{
 assert.equal(Object.keys(storageCatalog.files).length,45);
 for(const resource of [...resources,...common]){
  if(resource.type==='PPT'||common.includes(resource)){
   const original=publishedOriginal(storageCatalog,resource.sourceFile);
   assert(original);assert.equal(resource.staticPath,original.url);
   assert.equal(resource.storageSha256,original.sha256);assert.equal(resource.size,original.size);
  }
  if(resource.editablePath){assert.match(resource.editablePath,/^https:\/\/firebasestorage\.googleapis\.com\//);assert.match(resource.editableSha256,/^[a-f0-9]{64}$/);}
  if(resource.pdfPath)assert(resource.pdfPath.startsWith('/materials/'));
 }
 async function verifyFolder(folder){
  for(const entry of await readdir(folder,{withFileTypes:true})){
   if(entry.isDirectory())await verifyFolder(new URL(entry.name+'/',folder));
   else assert(!/\.(pptx?|hwpx?)$/i.test(entry.name),`Original still bundled: ${entry.name}`);
  }
 }
 await verifyFolder(new URL('../public/materials/',import.meta.url));
 assert.throws(()=>publishedOriginal({...storageCatalog,bucket:'unexpected-bucket'},common[0].sourceFile),/Invalid published material/);
});

test('web app and AI revision scope begins at period 26',()=>{
 for(const lesson of lessons){
  if(lesson.number<26)assert.notEqual(lesson.detailVersion,'policy-socratic-2026');
  else {assert.equal(lesson.detailVersion,'policy-socratic-2026');assert(lesson.detail.some(s=>s.includes('Gems')));assert(lesson.detail.some(s=>s.includes('NotebookLM')));}
 }
});
