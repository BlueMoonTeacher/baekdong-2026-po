export const MATERIAL_BUCKET='baekdong-population-2026.firebasestorage.app';
export function publishedOriginal(catalog,sourceFile){
 const entry=catalog.files?.[sourceFile];
 if(!entry)return null;
 if(catalog.bucket!==MATERIAL_BUCKET||!/^materials\/[a-z0-9-]+\/[a-z0-9-]+\.(pptx?|hwpx?)$/.test(entry.object)||!Number.isSafeInteger(entry.size)||entry.size<=0||!/^[a-f0-9]{64}$/.test(entry.sha256)||!/^\d+$/.test(entry.generation))throw new Error('Invalid published material: '+sourceFile);
 return {...entry,bucket:catalog.bucket,url:`https://firebasestorage.googleapis.com/v0/b/${catalog.bucket}/o/${encodeURIComponent(entry.object)}?alt=media`};
}
