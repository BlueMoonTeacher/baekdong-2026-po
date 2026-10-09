const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const text=fs.readFileSync('api-key.txt','utf8').trim();let key=(text.match(/[A-Za-z0-9%+\/=_-]{40,}/g)||[text]).sort((a,b)=>b.length-a.length)[0];try{key=decodeURIComponent(key);}catch{}
const cli=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/bin/firebase.js');
const r=spawnSync(process.execPath,[cli,'functions:secrets:set','YANGSAN_DATA_KEY','--data-file','-','--project','baekdong-population-2026','--non-interactive'],{input:key,encoding:'utf8'});
process.stdout.write((r.stdout||'').split(key).join('[redacted]'));process.stderr.write((r.stderr||'').split(key).join('[redacted]'));process.exitCode=r.status||0;
