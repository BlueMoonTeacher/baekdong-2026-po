const {districts}=require('./population.cjs');
const API='https://sgisapi.mods.go.kr/OpenAPI3/';
const asNumber=value=>value===null||value===undefined||String(value).trim()===''||!/^-?\d+(\.\d+)?$/.test(String(value))?null:Number(value);
function publicSummary(row){
 return {total:asNumber(row.tot_ppltn),averageAge:asNumber(row.avg_age),density:asNumber(row.ppltn_dnsty),households:asNumber(row.tot_family),averageHouseholdSize:asNumber(row.avg_fmember_cnt)};
}
function createClient(getCredentials,fetcher=fetch){
 let token=null,tokenUntil=0,authPromise=null,yearsPromise=null;
 const cache=new Map(),pending=new Map();
 async function json(path,params){
  const url=new URL(path,API);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(25000)});}catch{throw Error('sgis-unavailable');}
  if(!response.ok)throw Error(`sgis-http-${response.status}`);
  let body;try{body=await response.json();}catch{throw Error('sgis-invalid-response');}
  if(Number(body.errCd)!==0)throw Error(`sgis-code-${Number(body.errCd)}`);
  return body.result??body;
 }
 async function authenticate(){
  if(token&&Date.now()<tokenUntil)return token;
  if(!authPromise)authPromise=(async()=>{
   const credentials=getCredentials();if(!credentials.serviceId||!credentials.securityKey)throw Error('sgis-not-configured');
   const result=await json('auth/authentication.json',{consumer_key:credentials.serviceId,consumer_secret:credentials.securityKey});
   if(!result.accessToken)throw Error('sgis-auth-failed');
   token=result.accessToken;tokenUntil=Math.min(Number(result.accessTimeout)||Date.now()+3600000,Date.now()+3600000)-60000;return token;
  })().finally(()=>authPromise=null);
  return authPromise;
 }
 async function request(path,params={}){
  try{return await json(path,{...params,accessToken:await authenticate()});}
  catch(error){if(error.message==='sgis-code--401'||error.message==='sgis-code--1001'){token=null;return json(path,{...params,accessToken:await authenticate()});}throw error;}
 }
 async function years(){
  if(!yearsPromise)yearsPromise=request('year/data.json').then(r=>({latest:String(r.lin_yr),available:(r.tin_yr||[]).map(String).filter(y=>/^20\d{2}$/.test(y)).sort().reverse()})).catch(e=>{yearsPromise=null;throw e;});
  return yearsPromise;
 }
 async function details(code,requestedYear){
  const district=districts.find(d=>d[0]===code);if(!district)throw Error('invalid-district');
  const info=await years(),year=requestedYear||info.latest;if(!info.available.includes(year))throw Error('invalid-year');
  const key=`${code}:${year}`,stored=cache.get(key);if(stored&&Date.now()-stored.savedAt<86400000)return stored.data;
  if(!pending.has(key))pending.set(key,(async()=>{
   // Resolve the code from that year's official names, rather than concatenating code systems.
   const boundary=await request('boundary/hadmarea.geojson',{year,adm_cd:'38100',low_search:1});
   const match=boundary.features?.find(f=>f.properties.adm_nm.trim().split(' ').at(-1)===district[1]);
   if(!match)throw Error('sgis-district-not-found');
   const admCode=String(match.properties.adm_cd);
   const result=await request('stats/population.json',{year,adm_cd:admCode,low_search:0});
   const summaryRow=Array.isArray(result)?result.find(r=>String(r.adm_cd)===admCode):null;
   if(!summaryRow)throw Error('sgis-population-missing');
   let areas=[],areaError=null;
   try{
    const rows=await request('stats/searchpopulation.json',{year,adm_cd:admCode,low_search:1});
    if(!Array.isArray(rows))throw Error('sgis-small-area-missing');
    // The live statsarea endpoint returns 2025 boundaries even for 2024 requests.
    // Keep census-year subarea numbers separate rather than mapping onto a different year's boundaries.
    areas=rows.filter(r=>String(r.adm_cd).length===14&&String(r.adm_cd).startsWith(admCode)).sort((a,b)=>String(a.adm_cd).localeCompare(String(b.adm_cd))).map((r,i)=>({code:String(r.adm_cd),label:`통계 구역 ${i+1}`,total:asNumber(r.population),year}));
    if(!areas.length)throw Error('sgis-small-area-missing');
   }catch{areaError='작은 구역 자료는 지금 불러오지 못했어요.';}
   const data={code,name:district[1],admCode,year,years:info.available,source:'SGIS 인구주택총조사',sourceUrl:'https://sgis.mods.go.kr/developer/html/newOpenApi/api/dataApi/census.html',fetchedAt:new Date().toISOString(),summary:publicSummary(summaryRow),areas,areaError};
   cache.set(key,{savedAt:Date.now(),data});return data;
  })().finally(()=>pending.delete(key)));
  return pending.get(key);
 }
 return {details,request,years};
}
module.exports={createClient,asNumber,publicSummary};
