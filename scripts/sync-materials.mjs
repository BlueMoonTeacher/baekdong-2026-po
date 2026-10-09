import {mkdir,readdir,readFile,copyFile,writeFile,unlink,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const folder=path.resolve('추가자료');
await mkdir(folder,{recursive:true});await mkdir('public/materials/added',{recursive:true});
const resources=[];
async function addFile(relative,metadata) {
 const source=path.resolve(folder,relative);
 if(!source.startsWith(folder+path.sep))throw new Error('Material source is outside 추가자료');
 const id='local-'+createHash('sha256').update(relative.replaceAll('\\','/')).digest('hex').slice(0,16);
 const file=id+path.extname(relative).toLowerCase();
 await copyFile(source,path.join('public/materials/added',file));
 resources.push({...metadata,id,name:path.basename(relative),size:(await stat(source)).size,staticPath:'/materials/added/'+file});
}
for(const entry of await readdir(folder,{withFileTypes:true})) {
 if(!entry.isFile()||! /\.(hwp|hwpx|ppt|pptx|pdf|doc|docx|xls|xlsx|zip|png|jpe?g|webp)$/i.test(entry.name))continue;
 const number=entry.name.match(/(?:^|[_\s-])(\d{1,2})차시/);const n=number?Number(number[1]):null;
 const explicitProject=entry.name.match(/P([123])[_\s-]/i);
 const project=n&&n<=30?Math.ceil(n/10):explicitProject?Number(explicitProject[1]):0;
 await addFile(entry.name,{type:/\.pptx?$/i.test(entry.name)?'PPT':entry.name.includes('활동지')?'활동지':'참고 자료',project,lessonId:n&&n<=30?String(n):'',description:'학년 공용 수업 자료'});
}
// Register only the explicitly reviewed worksheet manifest. Integrated originals
// and the still-unreviewed PPT folder must not be registered by recursive scanning.
const worksheetFolder='2차년도 활동지/차시별 활동지';
let worksheets=[];
try {worksheets=JSON.parse(await readFile(path.join(folder,worksheetFolder,'등록목록.json'),'utf8'));}
catch(error) {if(error.code!=='ENOENT')throw error;}
for(const row of worksheets) {
 const ids=row.lessonIds?.map(String);
 if(!ids?.length||ids.some(id=>!/^\d+$/.test(id)||Number(id)<1||Number(id)>30||Math.ceil(Number(id)/10)!==row.project)||new Set(ids).size!==ids.length||path.basename(row.file)!==row.file||!row.file.endsWith('.hwpx'))throw new Error('Invalid worksheet registration: '+row.file);
 await addFile(path.join(worksheetFolder,row.file),{type:row.type,project:row.project,lessonId:ids[0],lessonIds:ids,lessonRange:row.lessonRange,description:row.description});
}
resources.sort((a,b)=>a.project-b.project||Number(a.lessonId)-Number(b.lessonId)||a.name.localeCompare(b.name,'ko'));
await writeFile('src/local-resources.json',JSON.stringify(resources,null,2));
const generated=path.resolve('public/materials/added');
const keep=new Set(resources.map(r=>path.basename(r.staticPath)));
for(const entry of await readdir(generated,{withFileTypes:true})) {
 if(!entry.isFile()||!/^local-[a-f0-9]{16}\.[a-z0-9]+$/.test(entry.name)||keep.has(entry.name))continue;
 const target=path.resolve(generated,entry.name);
 if(path.dirname(target)!==generated)throw new Error('Generated file path is outside the materials directory');
 await unlink(target); // Generated copy only; the source in 추가자료 is never deleted.
}
console.log(`추가자료 ${resources.length}개를 자료실에 연결했습니다.`);
