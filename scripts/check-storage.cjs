const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const {configstore}=require(path.join(root,'configstore.js'));
const api=require(path.join(root,'apiv2.js'));const tokens=configstore.get('tokens');
api.setRefreshToken(tokens.refresh_token);api.setAccessToken(tokens.access_token);
const c=new api.Client({urlPrefix:'https://storage.googleapis.com'});
const bucket='baekdong-population-2026.firebasestorage.app';
const object=`materials/qa-${crypto.randomUUID()}/download-check.zip`;
const expected=Buffer.from('504b0506000000000000000000000000000000000000','hex'); // Empty ZIP, no user data.
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 let uploaded=false;
 try {
  await c.request({method:'POST',path:`/upload/storage/v1/b/${bucket}/o`,queryParams:{uploadType:'media',name:object},body:require('node:stream').Readable.from([expected]),headers:{'Content-Type':'application/zip'},responseType:'json'});uploaded=true;
  const url=`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`;
  const r=await fetch(url,{headers:{Origin:'https://baekdong-population-2026.web.app'}});
  if(!r.ok)throw new Error(`Public download returned ${r.status}`);
  const actual=Buffer.from(await r.arrayBuffer());
  if(hash(actual)!==hash(expected))throw new Error('Download checksum mismatch');
  if(r.headers.get('access-control-allow-origin')!=='https://baekdong-population-2026.web.app')throw new Error('Download CORS origin mismatch');
  console.log('Storage public download, file integrity, and browser CORS verified.');
 } finally {
  if(uploaded){await c.delete(`/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}`);console.log('Temporary storage verification file removed.');}
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
