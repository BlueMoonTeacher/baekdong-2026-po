export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const projects = [
 {id:1,name:'우리는 모두 소중해요',short:'존중과 공감',range:'1–10차시',description:'세대공감 · 성평등 · 다문화',color:'#176a68'},
 {id:2,name:'인구교육 굿즈, 마을과 함께 나눠요!',short:'굿즈와 나눔',range:'11–20차시',description:'가족 인터뷰 · 굿즈 제작 · 마을 나눔',color:'#b96928'},
 {id:3,name:'내일의 인구, 우리가 디자인해요!',short:'인구정책 제안·홍보',range:'21–30차시',description:'인구 데이터 · 저출산과 고령화 · 양산시 정책',color:'#506bb1'}
];
export const defaultClasses = Array.from({length:6},(_,i)=>({id:`class-${i+1}`,name:`6학년 ${i+1}반`,teacher:'',padlet:''}));
export const progressKey=(classId,number)=>`${classId}_${number}`;
export function classStats(classId,progress,lessons) {
 const rows=lessons.map(l=>progress[progressKey(classId,l.number)]||{});
 const count=key=>rows.filter(x=>x[key]===true).length;
 return {activity:count('activity'),padlet:count('padlet'),worksheet:count('worksheet'),percent:Math.round(count('activity')/lessons.length*100)};
}
export function hasConflict(events,event,ignoreId) {
 return Object.values(events).some(e=>e.id!==ignoreId && e.classId===event.classId && e.date===event.date && e.time<event.endTime && e.endTime>event.time);
}
export function safeUrl(value) {try {const u=new URL(value); return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function monthCells(year,month) {
 const first=new Date(year,month,1).getDay(); const days=new Date(year,month+1,0).getDate();
 return Array.from({length:Math.ceil((first+days)/7)*7},(_,i)=>i>=first&&i<first+days?`${year}-${String(month+1).padStart(2,'0')}-${String(i-first+1).padStart(2,'0')}`:null);
}
