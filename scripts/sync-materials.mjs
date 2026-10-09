import {mkdir,readdir,copyFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const folder=path.resolve('추가자료');
await mkdir(folder,{recursive:true});await mkdir('public/materials/added',{recursive:true});
const resources=[];
for(const entry of await readdir(folder,{withFileTypes:true})) {
 if(!entry.isFile()||! /\.(hwp|hwpx|ppt|pptx|pdf|doc|docx|xls|xlsx|zip|png|jpe?g|webp)$/i.test(entry.name))continue;
 const number=entry.name.match(/(?:^|[_\s-])(\d{1,2})차시/);const n=number?Number(number[1]):null;
 const explicitProject=entry.name.match(/P([123])[_\s-]/i);
 const project=n&&n<=30?Math.ceil(n/10):explicitProject?Number(explicitProject[1]):0;
 const id='local-'+createHash('sha256').update(entry.name).digest('hex').slice(0,16);
 const file=id+path.extname(entry.name).toLowerCase();
 await copyFile(path.join(folder,entry.name),path.join('public/materials/added',file));
 resources.push({id,name:entry.name,type:/\.pptx?$/i.test(entry.name)?'PPT':entry.name.includes('활동지')?'활동지':'참고 자료',project,lessonId:n&&n<=30?String(n):'',staticPath:'/materials/added/'+file,description:'학년 공용 수업 자료'});
}
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
