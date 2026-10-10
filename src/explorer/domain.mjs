import {sanitizeProposalForm,proposalText as projectText} from './proposal-domain.mjs';
export const number=n=>Number.isFinite(n)?n.toLocaleString('ko-KR'):'—';
export const monthText=s=>s?`${s.slice(0,4)}년 ${Number(s.slice(5))}월`:'';
export const pct=(a,b)=>b>0?a/b*100:0;
export function districtHistory(data,code,period,limit=12){
 return data.region.filter(r=>r.code===code&&r.period<=period).sort((a,b)=>a.period.localeCompare(b.period)).slice(-limit);
}
export function changeText(change,easy=false){
 if(!Number.isFinite(change))return '비교 자료 없음';
 if(change===0)return easy?'사람 수가 같아요':'변화 없음';
 return `${number(Math.abs(change))}명 ${change>0?(easy?'늘었어요':'증가'):(easy?'줄었어요':'감소')}`;
}
export const populationBins=[
 {max:5000,label:'5천 미만',color:'#eef2f4',dark:false},
 {max:10000,label:'5천~1만 미만',color:'#d4eddf',dark:false},
 {max:20000,label:'1만~2만 미만',color:'#8dd4ab',dark:false},
 {max:50000,label:'2만~5만 미만',color:'#42b477',dark:false},
 {max:100000,label:'5만~10만 미만',color:'#14794e',dark:true},
 {max:Infinity,label:'10만 이상',color:'#034d32',dark:true},
];
export const changeColors={increase:'#009f43',decrease:'#b8666f',unchanged:'#f39800',missing:'#d9e0e3'};
export function populationBin(total){return Number.isFinite(total)&&total>=0?populationBins.find(b=>total<b.max):null;}
export function populationColor(row,metric){
 if(metric==='change')return !Number.isFinite(row?.change)?changeColors.missing:row.change>0?changeColors.increase:row.change<0?changeColors.decrease:changeColors.unchanged;
 return populationBin(row?.total)?.color||changeColors.missing;
}
export function changeScale(values){
 const maximum=Math.max(0,...values.filter(Number.isFinite).map(Math.abs));
 if(maximum===0)return 1;
 const magnitude=10**Math.floor(Math.log10(maximum));
 return [1,2,5,10].map(step=>step*magnitude).find(limit=>limit>=maximum);
}
export function changePictureUnit(change){return Number.isFinite(change)?[1,10,100,1000,10000,100000,1000000].find(unit=>Math.abs(change)/unit<=40)||1000000:null;}
export function populationPictures(total){
 if(!Number.isFinite(total)||total<0)return [];
 const large=Math.floor(total/10000),small=(total%10000)/1000;
 return [...Array.from({length:large},()=>({unit:10000,fraction:1})),...Array.from({length:Math.ceil(small)},(_,i)=>({unit:1000,fraction:Math.min(1,small-i)}))];
}
export const ageGroups=bands=>[{label:'0~14세',icon:'baby',color:'#009f43',min:0,max:15},{label:'15~34세',icon:'child',color:'#003c96',min:15,max:35},{label:'35~64세',icon:'middle',color:'#f39800',min:35,max:65},{label:'65세 이상',icon:'senior',color:'#d20b19',min:65,max:Infinity}].map(g=>({...g,total:bands.filter(x=>x.min>=g.min&&x.min<g.max).reduce((s,x)=>s+x.total,0)}));
export function loadDraft(storage){try{const d=JSON.parse((storage||globalThis.localStorage).getItem('yangsan-explorer-draft-v1'));if(!d||typeof d!=='object')return null;return {form:sanitizeProposalForm(d.form),notes:Array.isArray(d.notes)?d.notes.filter(x=>x&&typeof x.text==='string'&&typeof x.source==='string').slice(0,12).map(x=>({...x,text:x.text.slice(0,4000)})):[],policyIds:Array.isArray(d.policyIds)?[...new Set(d.policyIds.filter(x=>typeof x==='string'))].slice(0,6):[]};}catch{return null;}}
export function proposalText(form,notes,policies){return projectText(form,notes,policies);}
