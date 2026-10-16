import {Zip,ZipPassThrough} from 'fflate';
import {resolveLessonFiles} from './lesson-files.js';

export const bundleKinds=[{key:'ppt',label:'PPT'},{key:'worksheet',label:'활동지'},{key:'guide',label:'지도안'},{key:'all',label:'모든 자료'}];
const safeName=name=>(name||'수업자료').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/[. ]+$/,'')||'수업자료';
const identity=url=>{const value=new URL(url,'http://localhost');value.searchParams.delete('token');return value.href;};

// Shared lesson files appear once per project/category; a replacement has its own URL.
export function projectBundleFiles({lessons,base,resources,previews,project=0,kind='all'}){
 const result=[],seen=new Set(),names=new Set();
 function add(lesson,category,file){
  if(!file?.url&&!file?.path)return;
  const key=`${lesson.project}:${category}:${file.url?identity(file.url):file.path}`;
  if(seen.has(key))return;
  seen.add(key);
  const folder=`프로젝트${lesson.project}/${category}/`,name=safeName(file.name);
  let archiveName=folder+name,index=2;
  while(names.has(archiveName)){const dot=name.lastIndexOf('.');archiveName=folder+(dot>0?`${name.slice(0,dot)} (${index++})${name.slice(dot)}`:`${name} (${index++})`);}
  names.add(archiveName);result.push({...file,archiveName,project:lesson.project,category});
 }
 for(const lesson of lessons.filter((l,i)=>!i||lessons[i-1].group!==l.group).filter(l=>!project||l.project===project)){
  const resolved=resolveLessonFiles(lesson,base,resources,previews);
  for(const {key,label} of bundleKinds.filter(item=>item.key!=='all'&&(kind==='all'||kind===item.key))){
   const material=resolved[key];if(!material)continue;
   if(key==='ppt'){
    const source=resolved.files['ppt-original'];
    add(lesson,label,{name:material.name,url:material.staticPath,path:material.path,size:source?.size||material.size||0});
   }else{
    add(lesson,label,{name:material.name,url:material.staticPath,path:material.path,size:0});
    if(material.editablePath)add(lesson,label,{name:material.editableName,url:material.editablePath,size:0});
   }
  }
 }
 return result;
}

// Backpressure keeps at most one input chunk waiting for a disk write.
// The caller closes the destination only after this function succeeds.
export async function streamMaterialArchive(files,{openFile,write,signal,onProgress=()=>{}}){
 if(!files.length)throw Error('내려받을 자료가 없습니다.');
 let tail=Promise.resolve(),failure,bytes=0,completed=0;
 const zip=new Zip((error,chunk)=>{if(error){failure=error;return;}tail=tail.then(()=>write(chunk)).catch(error=>{failure=error;});});
 const flush=async()=>{await tail;if(failure)throw failure;signal?.throwIfAborted();};
 try{
  for(const file of files){
   signal?.throwIfAborted();
   onProgress({completed,total:files.length,file:file.name,bytes});
   const entry=new ZipPassThrough(file.archiveName);zip.add(entry);await flush();
   let size=0;
   for await(const chunk of openFile(file,signal)){
    signal?.throwIfAborted();
    const data=chunk instanceof Uint8Array?chunk:new Uint8Array(chunk);
    entry.push(data);size+=data.length;bytes+=data.length;await flush();
    onProgress({completed,total:files.length,file:file.name,bytes});
   }
   if(!size)throw Error(`${file.name} 파일이 비어 있습니다.`);
   entry.push(new Uint8Array(),true);await flush();completed++;
   onProgress({completed,total:files.length,file:file.name,bytes});
  }
  zip.end();await flush();
 }catch(error){zip.terminate();throw error;}
 return {files:completed,bytes};
}
