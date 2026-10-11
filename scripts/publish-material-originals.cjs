// Uses the existing Firebase CLI login. Credentials and resumable session URLs are never printed or saved.
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve('추가자료'),catalogFile=path.join(root,'수업자료Storage목록.json');
const bucket='baekdong-population-2026.firebasestorage.app';
const cli=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const {configstore}=require(path.join(cli,'configstore.js')),api=require(path.join(cli,'apiv2.js'));
const tokens=configstore.get('tokens');if(!tokens)throw new Error('Run firebase login first.');
api.setRefreshToken(tokens.refresh_token);api.setAccessToken(tokens.access_token);
const client=new api.Client({urlPrefix:'https://storage.googleapis.com'});
const sourceFile=relative=>{const resolved=path.resolve(root,relative);if(!resolved.startsWith(root+path.sep))throw new Error('Source outside 추가자료');return resolved;};
const idFor=file=>'local-'+crypto.createHash('sha256').update(file.replaceAll('\\','/')).digest('hex').slice(0,16);
let catalog={version:1,bucket,files:{}},saveQueue=Promise.resolve();
async function save(){saveQueue=saveQueue.then(()=>fsp.writeFile(catalogFile,JSON.stringify(catalog,null,2)+'\n'));await saveQueue;}
async function digests(file){const sha=crypto.createHash('sha256'),md5=crypto.createHash('md5');for await(const chunk of fs.createReadStream(file)){sha.update(chunk);md5.update(chunk);}return {sha256:sha.digest('hex'),md5Hash:md5.digest('base64')};}
function validate(metadata,digest,size){if(Number(metadata.size)!==size||metadata.md5Hash!==digest.md5Hash||metadata.metadata?.sha256!==digest.sha256)throw new Error('Stored file checksum mismatch');}
async function upload(file,object,size,digest,name){
 const contentType=file.endsWith('.pptx')?'application/vnd.openxmlformats-officedocument.presentationml.presentation':'application/hwp+zip';
 const start=await client.post(`/upload/storage/v1/b/${bucket}/o`,{name:object,contentType,md5Hash:digest.md5Hash,metadata:{sha256:digest.sha256},cacheControl:'public,max-age=31536000,immutable',contentDisposition:`attachment; filename="material${path.extname(file)}"; filename*=UTF-8''${encodeURIComponent(name).replaceAll("'",'%27')}`},{queryParams:{uploadType:'resumable',ifGenerationMatch:'0'},headers:{'X-Upload-Content-Type':contentType,'X-Upload-Content-Length':String(size)}});
 const session=start.response.headers.get('location');if(!session||new URL(session).hostname!=='storage.googleapis.com')throw new Error('Invalid upload session');
 const handle=await fsp.open(file,'r');let offset=0,failures=0,lastQuarter=0;
 try {
  while(offset<size){
   const length=Math.min(16*1024*1024,size-offset),buffer=Buffer.alloc(length);const {bytesRead}=await handle.read(buffer,0,length,offset);if(bytesRead!==length)throw new Error('Source changed during upload');
   let response;
   try {response=await fetch(session,{method:'PUT',headers:{'Content-Type':contentType,'Content-Length':String(length),'Content-Range':`bytes ${offset}-${offset+length-1}/${size}`},body:buffer,signal:AbortSignal.timeout(120000)});}
   catch {if(++failures>3)throw new Error('Upload connection failed after retries');}
   if(!response||response.status>=500){
    if(response&&++failures>3)throw new Error('Upload server failed after retries');
    const status=await fetch(session,{method:'PUT',headers:{'Content-Length':'0','Content-Range':`bytes */${size}`},signal:AbortSignal.timeout(30000)});
    if(status.status===200||status.status===201)return await status.json();
    if(status.status!==308)throw new Error('Could not resume upload');
    const range=status.headers.get('range');offset=range?Number(range.match(/-(\d+)$/)[1])+1:0;continue;
   }
   if(response.status===200||response.status===201)return await response.json();
   if(response.status!==308)throw new Error(`Upload rejected (${response.status})`);
   const range=response.headers.get('range');if(!range)throw new Error('Upload did not acknowledge bytes');
   offset=Number(range.match(/-(\d+)$/)[1])+1;failures=0;
   const quarter=Math.floor(offset/size*4);if(size>50*1024*1024&&quarter>lastQuarter){console.log(`${name}: ${quarter*25}%`);lastQuarter=quarter;}
  }
  throw new Error('Upload finished without confirmation');
 } finally {await handle.close();}
}
async function publish(task){
 const file=sourceFile(task.file),size=(await fsp.stat(file)).size,digest=await digests(file),ext=path.extname(file).toLowerCase();
 const object=`materials/${task.id}-${digest.sha256.slice(0,12)}/${task.id}${ext}`;
 const existing=await client.get(`/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}`,{resolveOnHTTPError:true});
 let metadata;
 if(existing.status===200){metadata=existing.body;validate(metadata,digest,size);}
 else if(existing.status===404){metadata=await upload(file,object,size,digest,path.basename(file));validate(metadata,digest,size);}
 else throw new Error(`Storage metadata unavailable (${existing.status})`);
 const url=`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`;
 const sample=await fetch(url,{headers:{Range:'bytes=0-7',Origin:'https://baekdong-population-2026.web.app'},signal:AbortSignal.timeout(30000)});
 if(sample.status!==206) {await sample.body?.cancel();throw new Error(`Public range download failed (${sample.status})`);}
 const expected=Buffer.alloc(8),handle=await fsp.open(file,'r');try{await handle.read(expected,0,8,0);}finally{await handle.close();}
 if(!Buffer.from(await sample.arrayBuffer()).equals(expected)||!sample.headers.get('content-disposition')?.startsWith('attachment'))throw new Error('Public download content mismatch');
 catalog.files[task.file]={object,name:path.basename(file),size,...digest,generation:String(metadata.generation)};await save();
 console.log(`Published: ${path.basename(file)} (${(size/1024/1024).toFixed(1)} MB)`);
}
(async()=>{
 try{catalog=JSON.parse(await fsp.readFile(catalogFile,'utf8'));if(catalog.bucket!==bucket)throw new Error('Unexpected bucket');}catch(e){if(e.code!=='ENOENT')throw e;}
 const manifest=JSON.parse(await fsp.readFile(path.join(root,'수업자료등록목록.json'),'utf8'));
 const common=JSON.parse(await fsp.readFile(path.join(root,'공통자료등록목록.json'),'utf8'));
 const tasks=[];
 for(const entry of await fsp.readdir(root,{withFileTypes:true})){
  if(entry.isFile()&&/\.(pptx?|hwpx?)$/i.test(entry.name)&&!manifest.excludeTopLevel?.includes(entry.name))tasks.push({id:idFor(entry.name),file:entry.name});
 }
 for(const r of manifest.files){const id=r.id||idFor(r.file);if(r.type==='PPT')tasks.push({id,file:r.file});if(r.editableFile)tasks.push({id,file:r.editableFile});}
 tasks.push(...common.map(r=>({id:r.id,file:r.file})));
 for(const task of tasks)task.size=(await fsp.stat(sourceFile(task.file))).size;
 tasks.sort((a,b)=>a.size-b.size);
 let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<tasks.length){const task=tasks[cursor++];await publish(task);}}));
 catalog.files=Object.fromEntries(tasks.map(t=>[t.file,catalog.files[t.file]]));await save();
 console.log(`Verified ${tasks.length} published originals. Total ${(tasks.reduce((sum,t)=>sum+t.size,0)/1024/1024).toFixed(1)} MB.`);
})().catch(e=>{console.error(e.message.replace(/https:\/\/storage\.googleapis\.com\/upload\/\S+/g,'[upload session]'));process.exitCode=1});
