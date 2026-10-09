import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {ageGroups,proposalText,pct} from '../src/explorer/domain.mjs';
const require=createRequire(import.meta.url);const {normalize}=require('../functions/population.cjs');
const snapshot=JSON.parse(await readFile(new URL('../public/explore/population.json',import.meta.url)));
const policies=JSON.parse(await readFile(new URL('../src/explorer/policies.json',import.meta.url)));
test('published snapshot never replaces missing statistics with zero and keeps scope totals consistent',()=>{
 for(const period of snapshot.periods){const rows=snapshot.region.filter(x=>x.period===period);assert.equal(rows.length,13);assert.equal(new Set(rows.map(x=>x.code)).size,13);for(const r of rows){assert.ok(Number.isFinite(r.total)&&r.total>0);assert.equal(r.male+r.female,r.total);if(r.code==='53000')assert.equal(r.derived,true);}}
 for(const age of snapshot.ages){assert.equal(age.bands.reduce((s,x)=>s+x.total,0),age.total);assert.equal(snapshot.region.filter(x=>x.period===age.period).reduce((s,x)=>s+x.total,0),age.total);assert.equal(ageGroups(age.bands).reduce((s,x)=>s+x.total,0),age.total);}
 assert.equal(snapshot.ages.some(x=>x.period==='2026-09'),false,'provider September age mismatch must stay excluded');
 assert.equal(snapshot.periods.includes('2026-04'),false,'incomplete provider month must stay excluded');
});
test('incomplete regional responses cannot produce a fabricated city snapshot',()=>{
 assert.throws(()=>normalize({region:[{year:'2026',month:'09',cl_han_code:'25300',cl_han_nm:'물금읍',popltn_sm:'10',popltn_male:'5',popltn_female:'5'}],age:[],town:[],year:[]}),/no-complete-month/);
});
test('policy summaries retain year, exact source page and material conflicts',()=>{
 assert.equal(policies.filter(p=>p.year===2025).length,17);assert.equal(policies.filter(p=>p.year===2026).length,131);assert.equal(policies.filter(p=>p.year===2026&&p.curated).length,46);
 const child=policies.find(p=>p.title==='아동수당 지원');assert.equal(child.conflict,true);assert.match(child.high,/8세 미만/);assert.match(child.high,/9세 미만/);
 for(const p of policies){assert.ok(p.page>0&&p.page<=95);assert.ok(p.pdf.startsWith('/explore/'));assert.ok(p.target&&p.high&&p.low);}
});
test('proposal exports preserve frozen evidence dates and policy source pages',()=>{
 const text=proposalText({title:'돌봄 제안',region:'원동면'},[{text:'2026년 9월 인구',source:'공공데이터포털',period:'2026-09',fetchedAt:'2026-10-09'}],[policies[0]]);
 assert.match(text,/2026-09/);assert.match(text,/2026-10-09/);assert.match(text,/#page=/);assert.match(text,/현장 조사/);assert.equal(pct(10,0),0);
});
test('API secret is absent from every public deploy asset and function source',async t=>{
 let raw;try{raw=(await readFile(new URL('../api-key.txt',import.meta.url),'utf8')).trim();}catch(e){if(e.code==='ENOENT'){t.skip('Local credential file is intentionally excluded from Git.');return;}throw e;}let secret=(raw.match(/[A-Za-z0-9%+\/=_-]{40,}/g)||[raw]).sort((a,b)=>b.length-a.length)[0];try{secret=decodeURIComponent(secret)}catch{}
 assert.ok(secret.length>=30);
 const {readdir}=await import('node:fs/promises');async function check(dir){for(const x of await readdir(dir,{withFileTypes:true})){const file=new URL(x.name+(x.isDirectory()?'/':''),dir);if(x.isDirectory())await check(file);else assert.equal((await readFile(file)).includes(Buffer.from(secret)),false,'credential must not be present in deploy assets');}}
 await check(new URL('../dist/',import.meta.url));assert.equal((await readFile(new URL('../functions/index.cjs',import.meta.url),'utf8')).includes(secret),false);
});
