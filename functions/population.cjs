const districts=[['25300','물금읍'],['31000','동면'],['32000','원동면'],['33000','상북면'],['34000','하북면'],['51000','중앙동'],['51500','양주동'],['52000','삼성동'],['53000','강서동'],['54000','서창동'],['55000','소주동'],['56000','평산동'],['57000','덕계동']];
const endpoints={region:['population_region01','region01',15082066],town:['population_town01','town01',15083467],age:['population_age01','age01',15083468],year:['population_yearly01','yearly01',15083469],movement:['population_flow01','flow01',15083466]};
const num=x=>x===null||x===undefined||String(x).trim()===''?null:Number(String(x).replace(/,/g,''));
const period=x=>`${x.year}-${String(x.month).padStart(2,'0')}`;
async function request(key,kind,params){
 const [service,operation]=endpoints[kind];const url=new URL(`https://apis.data.go.kr/5380000/${service}/${operation}`);
 Object.entries({serviceKey:key,pageNo:'1',numOfRows:'1000',...params}).forEach(([k,v])=>url.searchParams.set(k,v));
 let res;try{res=await fetch(url,{signal:AbortSignal.timeout(25000)});}catch{throw new Error(`upstream-${kind}-unavailable`);}
 if(!res.ok)throw new Error(`upstream-${kind}-${res.status}`);
 let body;try{body=await res.json();}catch{throw new Error(`upstream-${kind}-invalid-response`);}
 if(Number(body.resultCode)!==0||!Array.isArray(body.data))throw new Error(`upstream-${kind}-rejected`);
 if(num(body.totalCount)>body.data.length)throw new Error(`upstream-${kind}-incomplete`);
 return body.data;
}
function normalize(raw){
 const warnings=[];const region=raw.region.map(x=>({period:period(x),code:String(x.cl_han_code),name:x.cl_han_nm,total:num(x.popltn_sm),male:num(x.popltn_male),female:num(x.popltn_female),change:num(x.lsmth_irds),derived:false}));
 // Provider currently omits Gangseo-dong. A residual is explicitly labelled as calculated,
 // never passed off as a returned district statistic. Any other missing district stays missing.
 for(const m of [...new Set(region.map(x=>x.period))]){const rs=region.filter(x=>x.period===m);const city=raw.age.filter(x=>period(x)===m);if(rs.length!==12||rs.some(x=>x.code==='53000')||!districts.filter(([c])=>c!=='53000').every(([c])=>rs.filter(x=>x.code===c).length===1)||city.length!==2||!['M','F'].every(g=>city.filter(x=>x.gender_code===g).length===1))continue;
 const male=num(city.find(x=>x.gender_code==='M').agrde_sm)-rs.reduce((s,x)=>s+x.male,0),female=num(city.find(x=>x.gender_code==='F').agrde_sm)-rs.reduce((s,x)=>s+x.female,0);if(!Number.isFinite(male)||!Number.isFinite(female)||male<0||female<0||male+female>30000)continue;region.push({period:m,code:'53000',name:'강서동',male,female,total:male+female,change:null,derived:true});}
 for(const r of region.filter(x=>x.derived)){const [y,m]=r.period.split('-').map(Number);const d=new Date(Date.UTC(y,m-2,1));const prev=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;const last=region.find(x=>x.code===r.code&&x.period===prev);if(last)r.change=r.total-last.total;}
 if(region.some(x=>x.derived))warnings.push('강서동은 제공 API에 값이 없어 시 전체 인구에서 나머지 12개 읍면동의 합계를 뺀 계산값입니다.');
 const months=[...new Set(region.map(x=>x.period))].sort().filter(m=>{const rs=region.filter(x=>x.period===m);const ok=districts.every(([code])=>rs.filter(x=>x.code===code).length===1)&&rs.length===13&&rs.every(x=>x.total>=0&&x.male>=0&&x.female>=0&&x.total===x.male+x.female);if(!ok)warnings.push(`${m}: 읍면동 자료가 불완전하여 제외했습니다.`);return ok;});
 const ageKeys=Array.from({length:22},(_,i)=>`age${i*5}_${i*5+4}`).concat('age110_above');const ages=[];
 for(const m of months){const rows=raw.age.filter(x=>period(x)===m);const valid=rows.length===2&&['M','F'].every(g=>rows.filter(r=>r.gender_code===g).length===1)&&rows.every(r=>ageKeys.every(k=>num(r[k])!==null&&num(r[k])>=0&&Number.isFinite(num(r[k])))&&ageKeys.reduce((s,k)=>s+num(r[k]),0)===num(r.agrde_sm));const total=region.filter(x=>x.period===m).reduce((s,x)=>s+x.total,0);if(!valid||rows.reduce((s,r)=>s+num(r.agrde_sm),0)!==total){warnings.push(`${m}: 연령별 합계가 일치하지 않아 나이 그래프를 표시하지 않습니다.`);continue;}ages.push({period:m,total,bands:ageKeys.map((key,i)=>({label:i===22?'110세 이상':`${i*5}~${i*5+4}세`,min:i*5,total:rows.reduce((s,r)=>s+num(r[key]),0)}))});}
 const town=raw.town.map(x=>({period:period(x),code:String(x.cl_han_code),householdChange:num(x.hshld)}));
 const years=raw.year.map(x=>({year:num(x.year),total:num(x.popltn_sm),households:num(x.hshld),average:num(x.hshld_avrgpopltn),source:'연도별 인구 API'})).filter(x=>x.total>=0&&x.year<new Date().getUTCFullYear());
 for(const m of months.filter(x=>x.endsWith('-12'))){const year=Number(m.slice(0,4));if(!years.some(x=>x.year===year))years.push({year,total:region.filter(x=>x.period===m).reduce((s,r)=>s+r.total,0),source:'12월 지역별 인구 API 합계',households:null,average:null});}
 const movement=(raw.movement||[]).map(x=>({year:num(x.year),code:String(x.cl_han_code),name:x.cl_han_nm,births:num(x.birth_co),deaths:num(x.death_co),natural:num(x.naincrs_co)})).filter(x=>x.births>=0&&x.deaths>=0&&x.natural===x.births-x.deaths);
 if(!months.length)throw new Error('no-complete-month');
 return {schemaVersion:1,fetchedAt:new Date().toISOString(),latestPeriod:months.at(-1),periods:months,districts:districts.map(([code,name])=>({code,name})),region:region.filter(x=>months.includes(x.period)),ages,town,years:years.sort((a,b)=>a.year-b.year),movement,warnings,sources:Object.entries(endpoints).map(([kind,x])=>({kind,title:{region:'지역별 인구 정보',town:'읍면동별 인구 증감',age:'연령별 인구',year:'연도별 인구',movement:'지역별 인구 동태'}[kind],url:`https://www.data.go.kr/data/${x[2]}/openapi.do`}))};
}
async function collect(key){
 const now=new Date();const end=`${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,'0')}`;const range={start_ym:'202401',end_ym:end};const raw={region:[],town:[],age:[],year:[],movement:[]};
 for(let i=0;i<districts.length;i+=3){const tasks=districts.slice(i,i+3).flatMap(([code])=>['region','town'].map(async kind=>{raw[kind].push(...await request(key,kind,{...range,cl_han_code:code}));}));await Promise.all(tasks);}
 for(const gender of ['M','F'])raw.age.push(...await request(key,'age',{...range,gender_code:gender}));
 raw.year=await request(key,'year',{start_year:'2015',end_year:String(now.getUTCFullYear())});
 for(const [code] of districts){try{raw.movement.push(...await request(key,'movement',{start_year:'2020',end_year:String(now.getUTCFullYear()-1),cl_han_code:code}));}catch{break;}}
 return normalize(raw);
}
module.exports={districts,endpoints,num,normalize,collect,request};
