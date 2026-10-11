// Optional: restore published originals locally. The web app builds without them.
import {readFile,mkdir,rename,rm} from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {publishedOriginal} from '../src/material-storage.js';
const root=path.resolve('추가자료');
const catalog=JSON.parse(await readFile(path.join(root,'수업자료Storage목록.json'),'utf8'));
async function checksum(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
for(const sourceFile of Object.keys(catalog.files)){
 const entry=publishedOriginal(catalog,sourceFile),target=path.resolve(root,sourceFile);
 if(!target.startsWith(root+path.sep))throw new Error('Restore path outside 추가자료');
 try{if(await checksum(target)===entry.sha256){console.log('Already restored:',sourceFile);continue;}throw new Error('Existing file differs; keep local edits: '+sourceFile);}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const response=await fetch(entry.url);if(!response.ok)throw new Error('Download failed: '+sourceFile);
 await mkdir(path.dirname(target),{recursive:true});const temporary=target+'.download';
 try{
  await pipeline(Readable.fromWeb(response.body),createWriteStream(temporary,{flags:'wx'}));
  if(await checksum(temporary)!==entry.sha256)throw new Error('Restored checksum mismatch: '+sourceFile);
  await rename(temporary,target);console.log('Restored:',sourceFile);
 }catch(error){await rm(temporary,{force:true});throw error;}
}
