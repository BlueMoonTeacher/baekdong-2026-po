import fs from 'node:fs/promises';
for(const name of ['town','age','year','region']){
 const s=await fs.readFile('수업 웹앱 프로젝트/source/'+name+'.html','utf8');const raw=s.match(/const swaggerJson = `([\s\S]*?)`;/)[1];const spec=JSON.parse(raw.replace(/\\\\/g,'\\'));
 await fs.writeFile('수업 웹앱 프로젝트/source/'+name+'-spec.json',JSON.stringify(spec,null,2));
 console.log(name,spec.host,spec.swaggerOprtinVOs.map(x=>({params:x.reqList.map(p=>[p.paramtrNm,p.paramtrBassValue]),fields:x.resList.find(x=>x.paramtrNm==='data')?.subParam?.map(x=>[x.paramtrNm,x.paramtrDc])})));
}
const geo=await (await fetch('https://raw.githubusercontent.com/vuski/admdongkor/master/ver20260701/HangJeongDong_ver20260701.geojson')).json();const features=geo.features.filter(x=>x.properties.adm_nm.includes('양산시'));await fs.writeFile('수업 웹앱 프로젝트/source/yangsan.geojson',JSON.stringify({type:'FeatureCollection',features}));console.log('districts',features.map(x=>x.properties));
const license=await (await fetch('https://raw.githubusercontent.com/vuski/admdongkor/master/LICENSE-DATA')).text();await fs.writeFile('public/explore/MAP-LICENSE.txt',license);console.log('license',license.slice(0,1700));
