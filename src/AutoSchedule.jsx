import React,{useMemo,useState} from 'react';
import {CalendarDays,CheckCircle2,RefreshCw,ArrowRight} from 'lucide-react';
import {today,projects} from './domain';
import {planSchedule,SCHOOL_DEADLINE,WEEKDAYS} from './scheduling';
import {SCHOOL_PERIODS,periodLabel} from './lesson-periods';

export default function AutoSchedule({data,lessons,classId,ws,canEdit,ready,busy,perform,onSaved}){
 const [selected,setSelected]=useState([classId]),[startDate,setStart]=useState(today()),[weekdays,setWeekdays]=useState([2,4]),[periods,setPeriods]=useState(2),[startPeriod,setStartPeriod]=useState(1),[projectIds,setProjects]=useState([2,3]),[mode,setMode]=useState('preserve'),[excluded,setExcluded]=useState('');
 const excludedDates=useMemo(()=>excluded.split(/[\s,]+/).filter(Boolean),[excluded]);
 const preview=useMemo(()=>planSchedule({lessons,classes:data.classes,selectedClasses:selected,progress:data.progress,events:data.events,startDate,deadline:SCHOOL_DEADLINE,weekdays,periodsPerDay:periods,startPeriod,projectIds,mode,excludedDates}),[data,selected,startDate,weekdays,periods,startPeriod,projectIds,mode,excludedDates,lessons]);
 const toggle=(set,value)=>set(values=>values.includes(value)?values.filter(v=>v!==value):[...values,value]);
 async function save(e){
  e.preventDefault();
  if(!canEdit||!ready||busy||!preview.canSave)return;
  const rows=preview.rows.map(row=>({id:crypto.randomUUID(),value:row.value}));
  if(await perform(()=>ws.applySchedule(rows,preview.removeIds),`${rows.length}차시의 일정을 저장했습니다.`))onSaved(rows[0].value.date,rows[0].value.classId);
 }
 return <form className="auto-schedule" onSubmit={save}>
  <div className="schedule-intro"><span className="schedule-icon"><CalendarDays size={24}/></span><div><span className="sheet-label">남은 수업을 차근차근</span><h3>요일만 정하면, 진도를 함께 맞춰요.</h3><p>프로젝트 2·3은 <b>2026년 11월 25일까지</b> 배정합니다. 활동 완료 기록은 자동으로 건너뜁니다.</p></div></div>
  <fieldset><legend>배정할 반</legend><div className="class-choices">{data.classes.map(c=><label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggle(setSelected,c.id)}/>{c.name}</label>)}</div></fieldset>
  <fieldset><legend>배정할 프로젝트</legend><div className="class-choices">{projects.map(p=><label key={p.id}><input type="checkbox" checked={projectIds.includes(p.id)} onChange={()=>toggle(setProjects,p.id)}/>프로젝트 {p.id} · {p.short}</label>)}</div><p className="field-help">프로젝트 1은 기본 배정에서 제외합니다. 미완료 학급은 선택해 함께 배정할 수 있어요.</p></fieldset>
  <div className="schedule-fields"><label>수업 시작일<input type="date" required value={startDate} max="2026-11-25" onChange={e=>setStart(e.target.value)}/></label><label>하루 수업 교시<select value={periods} onChange={e=>{const n=Number(e.target.value);setPeriods(n);setStartPeriod(p=>Math.min(p,7-n));}}>{SCHOOL_PERIODS.map(n=><option value={n} key={n}>{n}교시씩</option>)}</select></label></div>
  <fieldset><legend>주로 수업하는 요일</legend><div className="weekday-choices">{[1,2,3,4,5,6,0].map(d=><button type="button" aria-pressed={weekdays.includes(d)} className={weekdays.includes(d)?'selected':''} key={d} onClick={()=>toggle(setWeekdays,d)}>{WEEKDAYS[d]}<small>요일</small></button>)}</div></fieldset>
  <div className="schedule-fields"><label>시작 교시<select value={startPeriod} onChange={e=>setStartPeriod(Number(e.target.value))}>{SCHOOL_PERIODS.filter(n=>n+periods-1<=6).map(n=><option value={n} key={n}>{n}교시부터</option>)}</select></label><p className="field-help">1차시 수업은 1교시, 2~3차시 묶음 수업은 연속 2교시로 배정합니다.</p></div>
  <label>기존 일정 처리<select value={mode} onChange={e=>setMode(e.target.value)}><option value="preserve">기존 일정 유지 · 미배정 차시만 추가</option><option value="rebalance">남은 진도 다시 배정 · 시작일 이후 일정 교체</option></select></label>
  <p className="field-help">다시 배정해도 완료 차시, 시작일 이전 일정, 선택하지 않은 프로젝트의 일정은 보존합니다. 다른 수업과 겹치는 교시는 건너뜁니다.</p>
  <label>수업 제외일<textarea className="excluded-dates" value={excluded} onChange={e=>setExcluded(e.target.value)} placeholder="예: 2026-10-15, 2026-11-05"/></label><p className="field-help">공휴일·현장체험학습 등 수업이 없는 날을 쉼표나 줄바꿈으로 입력해 주세요.</p>
  <section className="schedule-preview" aria-label="자동 배정 미리보기"><div className="preview-heading"><h3><RefreshCw size={17}/> 배정 미리보기</h3><span>새로 배정 {preview.rows.length}차시</span></div>
   {preview.summaries.map(s=><div className="schedule-summary" key={s.classId}><b>{s.name}</b><span>완료 {s.completed} · 기존 유지 {s.kept} · 새 배정 <strong>{s.assigned}</strong>차시</span>{s.lastDate&&<small>{s.days}일 수업 · 마지막 새 배정 {s.lastDate.slice(5).replace('-','/')}</small>}</div>)}
   {preview.issues.length>0&&<div className="form-error" role="alert">{preview.issues.map(message=><p key={message}>{message}</p>)}</div>}
   {!preview.rows.length&&!preview.issues.length&&<p className="field-help">추가로 배정할 차시가 없습니다. 모두 완료했거나 기존 일정이 등록되어 있어요.</p>}
   {preview.rows.length>0&&<div className="schedule-table-scroll"><table className="schedule-table"><thead><tr><th>반</th><th>수업일</th><th>교시</th><th>차시 · 활동</th></tr></thead><tbody>{preview.rows.map(r=><tr key={`${r.value.classId}-${r.number}`}><td>{data.classes.find(c=>c.id===r.value.classId)?.name.replace('6학년 ','')}</td><td>{r.value.date.slice(5).replace('-','/')} ({WEEKDAYS[new Date(`${r.value.date}T00:00:00Z`).getUTCDay()]})</td><td>{periodLabel(r.value)}</td><td><span className={`badge p${r.project}`}>{r.number}차시</span> {r.title}</td></tr>)}</tbody></table></div>}
   {preview.removeIds.length>0&&<p className="replacement-note">저장하면 대상 반의 기존 미완료 일정 {preview.removeIds.length}개를 위 일정으로 교체합니다.</p>}
   {preview.rows.length+preview.removeIds.length>450&&<p className="form-error">한 번에 저장할 수 있는 범위를 넘었습니다. 반을 나누어 배정해 주세요.</p>}
  </section>
  {!canEdit&&<p className="read-note"><CheckCircle2 size={16}/>미리보기는 누구나 사용할 수 있습니다. 저장하려면 Google 로그인이 필요해요.</p>}
  <div className="form-actions"><span className="field-help">일정 저장 시 반별 달력에 반영됩니다.</span><button className="primary" type="submit" disabled={!canEdit||!ready||busy||!preview.canSave}>{busy?'저장 중…':'이 일정으로 저장'}<ArrowRight size={16}/></button></div>
 </form>;
}
