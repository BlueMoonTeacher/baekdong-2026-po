import fs from 'node:fs/promises';
for(const name of ['region','age','year']){const x=JSON.parse(await fs.readFile('수업 웹앱 프로젝트/source/'+name+'-response.json'));console.log(name,x.data?.length, x.data?.at(-1));}
for(const id of ['0401150100','0401150200']){const h=await(await fetch('https://www.yangsan.go.kr/portal/contents.do?mid='+id)).text();await fs.writeFile('수업 웹앱 프로젝트/source/policy-'+id+'.html',h);console.log(id,h.split('\n').filter(x=>/2025|2026|fileDown|download|\.pdf|가이드북|생애주기|시행계획/.test(x)&&!/submenu|title_/.test(x)).map(x=>x.trim()).join('\n').slice(-5000));}
