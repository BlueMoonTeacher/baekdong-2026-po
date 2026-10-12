import {zipSync} from 'fflate';

// Prefer the editable worksheet; its PDF remains available in the preview.
export async function createMaterialsArchive(resources,loadBytes){
 const originals=resources.map(r=>r.editablePath?{...r,name:r.editableName||r.name,staticPath:r.editablePath}:r);
 const loaded=await Promise.all(originals.map(async r=>({name:r.name.replace(/[\\/]/g,'_'),bytes:await loadBytes(r)})));
 const files=Object.create(null);
 for(const {name,bytes} of loaded){
  if(!bytes.length)throw new Error(`${name} 파일이 비어 있습니다. 다시 시도해 주세요.`);
  files[name]=bytes;
 }
 if(!loaded.length)throw new Error('내려받을 수업자료가 없습니다.');
 return zipSync(files,{level:0});
}
