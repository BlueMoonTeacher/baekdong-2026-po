const {onRequest}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {collect}=require('./population.cjs');
const {createClient}=require('./sgis.cjs');
const sgisId=defineSecret('SGIS_SERVICE_ID'),sgisKey=defineSecret('SGIS_SECURITY_KEY');
const sgis=createClient(()=>({serviceId:sgisId.value().trim(),securityKey:sgisKey.value().trim()}));
exports.sgisDetails=onRequest({region:'asia-northeast3',secrets:[sgisId,sgisKey],invoker:'public',maxInstances:2,timeoutSeconds:120,memory:'256MiB',concurrency:20},async(req,res)=>{
 if(req.method!=='GET'){res.status(405).set('Allow','GET').json({error:'method-not-allowed'});return;}
 try{const data=await sgis.details(String(req.query.code||''),req.query.year?String(req.query.year):undefined);res.set('Cache-Control','public,max-age=3600,s-maxage=86400').json(data);}
 catch(e){res.set('Cache-Control','no-store').status(e.message.startsWith('invalid-')?400:503).json({error:'SGIS 지역 상세 자료를 불러오지 못했어요. 지역과 연도를 확인하거나 잠시 뒤 다시 시도해 주세요.'});}
});
initializeApp();const db=getFirestore();const key=defineSecret('YANGSAN_DATA_KEY');let inflight;
async function refresh(){if(!inflight)inflight=collect(key.value().trim()).then(async data=>{await db.doc('populationSnapshots/current').set({json:JSON.stringify(data),updatedAt:Date.now()});return data;}).finally(()=>inflight=null);return inflight;}
exports.populationData=onRequest({region:'asia-northeast3',secrets:[key],invoker:'public',maxInstances:1,minInstances:0,timeoutSeconds:300,memory:'256MiB',concurrency:20},async(req,res)=>{
 if(req.method!=='GET'){res.status(405).set('Allow','GET').json({error:'method-not-allowed'});return;}
 res.set('Cache-Control','public,max-age=300,s-maxage=3600');
 try{const snap=await db.doc('populationSnapshots/current').get();if(snap.exists){const data=JSON.parse(snap.data().json);res.json({...data,stale:Date.now()-Date.parse(data.fetchedAt)>172800000});return;}res.json(await refresh());}catch{res.status(503).json({error:'자료 제공 서버에 연결하지 못했습니다. 저장된 자료를 사용해 주세요.'});}
});
exports.refreshPopulation=onSchedule({schedule:'every day 08:00',timeZone:'Asia/Seoul',region:'asia-northeast3',secrets:[key],maxInstances:1,timeoutSeconds:300,memory:'256MiB',retryCount:1},async()=>{await refresh();});
