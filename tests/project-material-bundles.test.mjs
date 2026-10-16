import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8,strToU8} from 'fflate';
import {projectBundleFiles,streamMaterialArchive} from '../src/project-material-bundles.js';
import {lessonFileId} from '../src/lesson-files.js';
const read=name=>JSON.parse(readFileSync(new URL('../src/'+name,import.meta.url),'utf8'));
const input={lessons:read('curriculum.json'),base:read('local-resources.json'),previews:read('lesson-plan-previews.json'),resources:{}};
const files=(project=0,kind='all',resources={})=>projectBundleFiles({...input,project,kind,resources});
const replacement=(number,key,name,seconds=100)=>{const lesson=input.lessons.find(l=>l.number===number);return {id:lessonFileId(lesson,key),name,url:`https://example.test/${number}/${key}/${name}`,size:123,updatedAt:{seconds}};};

test('all and per-project bundles contain exact original/PDF counts with no repeated shared lessons',()=>{
 assert.equal(files(0,'ppt').length,21);assert.equal(files(0,'worksheet').length,44);assert.equal(files(0,'guide').length,27);assert.equal(files().length,92);
 for(const [project,counts] of [[1,[9,12,9]],[2,[6,20,10]],[3,[6,12,8]]]){
  for(const [index,kind] of ['ppt','worksheet','guide'].entries()){
   const bundle=files(project,kind);assert.equal(bundle.length,counts[index]);
   assert(bundle.every(file=>file.project===project&&file.archiveName.startsWith(`프로젝트${project}/`)));
   assert.equal(new Set(bundle.map(file=>file.url)).size,bundle.length);
  }
 }
 assert(files(0,'ppt').every(file=>file.name.endsWith('.pptx')));
 assert(files(0,'worksheet').some(file=>file.name.endsWith('.hwpx')));
 assert(files(0,'worksheet').some(file=>file.name.endsWith('.pdf')));
});

test('replacements are included, stale PDFs excluded, and identical filenames cannot overwrite entries',()=>{
 const ppt15=replacement(15,'ppt-original','수정.pptx'),ppt16=replacement(16,'ppt-original','수정.pptx');
 const hwp=replacement(26,'guide-hwp','새 지도안.hwpx',200),oldPdf=replacement(26,'guide-pdf','예전 지도안.pdf',100);
 const resources=Object.fromEntries([ppt15,ppt16,hwp,oldPdf].map(r=>[r.id,r]));
 const ppt=files(2,'ppt',resources);assert(ppt.some(file=>file.url===ppt15.url));assert(ppt.some(file=>file.url===ppt16.url));
 assert.equal(new Set(ppt.map(file=>file.archiveName)).size,ppt.length);
 assert(ppt.some(file=>file.archiveName.endsWith('수정 (2).pptx')));
 assert.equal(files(2,'ppt').length+2,ppt.length,'the original shared PPT is still needed by period 17');
 const guides=files(3,'guide',resources);assert(guides.some(file=>file.url===hwp.url));assert(!guides.some(file=>file.url===oldPdf.url));
 assert(!guides.some(file=>file.url==='/materials/lesson-plans/lesson-26/guide.pdf'));
 const pdf={...oldPdf,updatedAt:{seconds:200}};
 assert(files(3,'guide',{...resources,[pdf.id]:pdf}).some(file=>file.url===pdf.url));
});

test('streaming ZIP preserves Korean paths and content while waiting for each destination write',async()=>{
 const fixture=[{name:'수업.pptx',archiveName:'프로젝트2/PPT/수업.pptx'},{name:'활동지.hwpx',archiveName:'프로젝트2/활동지/활동지.hwpx'}];
 const output=[];let writing=0,peak=0;
 const result=await streamMaterialArchive(fixture,{
  openFile:async function*(file){yield strToU8(file.name);yield strToU8(' 내용');},
  write:async bytes=>{writing++;peak=Math.max(peak,writing);await new Promise(resolve=>setTimeout(resolve,1));output.push(bytes);writing--;},
 });
 const archive=Buffer.concat(output.map(bytes=>Buffer.from(bytes))),extracted=unzipSync(archive);
 assert.deepEqual(Object.keys(extracted),fixture.map(file=>file.archiveName));
 for(const file of fixture)assert.equal(strFromU8(extracted[file.archiveName]),file.name+' 내용');
 assert.equal(peak,1);assert.equal(result.files,2);
});

test('read/write failures, empty input and cancellation never produce a completed archive',async()=>{
 const fixture=[{name:'자료.pdf',archiveName:'자료.pdf'}];
 await assert.rejects(streamMaterialArchive([],{openFile:async function*(){},write:()=>{}}),/자료가 없습니다/);
 await assert.rejects(streamMaterialArchive(fixture,{openFile:async function*(){yield new Uint8Array([1]);throw Error('network');},write:()=>{}}),/network/);
 await assert.rejects(streamMaterialArchive(fixture,{openFile:async function*(){yield new Uint8Array([1]);},write:()=>{throw Error('disk-full');}}),/disk-full/);
 await assert.rejects(streamMaterialArchive(fixture,{openFile:async function*(){},write:()=>{}}),/비어/);
 const abort=new AbortController();
 await assert.rejects(streamMaterialArchive(fixture,{signal:abort.signal,openFile:async function*(){yield new Uint8Array([1]);abort.abort();yield new Uint8Array([2]);},write:()=>{}}),{name:'AbortError'});
});

test('a large bundle is consumed in chunks without collecting source files in memory',async()=>{
 const chunk=new Uint8Array(64*1024);let written=0;
 await streamMaterialArchive([{name:'큰 자료.pptx',archiveName:'큰 자료.pptx'}],{
  openFile:async function*(){for(let i=0;i<2048;i++)yield chunk;},
  write:bytes=>{assert(bytes.length<=64*1024);written+=bytes.length;},
 });
 assert(written>128*1024*1024);
});
