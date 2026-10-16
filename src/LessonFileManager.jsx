import React,{useEffect,useRef,useState} from 'react';
import {Download,FilePenLine,Upload,CheckCircle2,Search,X} from 'lucide-react';
import {ref,uploadBytesResumable,getDownloadURL,deleteObject} from 'firebase/storage';
import {storage} from './firebase';
import {isMasterUser,projects} from './domain';
import {lessonFileSlots,lessonFileId,resolveLessonFiles,validateLessonFile,saveLessonFiles} from './lesson-files';
import ResourcePreviewButton from './ResourcePreview';
import './lesson-file-manager.css';

export default function LessonFileManager({user,lessons,base,resources,previews,ws,ready,notify}){
 const [group,setGroup]=useState(lessons[0].group),[project,setProject]=useState(0),[search,setSearch]=useState('');
 const [selected,setSelected]=useState({}),[error,setError]=useState(''),[saving,setSaving]=useState(false),[progress,setProgress]=useState(0);
 const [success,setSuccess]=useState(''),[inputVersion,setInputVersion]=useState(0);
 const dirty=Object.values(selected).some(Boolean),working=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!dirty&&!saving)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,saving]);
 if(!isMasterUser(user))return <p role="alert">자료 관리는 관리자 Google 계정으로 로그인한 뒤 이용할 수 있습니다.</p>;
 const rows=lessons.filter((l,i)=>!i||lessons[i-1].group!==l.group);
 const lesson=rows.find(l=>l.group===group),resolved=resolveLessonFiles(lesson,base,resources,previews);
 const visible=rows.filter(l=>(!project||l.project===project)&&`${l.group} ${l.title}`.includes(search.trim()));
 function choose(value){if(saving)return;if(dirty&&!window.confirm('선택한 파일이 아직 등록되지 않았습니다. 선택을 취소하고 다른 차시로 이동할까요?'))return;setGroup(value);setSelected({});setError('');setSuccess('');setInputVersion(v=>v+1);}
 async function selectFile(slot,file){setError('');setSuccess('');if(!file)return;try{await validateLessonFile(file,slot);setSelected(previous=>({...previous,[slot.key]:file}));}catch(e){setError(e.message);}}
 async function save(){
  if(working.current||!ready||!dirty||!isMasterUser(user))return;
  working.current=true;setSaving(true);setProgress(0);setError('');setSuccess('');
  try{
   await saveLessonFiles({lesson,selected,
    upload:(path,file,onProgress)=>new Promise((resolve,reject)=>{
     const task=uploadBytesResumable(ref(storage,path),file,{contentType:file.name.toLowerCase().endsWith('.pdf')?'application/pdf':file.type||'application/octet-stream',contentDisposition:`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`});
     task.on('state_changed',snap=>onProgress(snap.bytesTransferred/snap.totalBytes),reject,()=>getDownloadURL(task.snapshot.ref).then(resolve,reject));
    }),publish:items=>ws.saveMany('resources',items),discard:path=>deleteObject(ref(storage,path)),
    onProgress:value=>{if(mounted.current)setProgress(value);}});
   if(mounted.current){setSelected({});setInputVersion(v=>v+1);setSuccess(`${lesson.group}차시 자료를 등록했습니다. 수업 계획표와 자료실에 반영되었습니다.`);}
   notify(`${lesson.group}차시 자료를 등록했습니다.`);
  }catch(e){if(mounted.current)setError(e.code?.startsWith('storage/')?'파일을 올리지 못했습니다. 로그인 계정과 인터넷 연결을 확인해 주세요.':e.code==='permission-denied'?'자료 등록 권한이 없습니다. 관리자 Google 계정으로 다시 로그인해 주세요.':e.message||'자료를 저장하지 못했습니다. 다시 시도해 주세요.');}
  finally{working.current=false;if(mounted.current)setSaving(false);}
 }
 return <div className="lesson-file-manager">
  <p className="lesson-file-intro"><FilePenLine size={21}/><span>원본을 내려받아 컴퓨터에서 수정한 뒤, 바꿀 파일을 선택하고 <b>선택한 파일 등록</b>을 눌러 주세요. 등록한 자료는 모든 기기에 공유됩니다.</span></p>
  <div className="lesson-file-layout">
   <aside className="lesson-file-sidebar" aria-label="관리할 차시 선택">
    <label>프로젝트<select value={project} disabled={saving} onChange={e=>setProject(Number(e.target.value))}><option value={0}>전체 프로젝트</option>{projects.map(p=><option value={p.id} key={p.id}>프로젝트 {p.id}</option>)}</select></label>
    <label className="lesson-file-search"><Search size={16}/><input aria-label="차시 또는 활동내용 검색" value={search} disabled={saving} onChange={e=>setSearch(e.target.value)} placeholder="차시·활동내용 검색"/></label>
    <div className="lesson-file-list">{visible.map(l=>{const changed=lessonFileSlots.some(slot=>resources[lessonFileId(l,slot.key)]);return <button type="button" key={l.group} aria-pressed={group===l.group} disabled={saving} onClick={()=>choose(l.group)}><span><b>{l.group}차시</b><small>P{l.project}{changed?' · 수정 자료':''}</small></span><span>{l.title}</span></button>;})}{!visible.length&&<p>검색 결과가 없습니다.</p>}</div>
   </aside>
   <section className="lesson-file-editor" aria-label={`${lesson.group}차시 자료 편집`}>
    <header><span className={`badge p${lesson.project}`}>프로젝트 {lesson.project} · {lesson.group}차시</span><h3>{lesson.title}</h3>{lesson.group.includes('~')&&<p>{lesson.group}차시는 함께 사용하는 묶음 자료입니다.</p>}</header>
    <p className="lesson-file-help">PDF는 등록 후 바로 페이지 미리보기가 됩니다. PPT·한글 원본을 수정했다면 같은 내용으로 저장한 PDF도 함께 올려 주세요. 파일당 최대 50MB입니다.</p>
    {!ready&&<p role="status">기존 자료를 불러오는 중입니다. 연결이 완료되면 등록할 수 있습니다.</p>}
    {['지도안','PPT','활동지'].map(category=><section className="lesson-file-category" key={category}><h4>{category}</h4><div className="lesson-file-grid">{lessonFileSlots.filter(slot=>slot.category===category).map(slot=>{
     const current=resolved.files[slot.key],changed=resources[lessonFileId(lesson,slot.key)],pending=selected[slot.key];
     const href=current?.url||current?.staticPath;
     return <div className={`lesson-file-slot ${pending?'has-change':''}`} key={slot.key}>
      <div className="lesson-file-slot-title"><b>{slot.label}</b><small>{changed?'직접 등록':current?'기본 자료':'미등록'}</small></div>
      <p className="lesson-file-current">{current?.name||'아직 등록된 파일이 없습니다.'}</p>
      <div className="lesson-file-slot-actions">{href&&<a className="secondary" href={href} download={current.name} target="_blank" rel="noreferrer"><Download size={15}/>현재 파일</a>}{href&&slot.extensions[0]==='pdf'&&<ResourcePreviewButton resource={{id:lessonFileId(lesson,slot.key),name:current.name,type:category,project:lesson.project,lessonRange:lesson.group,staticPath:category==='PPT'?undefined:href,pdfPath:category==='PPT'?href:undefined,pdfName:current.name,renderPdf:true}} label="미리보기"/>}</div>
      <label className="lesson-file-picker"><Upload size={16}/><span>{pending?'다른 파일 선택':current?'파일 교체':'파일 선택'}</span><input key={inputVersion} type="file" aria-label={`${lesson.group}차시 ${slot.label} 파일 선택`} accept={slot.extensions.map(ext=>'.'+ext).join(',')} disabled={saving||!ready} onChange={e=>{selectFile(slot,e.target.files?.[0]);e.target.value='';}}/></label>
      {pending&&<><div className="lesson-file-pending"><CheckCircle2 size={15}/><span>{pending.name} · 등록 대기</span><button type="button" aria-label={`${slot.label} 선택 취소`} disabled={saving} onClick={()=>setSelected(values=>({...values,[slot.key]:null}))}><X size={15}/></button></div>{slot.extensions[0]==='pdf'&&<SelectedPdf file={pending} lesson={lesson} category={category}/>}</>}
     </div>;
    })}</div></section>)}
    {error&&<p className="form-error" role="alert">{error}</p>}{success&&<p className="lesson-file-success" role="status"><CheckCircle2 size={18}/>{success}</p>}
    <div className="lesson-file-save"><span>{saving?`파일 올리는 중 ${Math.round(progress*100)}%`:dirty?`${Object.values(selected).filter(Boolean).length}개 파일 선택됨`:'교체할 파일을 선택해 주세요.'}</span><button className="primary" type="button" disabled={saving||!dirty||!ready} onClick={save}><Upload size={17}/>{saving?'등록 중…':'선택한 파일 등록'}</button></div>
   </section>
  </div>
 </div>;
}

function SelectedPdf({file,lesson,category}){
 const [url,setUrl]=useState(null);
 useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value);},[file]);
 return url&&<div className="lesson-file-draft-preview"><ResourcePreviewButton resource={{id:`draft-${lesson.group}-${category}`,name:file.name,type:category,project:lesson.project,lessonRange:lesson.group,staticPath:category==='PPT'?undefined:url,pdfPath:category==='PPT'?url:undefined,pdfName:file.name,renderPdf:true}} label="선택한 PDF 확인"/></div>;
}
