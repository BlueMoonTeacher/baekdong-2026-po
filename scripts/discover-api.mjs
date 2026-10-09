import fs from 'node:fs/promises';
const root='수업 웹앱 프로젝트/source/';
const urls={town:'https://www.data.go.kr/data/15083467/openapi.do',age:'https://www.data.go.kr/data/15083468/openapi.do',year:'https://www.data.go.kr/data/15083469/openapi.do',region:'https://www.data.go.kr/data/15082066/openapi.do',geo:'https://api.github.com/repos/vuski/admdongkor/contents/ver20260701'};
for(const [name,url] of Object.entries(urls)){const r=await fetch(url); const s=await r.text();await fs.writeFile(root+name+'.html',s);console.log(name,r.status,s.length); if(name==='geo')console.log(s.slice(0,3500));else console.log(s.split('\n').filter(x=>/swagger|jsonUrl|loadApi|openApi.*url|api.*spec|apis.data/i.test(x)).join('\n').slice(0,6500));}
console.log('key file available:',await fs.stat('api-key.txt').then(s=>s.size>0).catch(()=>false));
