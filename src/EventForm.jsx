import React,{useEffect,useState} from 'react';
import {Trash2} from 'lucide-react';
import {today,projects,progressKey,hasConflict} from './domain';
import {availableUnits,eventPeriod,periodSlot,SCHOOL_PERIODS,unitPeriodCount} from './lesson-periods';

export default function EventForm({modal,data,classId,lessons,ws,busy,ready,perform,close}) {
 const event=modal.event;
 const [selected,setSelected]=useState([event?.classId||modal.classId||classId]),[lessonId,setLesson]=useState(event?.lessonId||modal.lessonId||''),[date,setDate]=useState(event?.date||modal.date||today()),[period,setPeriod]=useState(event?eventPeriod(event):1),[note,setNote]=useState(event?.note||''),[error,setError]=useState('');
 const units=availableUnits(lessons,data.progress,selected,event?.lessonId);
 const unit=units.find(u=>u.members.some(l=>l.id===lessonId))||units[0];
 const count=unit?unitPeriodCount(unit):1;
 const effectivePeriod=Math.min(period,7-count);
 const relatedIds=event?.relatedIds||[event?.id].filter(Boolean);
 useEffect(()=>{if(unit&&!unit.members.some(l=>l.id===lessonId))setLesson(unit.id);},[unit?.id,lessonId]);
 async function submit(e) {
  e.preventDefault();setError('');
  if(!selected.length){setError('수업할 반을 선택해 주세요.');return;}
  if(!unit){setError('선택한 반은 모든 수업을 완료했습니다.');return;}
  const slot=periodSlot(effectivePeriod,count);
  const rows=selected.flatMap(id=>unit.members.filter(l=>!data.progress[progressKey(id,l.number)]?.activity||(event&&relatedIds.some(oldId=>data.events[oldId]?.lessonId===l.id))).map(l=>{
   const old=relatedIds.map(oldId=>data.events[oldId]).find(old=>old?.lessonId===l.id&&old.classId===id);
   return {id:old?.id||crypto.randomUUID(),value:{classId:id,lessonId:l.id,date,...slot,note:event&&note===event.note&&old?(old.note||''):note}};
  }));
  if(!rows.length){setError('선택한 수업은 모두 완료되어 새로 등록할 일정이 없습니다.');return;}
  const retained=Object.fromEntries(Object.entries(data.events).filter(([id])=>!relatedIds.includes(id)));
  if(rows.some(row=>hasConflict(retained,row.value))){setError('같은 반에 교시가 겹치는 일정이 있습니다. 다른 교시를 선택해 주세요.');return;}
  const removeIds=relatedIds.filter(id=>!rows.some(row=>row.id===id));
  if(await perform(()=>ws.applySchedule(rows,removeIds),'수업 일정을 저장했습니다.'))close();
 }
 return <form onSubmit={submit}>
  <fieldset><legend>수업할 반 {event?'':'· 여러 반을 함께 선택할 수 있어요'}</legend><div className="class-choices">{data.classes.map(c=><label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} disabled={!!event||busy} onChange={e=>setSelected(ids=>e.target.checked?[...ids,c.id]:ids.filter(id=>id!==c.id))}/>{c.name}</label>)}</div></fieldset>
  <label>수업 차시<select disabled={!units.length||busy} value={unit?.id||''} onChange={e=>setLesson(e.target.value)}>{!units.length&&<option value="">모든 수업을 완료했습니다</option>}{projects.filter(p=>units.some(u=>u.project===p.id)).map(p=><optgroup key={p.id} label={`프로젝트 ${p.id} · ${p.short}`}>{units.filter(u=>u.project===p.id).map(u=><option key={u.id} value={u.id}>{u.group}차시 · {u.title}</option>)}</optgroup>)}</select></label>
  <div className="form-grid event-period-fields"><label>수업일<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>수업 교시<select value={effectivePeriod} onChange={e=>setPeriod(Number(e.target.value))}>{SCHOOL_PERIODS.filter(n=>n+count-1<=6).map(n=><option value={n} key={n}>{count===1?`${n}교시`:`${n}~${n+1}교시`}</option>)}</select></label></div>
  <p className="field-help">{unit?`${unit.group}차시 수업 · ${count}교시 동안 진행`:''} · 완료한 차시는 새 일정 목록에서 제외합니다.</p>
  <label>준비사항 / 메모<textarea maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} placeholder="준비물, 수업 장소, 다른 반과 맞출 내용 등"/></label>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="form-actions">{event&&<button className="danger" type="button" disabled={busy||!ready} onClick={async()=>{if(await perform(()=>ws.applySchedule([],relatedIds),'일정을 삭제했습니다.'))close();}}><Trash2 size={16}/>일정 삭제</button>}<button type="submit" className="primary" disabled={busy||!ready||!units.length||!selected.length}>{busy?'저장 중…':'일정 저장'}</button></div>
 </form>;
}
