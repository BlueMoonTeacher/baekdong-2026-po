import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {ageGroups,proposalText,pct,districtHistory,changeText,populationColor,populationBins,populationBin,changeScale,changePictureUnit,populationPictures} from '../src/explorer/domain.mjs';
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
test('map history stays chronological, respects the selected month and leaves missing months empty',()=>{
 const data={region:[{code:'a',period:'2026-05',total:10},{code:'b',period:'2026-03',total:200},{code:'a',period:'2026-03',total:12},{code:'a',period:'2026-06',total:9},{code:'a',period:'2026-01',total:15}]};
 const original=JSON.stringify(data);
 assert.deepEqual(districtHistory(data,'a','2026-05',2).map(r=>r.period),['2026-03','2026-05']);
 assert.deepEqual(districtHistory(data,'a','2025-12'),[]);
 assert.equal(JSON.stringify(data),original);
});
test('change descriptions and map colors distinguish zero from missing values',()=>{
 assert.equal(changeText(null),'비교 자료 없음');
 assert.equal(changeText(undefined,true),'비교 자료 없음');
 assert.equal(changeText(0,true),'사람 수가 같아요');
 assert.equal(changeText(-12,true),'12명 줄었어요');
 assert.equal(changeText(38),'38명 증가');
 assert.notEqual(populationColor({change:null},'change'),populationColor({change:0},'change'));
 assert.notEqual(populationColor({change:-1},'change'),populationColor({change:1},'change'));
 assert.notEqual(populationColor(null,'population'),populationColor({total:0},'population'));
});
test('six map population bins use exact inclusive lower thresholds and matching legend colors',()=>{
 assert.equal(populationBins.length,6);
 for(const [value,index] of [[0,0],[4999,0],[5000,1],[9999,1],[10000,2],[19999,2],[20000,3],[49999,3],[50000,4],[99999,4],[100000,5],[117251,5]]){assert.equal(populationBin(value),populationBins[index]);assert.equal(populationColor({total:value},'population'),populationBins[index].color);}
 for(const invalid of [null,undefined,NaN,-1,Infinity])assert.equal(populationBin(invalid),null);
 assert.equal(new Set(populationBins.map(b=>b.color)).size,6);
});
test('change-only charts have a symmetric zero-centered scale without treating missing data as zero',()=>{
 assert.equal(changeScale([-99,-30,-53,-48,-34,-18]),100);
 assert.equal(changeScale([-121,38,null,undefined,NaN]),200);
 assert.equal(changeScale([0,0]),1);assert.equal(changeScale([null,undefined]),1);
 assert.equal(changeScale([-0.5,0.2]),0.5);
 for(const value of [-495,495,0,38,8000,117251]){const unit=changePictureUnit(value);assert.ok(Math.ceil(Math.abs(value)/unit)<=40);assert.equal(unit,changePictureUnit(-value));}
 assert.equal(changePictureUnit(38),1);assert.equal(changePictureUnit(-495),100);assert.equal(changePictureUnit(null),null);
});
test('themed pictogram images and local font are shipped with their licenses',async()=>{
 for(const name of ['all','common','birth','baby','child','youth','middle','senior','growth','voice','research']){const svg=await readFile(new URL(`../public/explore/pictograms/${name}.svg`,import.meta.url),'utf8');assert.match(svg,/viewBox="0 0 64 64"/);assert.match(svg,/#(009f43|d20b19|003c96)/);assert.doesNotMatch(svg,/width="17"|x="43" y="3"/,'decorative heart badges must be absent');}
 const font=await readFile(new URL('../public/explore/fonts/PretendardVariable.woff2',import.meta.url));assert.equal(font.subarray(0,4).toString(),'wOF2');
 assert.match(await readFile(new URL('../public/explore/fonts/OFL-LICENSE.txt',import.meta.url),'utf8'),/SIL OPEN FONT LICENSE/);
 assert.match(await readFile(new URL('../public/explore/pictograms/LUCIDE-LICENSE',import.meta.url),'utf8'),/ISC/);
});
test('mixed population pictures use the same thousand and ten-thousand units for every district',()=>{
 for(const total of [0,1,999,1000,3039,9999,10000,25502,117251]){
  const pictures=populationPictures(total);
  assert.ok(Math.abs(pictures.reduce((sum,p)=>sum+p.unit*p.fraction,0)-total)<1e-8);
  assert.equal(pictures.filter(p=>p.unit===10000).length,Math.floor(total/10000));
  assert.ok(pictures.filter(p=>p.unit===1000).length<=10);
  for(const p of pictures)assert.ok(p.fraction>0&&p.fraction<=1);
 }
 assert.equal(populationPictures(117251).length,19);
 assert.equal(populationPictures(3039).length,4);
 for(const invalid of [null,undefined,NaN,Infinity,-1])assert.deepEqual(populationPictures(invalid),[]);
 assert.deepEqual(ageGroups([]).map(g=>g.icon),['baby','child','middle','senior']);
});
test('individual 2D character images are shipped as square transparent PNGs',async()=>{
 for(const name of ['young-child','student','worker','middle-aged','senior','pregnancy']){
  const png=await readFile(new URL(`../public/explore/pictograms/${name}-2d.png`,import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),png.readUInt32BE(20));
  assert.ok(png.readUInt32BE(16)>=512);
  assert.equal(png[25],6,'RGBA PNG preserves the transparent character cutout');
 }
 const grid=await readFile(new URL('../public/explore/pictograms/all.svg',import.meta.url),'utf8');
 assert.match(grid,/lucide-layout-grid/);assert.equal((grid.match(/<rect/g)||[]).length,4);
});
test('API secret is absent from every public deploy asset and function source',async t=>{
 let raw;try{raw=(await readFile(new URL('../api-key.txt',import.meta.url),'utf8')).trim();}catch(e){if(e.code==='ENOENT'){t.skip('Local credential file is intentionally excluded from Git.');return;}throw e;}let secret=(raw.match(/[A-Za-z0-9%+\/=_-]{40,}/g)||[raw]).sort((a,b)=>b.length-a.length)[0];try{secret=decodeURIComponent(secret)}catch{}
 assert.ok(secret.length>=30);
 const {readdir}=await import('node:fs/promises');async function check(dir){for(const x of await readdir(dir,{withFileTypes:true})){const file=new URL(x.name+(x.isDirectory()?'/':''),dir);if(x.isDirectory())await check(file);else assert.equal((await readFile(file)).includes(Buffer.from(secret)),false,'credential must not be present in deploy assets');}}
 await check(new URL('../dist/',import.meta.url));assert.equal((await readFile(new URL('../functions/index.cjs',import.meta.url),'utf8')).includes(secret),false);
});
