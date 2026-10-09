const {onRequest}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {collect}=require('./population.cjs');
initializeApp();const db=getFirestore();const key=defineSecret('YANGSAN_DATA_KEY');let inflight;
async function refresh(){if(!inflight)inflight=collect(key.value().trim()).then(async data=>{await db.doc('populationSnapshots/current').set({json:JSON.stringify(data),updatedAt:Date.now()});return data;}).finally(()=>inflight=null);return inflight;}
exports.populationData=onRequest({region:'asia-northeast3',secrets:[key],invoker:'public',maxInstances:1,minInstances:0,timeoutSeconds:300,memory:'256MiB',concurrency:20},async(req,res)=>{
 if(req.method!=='GET'){res.status(405).set('Allow','GET').json({error:'method-not-allowed'});return;}
 res.set('Cache-Control','public,max-age=300,s-maxage=3600');
 try{const snap=await db.doc('populationSnapshots/current').get();if(snap.exists){const data=JSON.parse(snap.data().json);res.json({...data,stale:Date.now()-Date.parse(data.fetchedAt)>172800000});return;}res.json(await refresh());}catch{res.status(503).json({error:'자료 제공 서버에 연결하지 못했습니다. 저장된 자료를 사용해 주세요.'});}
});
exports.refreshPopulation=onSchedule({schedule:'every day 08:00',timeZone:'Asia/Seoul',region:'asia-northeast3',secrets:[key],maxInstances:1,timeoutSeconds:300,memory:'256MiB',retryCount:1},async()=>{await refresh();});
