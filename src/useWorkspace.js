import {useEffect,useState} from 'react';
import {collection,doc,onSnapshot,getDoc,setDoc,deleteDoc,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db} from './firebase';
import {defaultClasses} from './domain';
const empty=()=>({classes:defaultClasses,events:{},progress:{},discussions:{},resources:{},members:{}});
export function useWorkspace(user,demo,onError) {
 const [data,setData]=useState(empty),[ready,setReady]=useState(false),[role,setRole]=useState(null);
 useEffect(()=>{
  let active=true,unsubscribe=[];
  setReady(false);setRole(null);setData(empty());
  if(demo){try{setData(JSON.parse(localStorage.getItem('ongyeot-demo-v1'))||empty());}catch{setData(empty());}setRole('admin');setReady(true);return;}
  (async()=>{
   try {
    const member=user?await getDoc(doc(db,'members',user.email.toLowerCase())):null;
    if(!active)return;
    const currentRole=!user?'viewer':member?.exists()?member.data().role:'teacher';
    setRole(currentRole);
    const fail=e=>{if(active)onError(e);};
    unsubscribe.push(onSnapshot(doc(db,'settings','general'),snap=>{if(active){setData(d=>({...d,classes:snap.data()?.classes||defaultClasses}));setReady(true);}},fail));
    for(const name of ['events','progress','discussions','resources',...(currentRole==='admin'?['members']:[])]) {
     unsubscribe.push(onSnapshot(collection(db,name),snap=>{if(active)setData(d=>({...d,[name]:Object.fromEntries(snap.docs.map(x=>[x.id,{...x.data(),id:x.id}]))}));},fail));
    }
   }catch(e){if(active){setRole('error');onError(e);setReady(true);}}
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
 return {data,ready,role,save,saveMany,remove};
}
