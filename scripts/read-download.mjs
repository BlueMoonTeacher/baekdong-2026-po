import fs from 'node:fs/promises';
const s=await(await fetch('https://www.yangsan.go.kr/common/js/lib.js')).text();await fs.writeFile('수업 웹앱 프로젝트/source/lib.js',s);const i=s.indexOf('download:');console.log(s.slice(i,i+2200));console.log(s.split('\n').filter(x=>/download.do|atchFileId|fileSn|download\s*[:=]/.test(x)).join('\n').slice(0,2200));
