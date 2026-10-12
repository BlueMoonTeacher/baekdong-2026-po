import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8,strToU8} from 'fflate';
import {createMaterialsArchive} from '../src/material-downloads.js';

test('one archive contains the PPT and editable worksheet with Korean filenames and intact bytes',async()=>{
 const resources=[
  {type:'PPT',name:'11차시 수업.pptx',staticPath:'/ppt'},
  {type:'활동지',name:'11차시 활동지.pdf',staticPath:'/pdf',editableName:'11차시 활동지.hwpx',editablePath:'/hwpx'},
 ];
 const files={'/ppt':'presentation','/hwpx':'worksheet'};
 const zip=await createMaterialsArchive(resources,async r=>strToU8(files[r.staticPath]));
 const extracted=unzipSync(zip);
 assert.deepEqual(Object.keys(extracted),['11차시 수업.pptx','11차시 활동지.hwpx']);
 assert.equal(strFromU8(extracted['11차시 수업.pptx']),'presentation');
 assert.equal(strFromU8(extracted['11차시 활동지.hwpx']),'worksheet');
});

test('PDF-only worksheets and single-material lessons can still be downloaded',async()=>{
 const zip=await createMaterialsArchive([{type:'활동지',name:'활동지.pdf',staticPath:'/pdf'}],async()=>new Uint8Array([1,2,3]));
 assert.deepEqual(unzipSync(zip)['활동지.pdf'],new Uint8Array([1,2,3]));
});

test('a failed or empty file rejects the whole archive instead of producing a partial download',async()=>{
 const resources=[{type:'PPT',name:'수업.pptx'},{type:'활동지',name:'활동지.pdf'}];
 await assert.rejects(createMaterialsArchive(resources,async r=>{if(r.type==='활동지')throw new Error('network');return new Uint8Array([1]);}),/network/);
 await assert.rejects(createMaterialsArchive(resources,async()=>new Uint8Array()),/파일이 비어/);
});
