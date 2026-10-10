import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {policyLearning,enrichPolicy} from '../src/explorer/policy-learning.mjs';
const require=createRequire(import.meta.url),{createClient,asNumber,publicSummary}=require('../functions/sgis.cjs');
const policies=JSON.parse(readFileSync(new URL('../src/explorer/policies.json',import.meta.url),'utf8'));
test('all 63 curated policies have source-linked facts, fictional cases and specific inquiry prompts',()=>{
 const curated=policies.filter(p=>p.curated);assert.equal(curated.length,63);assert.equal(Object.keys(policyLearning).length,63);
 for(const p of curated){const l=policyLearning[p.id];assert.ok(l,p.id);assert.ok(l.summary.length>35,p.id);assert.ok(l.facts.length>=2,p.id);assert.ok(l.facts.every(f=>f.length>15),p.id);assert.ok(l.example.length>20,p.id);assert.ok(l.question.length>20,p.id);const enriched=enrichPolicy(p);assert.equal(enriched.pdf,p.pdf);assert.equal(enriched.page,p.page);}
 const night=policyLearning['plan2025-1'];assert.match(night.summary,/약값/);assert.match(night.facts.join(' '),/새벽 1시/);assert.match(night.facts.join(' '),/1곳/);
 assert.match(policyLearning['guide-38'].facts.join(' '),/서로|달라/);
});
test('suppressed or absent census statistics are not represented as zero',()=>{
 for(const v of [null,undefined,'','N/A','-','비공개'])assert.equal(asNumber(v),null);
 assert.equal(asNumber('0'),0);assert.equal(asNumber('39.5'),39.5);
 assert.equal(publicSummary({tot_ppltn:'N/A'}).total,null);
});
function fakeApi(){const calls=[];const fetcher=async(url)=>{const u=new URL(url);calls.push(u);let result;
 if(u.pathname.endsWith('authentication.json'))result={accessToken:'private-test-token',accessTimeout:Date.now()+3600000};
 else if(u.pathname.endsWith('year/data.json'))result={lin_yr:'2024',tin_yr:['2023','2024']};
 else if(u.pathname.endsWith('hadmarea.geojson'))result={features:[{properties:{adm_cd:'38100120',adm_nm:'경상남도 양산시 물금읍'}}]};
 else if(u.pathname.endsWith('population.json')&&!u.pathname.endsWith('searchpopulation.json'))result=[{adm_cd:'38100120',tot_ppltn:'100',avg_age:'39.5',tot_family:'50'}];
 else result=[{adm_cd:'38100120010001',population:'N/A'},{adm_cd:'38100120010002',population:'97'}];
 return {ok:true,json:async()=>({errCd:0,result})};};return {calls,client:createClient(()=>({serviceId:'private-test-id',securityKey:'private-test-key'}),fetcher)};
}
test('SGIS requests deduplicate and return only public statistics, not credentials or mismatched geometry',async()=>{
 const {client,calls}=fakeApi();const [a,b]=await Promise.all([client.details('25300'),client.details('25300')]);assert.deepEqual(a,b);assert.equal(calls.length,5);assert.equal(a.year,'2024');assert.equal(a.areas.length,2);assert.equal(a.areas[0].total,null);assert.equal(a.areas[1].total,97);assert.ok(!('geometry' in a.areas[0]));assert.equal(a.admCode,'38100120');
 assert.ok(!JSON.stringify(a).includes('private-test'));await client.details('25300','2024');assert.equal(calls.length,5);
});
test('unsupported district and year cannot be used as an arbitrary upstream proxy',async()=>{
 const {client,calls}=fakeApi();await assert.rejects(client.details('99999'),/invalid-district/);assert.equal(calls.length,0);await assert.rejects(client.details('25300','2030'),/invalid-year/);assert.equal(calls.length,2);
});
test('SGIS credentials do not occur in shipped client assets',()=>{
 let secrets=[];try{const env=readFileSync(new URL('../.env.local',import.meta.url),'utf8');secrets=env.split(/\r?\n/).filter(l=>/^SGIS_(SERVICE_ID|SECURITY_KEY)=/.test(l)).map(l=>l.slice(l.indexOf('=')+1).trim()).filter(Boolean);}catch{}
 for(const name of readdirSync(new URL('../dist/assets',import.meta.url))){const text=readFileSync(new URL('../dist/assets/'+name,import.meta.url),'utf8');for(const secret of secrets)assert.ok(!text.includes(secret),'client secret exposure');}
});
