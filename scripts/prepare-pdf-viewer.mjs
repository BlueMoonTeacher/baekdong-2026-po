import {copyFileSync,mkdirSync,readFileSync,readdirSync} from 'node:fs';
const source=new URL('../node_modules/pdfjs-dist/',import.meta.url);
const {version}=JSON.parse(readFileSync(new URL('package.json',source),'utf8'));
const destination=new URL(`../public/pdfjs/${version}/`,import.meta.url);
mkdirSync(destination,{recursive:true});
for(const folder of ['cmaps','standard_fonts','wasm']){
 const target=new URL(folder+'/',destination);
 mkdirSync(target,{recursive:true});
 for(const name of readdirSync(new URL(folder+'/',source)))copyFileSync(new URL(folder+'/'+name,source),new URL(name,target));
}
copyFileSync(new URL('LICENSE',source),new URL('LICENSE',destination));
console.log(`PDF viewer assets ready (${version}).`);
