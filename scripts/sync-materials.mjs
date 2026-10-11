import {mkdir,readdir,readFile,copyFile,writeFile,unlink,stat,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {publishedOriginal} from '../src/material-storage.js';
const folder=path.resolve('추가자료');
await mkdir(folder,{recursive:true});await mkdir('public/materials/added',{recursive:true});
const resources=[];
const storageCatalog=JSON.parse(await readFile(path.join(folder,'수업자료Storage목록.json'),'utf8'));
function cloudOriginal(relative){
 const original=publishedOriginal(storageCatalog,relative.replaceAll('\\','/'));
 if(!original)throw new Error(`Publish material before building: ${relative}`);
 return original;
}
let reviewed=null;
try {reviewed=JSON.parse(await readFile(path.join(folder,'수업자료등록목록.json'),'utf8'));}
catch(error) {if(error.code!=='ENOENT')throw error;}
function sourcePath(relative){
 const resolved=path.resolve(folder,relative);
 if(!resolved.startsWith(folder+path.sep))throw new Error('Material source is outside 추가자료');
 return resolved;
}
async function addFile(relative,metadata) {
 const source=sourcePath(relative);
 const id=metadata.id||'local-'+createHash('sha256').update(relative.replaceAll('\\','/')).digest('hex').slice(0,16);
 if(!/^local-[a-f0-9]{16}$/.test(id))throw new Error('Invalid material ID');
 const file=id+path.extname(relative).toLowerCase();
 const cloud=/\.(pptx?|hwpx?)$/i.test(relative)?cloudOriginal(relative):null;
 if(!cloud)await copyFile(source,path.join('public/materials/added',file));
 const {editableFile,pdfFile,previewFiles,...details}=metadata;
 const extra={};
 if(editableFile){
  const editable=cloudOriginal(editableFile);
  extra.editablePath=editable.url;extra.editableName=editable.name;
  extra.editableStorageObject=editable.object;extra.editableSha256=editable.sha256;
 }
 if(pdfFile){
  const pdf=id+'.pdf';
  await copyFile(sourcePath(pdfFile),path.join('public/materials/added',pdf));
  extra.pdfPath='/materials/added/'+pdf;extra.pdfName=path.basename(pdfFile);
 }
 if(previewFiles?.length){
  const previewId=details.previewVersion?`${id}-pdf-${details.previewVersion}`:id;
  if(!/^local-[a-f0-9]{16}(?:-pdf-[a-f0-9]{12})?$/.test(previewId))throw new Error('Invalid preview version');
  const destination=path.join('public/materials/previews',previewId);await mkdir(destination,{recursive:true});
  extra.previewImages=[];
  for(const [index,preview] of previewFiles.entries()){
   if(!/\.(png|jpe?g|webp)$/i.test(preview))throw new Error('Invalid preview image');
   const name=`page-${index+1}${path.extname(preview).toLowerCase()}`;
   await copyFile(sourcePath(preview),path.join(destination,name));
   extra.previewImages.push('/materials/previews/'+previewId+'/'+name);
  }
 }
 resources.push({...details,...extra,id,sourceFile:relative.replaceAll('\\','/'),name:path.basename(relative),size:cloud?cloud.size:(await stat(source)).size,staticPath:cloud?cloud.url:'/materials/added/'+file,...cloud?{storageObject:cloud.object,storageSha256:cloud.sha256}:{}});
}
for(const entry of await readdir(folder,{withFileTypes:true})) {
 if(!entry.isFile()||! /\.(hwp|hwpx|ppt|pptx|pdf|doc|docx|xls|xlsx|zip|png|jpe?g|webp)$/i.test(entry.name))continue;
 if(reviewed?.excludeTopLevel?.includes(entry.name))continue;
 const number=entry.name.match(/(?:^|[_\s-])(\d{1,2})차시/);const n=number?Number(number[1]):null;
 const explicitProject=entry.name.match(/P([123])[_\s-]/i);
 const project=n&&n<=30?Math.ceil(n/10):explicitProject?Number(explicitProject[1]):0;
 await addFile(entry.name,{type:/\.pptx?$/i.test(entry.name)?'PPT':entry.name.includes('활동지')?'활동지':'참고 자료',project,lessonId:n&&n<=30?String(n):'',description:'학년 공용 수업 자료'});
}
// Register only the explicitly reviewed worksheet manifest. Integrated originals
// and the still-unreviewed PPT folder must not be registered by recursive scanning.
const worksheetFolder='2차년도 활동지/차시별 활동지';
let worksheets=[];
if(!reviewed){
try {worksheets=JSON.parse(await readFile(path.join(folder,worksheetFolder,'등록목록.json'),'utf8'));}
catch(error) {if(error.code!=='ENOENT')throw error;}
}
for(const row of worksheets) {
 const ids=row.lessonIds?.map(String);
 if(!ids?.length||ids.some(id=>!/^\d+$/.test(id)||Number(id)<1||Number(id)>30||Math.ceil(Number(id)/10)!==row.project)||new Set(ids).size!==ids.length||path.basename(row.file)!==row.file||!row.file.endsWith('.hwpx'))throw new Error('Invalid worksheet registration: '+row.file);
 await addFile(path.join(worksheetFolder,row.file),{type:row.type,project:row.project,lessonId:ids[0],lessonIds:ids,lessonRange:row.lessonRange,description:row.description});
}
for(const {file,...row} of reviewed?.files||[]){
 const ids=row.lessonIds?.map(String);
 if(!ids?.length||new Set(ids).size!==ids.length||ids.some(id=>!/^\d+$/.test(id)||Number(id)<1||Number(id)>30||Math.ceil(Number(id)/10)!==row.project))throw new Error('Invalid reviewed lesson registration: '+file);
 await addFile(file,{...row,lessonId:ids[0],lessonIds:ids});
}
resources.sort((a,b)=>a.project-b.project||Number(a.lessonId)-Number(b.lessonId)||a.name.localeCompare(b.name,'ko'));
await writeFile('src/local-resources.json',JSON.stringify(resources,null,2));
const common=[];
for(const {file,pdfFile,...details} of JSON.parse(await readFile(path.join(folder,'공통자료등록목록.json'),'utf8'))){
 const original=cloudOriginal(file),item={...details,sourceFile:file,project:0,lessonId:'',staticPath:original.url,storageObject:original.object,storageSha256:original.sha256,size:original.size};
 if(pdfFile){await copyFile(sourcePath(pdfFile),'public/materials/lesson-plan.pdf');item.pdfPath='/materials/lesson-plan.pdf';}
 common.push(item);
}
await writeFile('src/common-materials.json',JSON.stringify(common,null,2));
for(const name of ['lesson-plan.hwpx','project-plan.hwpx']){
 try{await unlink(path.resolve('public/materials',name));}catch(error){if(error.code!=='ENOENT')throw error;}
}
const generated=path.resolve('public/materials/added');
const keep=new Set(resources.map(r=>path.basename(r.staticPath)));
for(const r of resources)if(r.editablePath)keep.add(path.basename(r.editablePath));
for(const r of resources)if(r.pdfPath)keep.add(path.basename(r.pdfPath));
for(const entry of await readdir(generated,{withFileTypes:true})) {
 if(!entry.isFile()||!/^local-[a-f0-9]{16}\.[a-z0-9]+$/.test(entry.name)||keep.has(entry.name))continue;
 const target=path.resolve(generated,entry.name);
 if(path.dirname(target)!==generated)throw new Error('Generated file path is outside the materials directory');
 await unlink(target); // Generated copy only; the source in 추가자료 is never deleted.
}
const previewRoot=path.resolve('public/materials/previews');
const activePreviewFolders=new Set(resources.flatMap(r=>r.previewImages||[]).map(url=>path.basename(path.dirname(url))));
for(const entry of await readdir(previewRoot,{withFileTypes:true})){
 if(!entry.isDirectory()||!/^local-[a-f0-9]{16}(?:-pdf-[a-f0-9]{12})?$/.test(entry.name)||activePreviewFolders.has(entry.name))continue;
 const target=path.resolve(previewRoot,entry.name);
 if(path.dirname(target)!==previewRoot||!previewRoot.startsWith(path.resolve('public')+path.sep))throw new Error('Preview cleanup outside generated folder');
 await rm(target,{recursive:true,force:true}); // Only obsolete generated preview copies.
}
console.log(`추가자료 ${resources.length}개를 자료실에 연결했습니다.`);
