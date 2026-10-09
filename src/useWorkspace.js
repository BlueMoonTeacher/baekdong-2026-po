import {useEffect,useState} from 'react';
import {collection,doc,onSnapshot,setDoc,deleteDoc,writeBatch,serverTimestamp,query,where} from 'firebase/firestore';
import {db} from './firebase';
import {defaultClasses,activeClasses,isMasterUser} from './domain';
const empty=()=>({classes:defaultClasses,events:{},progress:{},discussions:{},resources:{},members:{}});
export function useWorkspace(user,demo,onError) {
 const [data,setData]=useState(empty),[ready,setReady]=useState(false),[role,setRole]=useState(null),[connectionError,setConnectionError]=useState(false);
 useEffect(()=>{
  let active=true,unsubscribe=[];
  setReady(false);setRole(null);setData(empty());setConnectionError(false);
  if(demo){try{setData(JSON.parse(localStorage.getItem('ongyeot-demo-v1'))||empty());}catch{setData(empty());}setRole('admin');setReady(true);return;}
  (async()=>{
   try {
    const signed=!!user?.emailVerified;
    if(!active)return;
    const currentRole=!signed?'viewer':isMasterUser(user)?'admin':'teacher';
    setRole(currentRole);
    const names=['discussions','resources',...(signed?['events','progress']:[]),...(currentRole==='admin'?['members']:[])],loaded=new Set();let failed=false;
    const received=name=>{loaded.add(name);if(!failed&&loaded.size===names.length+1)setReady(true);};
    const fail=e=>{if(active){failed=true;setConnectionError(true);setReady(false);onError(e);}};
    unsubscribe.push(onSnapshot(doc(db,'settings','general'),snap=>{if(active){setData(d=>({...d,classes:activeClasses(snap.data()?.classes)}));received('settings');}},fail));
    for(const name of names) {
     const source=['events','progress'].includes(name)?query(collection(db,name),where('classId','in',defaultClasses.map(c=>c.id))):collection(db,name);
     unsubscribe.push(onSnapshot(source,snap=>{if(active){setData(d=>({...d,[name]:Object.fromEntries(snap.docs.map(x=>[x.id,{...x.data(),id:x.id}]))}));received(name);}},fail));
    }
   }catch(e){if(active){setRole('error');setConnectionError(true);onError(e);setReady(false);}}
  })();
  return ()=>{active=false;unsubscribe.forEach(fn=>fn());};
 },[user,demo,onError]);
 const changeDemo=updater=>setData(d=>{const next=updater(d);localStorage.setItem('ongyeot-demo-v1',JSON.stringify(next));return next;});
 async function save(name,id,value,merge=true){
  if(demo){changeDemo(d=>name==='settings'?{...d,classes:value.classes}:{...d,[name]:{...d[name],[id]:{...(merge?d[name][id]:{}),...value,id,updatedBy:'미리보기',updatedAt:new Date().toISOString()}}});return;}
  if(!user)throw new Error('편집하려면 Google 계정으로 로그인해 주세요.');
  await setDoc(doc(db,name,id),{...value,updatedBy:user.uid,updatedAt:serverTimestamp()},{merge});
 }
 async function saveMany(name,rows){
  if(demo){changeDemo(d=>({...d,[name]:{...d[name],...Object.fromEntries(rows.map(r=>[r.id,{...r.value,id:r.id}]))}}));return;}
  if(!user)throw new Error('편집하려면 Google 계정으로 로그인해 주세요.');
  const batch=writeBatch(db);for(const r of rows)batch.set(doc(db,name,r.id),{...r.value,updatedBy:user.uid,updatedAt:serverTimestamp()},{merge:true});await batch.commit();
 }
 async function remove(name,id){
  if(demo){changeDemo(d=>{const next={...d,[name]:{...d[name]}};delete next[name][id];return next;});return;}
  if(!user)throw new Error('편집하려면 Google 계정으로 로그인해 주세요.');
  await deleteDoc(doc(db,name,id));
 }
 async function applySchedule(rows,removeIds){
  if(!user)throw new Error('일정을 저장하려면 Google 계정으로 로그인해 주세요.');
  if(!ready)throw new Error('수업 기록을 모두 불러온 후 다시 저장해 주세요.');
  if(rows.length+removeIds.length>450)throw new Error('반을 나누어 배정해 주세요.');
  const batch=writeBatch(db);
  for(const id of removeIds)batch.delete(doc(db,'events',id));
  for(const row of rows)batch.set(doc(db,'events',row.id),{...row.value,updatedBy:user.uid,updatedAt:serverTimestamp()});
  await batch.commit();
 }
 const visibleData=user?.emailVerified?data:{...data,events:{},progress:{}};
 const visibleRole=user?.emailVerified?(isMasterUser(user)?'admin':'teacher'):'viewer';
 return {data:visibleData,ready,role:visibleRole,connectionError,save,saveMany,remove,applySchedule};
}
