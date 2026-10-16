import {resourceMatchesLesson} from './materials.js';

export const lessonFileSlots=[
 {key:'guide-pdf',category:'지도안',label:'지도안 PDF',extensions:['pdf']},
 {key:'guide-hwp',category:'지도안',label:'지도안 한글 원본',extensions:['hwp','hwpx']},
 {key:'ppt-original',category:'PPT',label:'PPT 원본',extensions:['ppt','pptx']},
 {key:'ppt-pdf',category:'PPT',label:'PPT 미리보기 PDF',extensions:['pdf']},
 {key:'worksheet-pdf',category:'활동지',label:'활동지 PDF',extensions:['pdf']},
 {key:'worksheet-hwp',category:'활동지',label:'활동지 한글 원본',extensions:['hwp','hwpx']},
];
export const lessonFileId=(lesson,key)=>`lesson-file-${lesson.group.replace('~','-')}-${key}`;
export const isLessonFile=resource=>resource.id?.startsWith('lesson-file-');
const millis=stamp=>stamp?.toMillis?.()??((stamp?.seconds||0)*1000+(stamp?.nanoseconds||0)/1000000);
const fileLink=file=>file?.url||file?.staticPath;

export function lessonMaterialLibrary(lessons,base,resources,previews){
 const items=new Map();
 for(const lesson of lessons){
  const resolved=resolveLessonFiles(lesson,base,resources,previews);
  for(const file of [resolved.ppt,resolved.worksheet,resolved.guide?.managedLesson?resolved.guide:null].filter(Boolean))items.set(file.id,file);
 }
 for(const file of [...base,...Object.values(resources)].filter(r=>!isLessonFile(r))){
  const extra=!base.some(original=>original.id===file.id)||!['PPT','활동지'].includes(file.type)||!lessons.some(lesson=>resourceMatchesLesson(file,lesson));
  if(extra&&!items.has(file.id))items.set(file.id,file);
 }
 return [...items.values()];
}

export function resolveLessonFiles(lesson,base,resources,previews){
 const saved=Array.isArray(resources)?Object.fromEntries(resources.map(r=>[r.id,r])):resources;
 const linked=[...Object.values(saved).filter(r=>!isLessonFile(r)),...base].filter(r=>resourceMatchesLesson(r,lesson));
 const ppt=linked.find(r=>r.type==='PPT'),worksheet=linked.find(r=>r.type==='활동지');
 const guide=previews[lesson.group];
 const [start,end=start]=lesson.group.split('~').map(Number);
 const groupIds=Array.from({length:end-start+1},(_,i)=>String(start+i));
 const defaults={
  'guide-pdf':guide&&{name:guide.name,staticPath:guide.staticPath},
  'ppt-original':ppt&&{name:ppt.name,staticPath:ppt.staticPath||ppt.url,path:ppt.path},
  'ppt-pdf':ppt?.pdfPath&&{name:ppt.pdfName||'수업 PPT.pdf',staticPath:ppt.pdfPath},
  'worksheet-pdf':worksheet&&{name:worksheet.name,staticPath:worksheet.staticPath||worksheet.url,path:worksheet.path},
  'worksheet-hwp':worksheet?.editablePath&&{name:worksheet.editableName,staticPath:worksheet.editablePath},
 };
 const files=Object.fromEntries(lessonFileSlots.map(slot=>[slot.key,saved[lessonFileId(lesson,slot.key)]||defaults[slot.key]||null]));
 const override=key=>saved[lessonFileId(lesson,key)];
 function pair(category,pdfKey,sourceKey,original){
  const pdf=files[pdfKey],source=files[sourceKey];
  const stale=!!override(sourceKey)&&(!override(pdfKey)||millis(override(pdfKey).updatedAt)<millis(override(sourceKey).updatedAt));
  const pdfUrl=stale?null:fileLink(pdf);
  const changed=!!override(pdfKey)||!!override(sourceKey);
  if(!original&&!pdf&&!source)return null;
  return {...original,id:changed?`lesson-view-${lesson.group}-${category}`:original?.id||`lesson-view-${lesson.group}-${category}`,
   type:category,project:lesson.project,lessonRange:changed?lesson.group:original?.lessonRange||lesson.group,
   lessonIds:changed?groupIds:original?.lessonIds,
   name:category==='PPT'?(source?.name||pdf?.name||'수업 PPT'):(pdf?.name||source?.name||'수업 자료'),
   staticPath:category==='PPT'?fileLink(source):pdfUrl,
   path:category==='PPT'?source?.path:(!pdfUrl&&!source?pdf?.path:null),url:undefined,
   pdfPath:category==='PPT'?pdfUrl:undefined,pdfName:pdf?.name,
   editablePath:category!=='PPT'?fileLink(source):undefined,editableName:category!=='PPT'?source?.name:undefined,
   previewImages:changed?[]:original?.previewImages||[],
   renderPdf:!!pdfUrl&&(changed||!original?.previewImages?.length),
   previewNotice:stale?'한글·PPT 원본이 변경되었습니다. 같은 내용의 PDF를 등록하면 미리보기가 표시됩니다.':undefined,
   managedLesson:changed?lesson.group:undefined};
 }
 return {files,guide:pair('지도안','guide-pdf','guide-hwp',guide),ppt:pair('PPT','ppt-pdf','ppt-original',ppt),worksheet:pair('활동지','worksheet-pdf','worksheet-hwp',worksheet)};
}

export async function validateLessonFile(file,slot){
 if(!file||!file.size)throw Error('비어 있는 파일은 등록할 수 없습니다.');
 if(file.size>50*1024*1024)throw Error('파일은 50MB 이하로 선택해 주세요.');
 if(file.name.length>200)throw Error('파일 이름을 200자 이내로 줄여 주세요.');
 const extension=file.name.split('.').at(-1).toLowerCase();
 if(!slot.extensions.includes(extension))throw Error(`${slot.label}: ${slot.extensions.map(ext=>'.'+ext).join(', ')} 파일을 선택해 주세요.`);
 const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
 const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
 const zip=bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
 const ole=[208,207,17,224,161,177,26,225].every((byte,i)=>bytes[i]===byte);
 if(!(extension==='pdf'?pdf:['pptx','hwpx'].includes(extension)?zip:ole))throw Error(`${file.name}: 파일 형식을 확인해 주세요. 확장자만 바꾼 파일은 등록할 수 없습니다.`);
}

// Upload under fresh paths; publish all six slots in one batch only after uploads finish.
// A failed upload/catalog write cannot replace any currently published material.
export async function saveLessonFiles({lesson,selected,upload,publish,discard,onProgress=()=>{}}){
 const entries=Object.entries(selected).filter(([,file])=>file);
 if(!entries.length)throw Error('등록할 파일을 선택해 주세요.');
 for(const [key,file] of entries){const slot=lessonFileSlots.find(s=>s.key===key);if(!slot)throw Error('알 수 없는 자료 종류입니다.');await validateLessonFile(file,slot);}
 const uploaded=[],rows=[];
 try{
  for(const [key,file] of entries){
   const id=lessonFileId(lesson,key),slot=lessonFileSlots.find(s=>s.key===key);
   const path=`materials/${id}/${crypto.randomUUID()}-${file.name.replace(/[^\p{L}\p{N}._-]/gu,'_')}`;
   uploaded.push(path);
   const url=await upload(path,file,progress=>onProgress((rows.length+progress)/entries.length));
   rows.push({id,value:{name:file.name,description:`${lesson.group}차시 ${slot.label}`,project:lesson.project,lessonId:String(lesson.number),type:slot.label,url,path,size:file.size}});
  }
  await publish(rows);
 }catch(error){await Promise.allSettled(uploaded.map(path=>discard(path)));throw error;}
 onProgress(1);
 return rows;
}
