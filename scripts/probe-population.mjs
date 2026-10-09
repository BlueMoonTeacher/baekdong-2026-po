import fs from 'node:fs/promises';
const txt=(await fs.readFile('api-key.txt','utf8')).trim();const matches=txt.match(/[A-Za-z0-9%+\/=_-]{40,}/g)||[];let key=matches.sort((a,b)=>b.length-a.length)[0]||txt;try{key=decodeURIComponent(key)}catch{}
for(const name of ['region','town','age','year']){
 const spec=JSON.parse(await fs.readFile('수업 웹앱 프로젝트/source/'+name+'-spec.json'));const op=spec.swaggerOprtinVOs[0];console.log(name,JSON.stringify({params:op.reqList.map(x=>[x.paramtrNm,x.paramtrBassValue]),fields:op.resList.find(x=>x.paramtrNm==='data')?.subParam?.map(x=>[x.paramtrNm,x.paramtrDc])}));
 const url=new URL('https://'+spec.host+'/'+op.operationId);for(const p of op.reqList)url.searchParams.set(p.paramtrNm,p.paramtrNm==='serviceKey'?key:p.paramtrBassValue);url.searchParams.set('numOfRows','1000');if(name==='year'){url.searchParams.set('start_year','2015');url.searchParams.set('end_year','2026');}else{url.searchParams.set('start_ym','202501');url.searchParams.set('end_ym','202609');}
 try{const res=await fetch(url,{signal:AbortSignal.timeout(30000)});const raw=await res.text();const clean=raw.split(key).join('[redacted]');await fs.writeFile('수업 웹앱 프로젝트/source/'+name+'-response.json',clean);console.log(name,res.status,clean.slice(0,1600));}catch{console.log(name,'connection failed');}
}
const city=await(await fetch('https://www.yangsan.go.kr/portal/contents.do?mid=0411050000')).text();await fs.writeFile('수업 웹앱 프로젝트/source/city.html',city);console.log(city.split('\n').filter(x=>/인구정책|생애주기/.test(x)).map(x=>x.trim()).join('\n').slice(0,2500));
