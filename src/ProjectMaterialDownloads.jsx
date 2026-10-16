import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Download,FolderDown,X,CheckCircle2} from 'lucide-react';
import {ref,getDownloadURL} from 'firebase/storage';
import {storage} from './firebase';
import {projects} from './domain';
import {bundleKinds,projectBundleFiles,streamMaterialArchive} from './project-material-bundles';
import './project-material-downloads.css';

const sizeText=bytes=>bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)}MB`:`${Math.ceil(bytes/1024)}KB`;
async function* fileChunks(file,signal){
 const url=file.url||await getDownloadURL(ref(storage,file.path));
 const response=await fetch(url,{signal});
 if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw Error(`${file.name} 파일을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.`);
 if(!response.body){yield new Uint8Array(await response.arrayBuffer());return;}
 const reader=response.body.getReader();
 try{while(true){const {value,done}=await reader.read();if(done)break;yield value;}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export default function ProjectMaterialDownloads({lessons,base,resources,previews}){
 const [active,setActive]=useState(null),[progress,setProgress]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const controller=useRef(null),lastUpdate=useRef(0),mounted=useRef(true);
 const scopes=useMemo(()=>[{id:0,name:'전체 프로젝트',range:'1–30차시'},...projects].map(scope=>({...scope,bundles:Object.fromEntries(bundleKinds.map(kind=>[kind.key,projectBundleFiles({lessons,base,resources,previews,project:scope.id,kind:kind.key})]))})),[lessons,base,resources,previews]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(!active)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[active]);
 async function download(scope,kind){
  if(controller.current)return;
  const abort=new AbortController();controller.current=abort;const files=scope.bundles[kind.key];
  const label=`${scope.id?`프로젝트${scope.id}`:'전체프로젝트'}_${kind.label.replace(' ','')}`;
  const filename=`인구교육_${label}.zip`,chunks=[];let destination;
  setActive({scope:scope.id,kind:kind.key,label:`${scope.id?`프로젝트 ${scope.id}`:'전체 프로젝트'} · ${kind.label}`});setError('');setMessage('');setProgress({completed:0,total:files.length,bytes:0,file:''});
  try{
   // Open the save dialog inside the click gesture, before fetching a large PPT bundle.
   if(files.reduce((sum,file)=>sum+(file.size||0),0)>=100*1024*1024&&typeof window.showSaveFilePicker==='function'){
    try{const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'ZIP 묶음 파일',accept:{'application/zip':['.zip']}}]});destination=await handle.createWritable();}
    catch(e){if(e.name!=='SecurityError')throw e;}
   }
   await streamMaterialArchive(files,{signal:abort.signal,openFile:fileChunks,
    write:chunk=>destination?destination.write(chunk):chunks.push(chunk),
    onProgress:value=>{if(mounted.current&&(performance.now()-lastUpdate.current>150||value.completed===value.total)){lastUpdate.current=performance.now();setProgress(value);}}});
   if(destination)await destination.close();
   else{
    const url=URL.createObjectURL(new Blob(chunks,{type:'application/zip'}));
    const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
   }
   if(mounted.current)setMessage(`${filename} · ${files.length}개 파일을 묶었습니다.`);
  }catch(e){
   if(destination)await destination.abort().catch(()=>{});
   if(mounted.current){if(e.name==='AbortError')setMessage('묶음 다운로드를 취소했습니다.');else setError(e.message||'묶음 파일을 만들지 못했습니다. 다시 시도해 주세요.');}
  }finally{chunks.length=0;controller.current=null;if(mounted.current){setActive(null);setProgress(null);}}
 }
 return <section className="project-material-downloads" aria-labelledby="bundle-downloads-title">
  <header><FolderDown size={23}/><div><h3 id="bundle-downloads-title">프로젝트 자료 묶음 다운로드</h3><p>PPT는 원본, 활동지·지도안은 PDF와 등록된 한글 원본을 ZIP으로 받습니다. 공유 자료는 중복 없이 담습니다.</p></div></header>
  <div className="project-bundle-rows">{scopes.map(scope=><div className={`project-bundle-row ${!scope.id?'bundle-all-projects':''}`} key={scope.id}>
   <div className="project-bundle-scope"><b>{scope.id?`프로젝트 ${scope.id}`:scope.name}</b><span>{scope.id?scope.name:scope.range}</span></div>
   <div className="project-bundle-buttons">{bundleKinds.map(kind=>{const files=scope.bundles[kind.key],bytes=files.reduce((sum,file)=>sum+(file.size||0),0);return <button className={`secondary bundle-kind-${kind.key}`} type="button" key={kind.key} disabled={!!active||!files.length} aria-label={`${scope.id?`프로젝트 ${scope.id}`:'전체 프로젝트'} ${kind.label} 묶음 다운로드`} onClick={()=>download(scope,kind)}><span><Download size={15}/>{kind.label} 다운</span><small>{files.length}개 파일{bytes>=100*1024*1024?` · 약 ${sizeText(bytes)}`:''}</small></button>;})}</div>
  </div>)}</div>
  {active&&progress&&<div className="project-bundle-progress" role="status"><div><b>{active.label}</b><span>{progress.completed} / {progress.total}개 · {sizeText(progress.bytes)} 받는 중</span></div><progress value={progress.completed} max={progress.total} aria-label="묶음 다운로드 진행"/><p>{progress.file||'저장할 파일을 준비하고 있습니다.'}</p><button className="secondary" type="button" onClick={()=>controller.current?.abort()}><X size={16}/>다운로드 취소</button></div>}
  {error&&<p className="form-error" role="alert">{error} 묶음 파일은 저장하지 않았습니다.</p>}
  {message&&<p className="project-bundle-message" role="status"><CheckCircle2 size={17}/>{message}</p>}
 </section>;
}
