import fs from 'node:fs/promises';
const s=await(await fetch('https://www.yangsan.go.kr/portal/contents.do?mid=0406010900')).text();await fs.writeFile('수업 웹앱 프로젝트/source/current-city.html',s);console.log(s.split('\n').filter(x=>/iframe|<script src|data-.*url|2026|강서동|ajax|chart.*\.js/.test(x)).map(x=>x.trim()).join('\n').slice(-5400));
