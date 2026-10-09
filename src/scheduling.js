import {hasConflict,progressKey} from './domain.js';
import {lessonUnits,periodSlot} from './lesson-periods.js';

export const SCHOOL_DEADLINE='2026-11-26';
export const WEEKDAYS=['일','월','화','수','목','금','토'];
const dateNumber=value=>{
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');
 if(!match)return NaN;
 const time=Date.UTC(+match[1],+match[2]-1,+match[3]);
 return new Date(time).toISOString().slice(0,10)===value?time:NaN;
};
const stamp=e=>`${e.date}T${e.time}`;

// Preview only. A grouped 2/3-lesson activity reserves two school periods;
// its individual lesson records share that block for progress tracking.
export function planSchedule({lessons,classes,selectedClasses,progress,events,startDate,deadline=SCHOOL_DEADLINE,weekdays,periodsPerDay=2,startPeriod=1,projectIds=[2,3],mode='preserve',excludedDates=[]}) {
 const issues=[],rows=[],removeIds=[],summaries=[];
 const first=dateNumber(startDate),last=dateNumber(deadline);
 if(!Number.isFinite(first)||!Number.isFinite(last)||first>=last||last-first>366*86400000)issues.push('시작일은 마감일보다 앞서야 하며, 배정 기간은 1년 이내로 설정해 주세요.');
 if(!selectedClasses.length||selectedClasses.some(id=>!classes.some(c=>c.id===id)))issues.push('수업할 반을 선택해 주세요.');
 if(!weekdays.length||weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))issues.push('수업 요일을 하나 이상 선택해 주세요.');
 if(!projectIds.length||projectIds.some(id=>![1,2,3].includes(id)))issues.push('배정할 프로젝트를 선택해 주세요.');
 if(!['preserve','rebalance'].includes(mode))issues.push('배정 방식을 확인해 주세요.');
 if(!Number.isInteger(periodsPerDay)||periodsPerDay<1||periodsPerDay>6||!Number.isInteger(startPeriod)||startPeriod<1||startPeriod+periodsPerDay-1>6)issues.push('하루 수업 교시와 시작 교시를 확인해 주세요.');
 if(excludedDates.some(d=>!Number.isFinite(dateNumber(d))))issues.push('제외일을 YYYY-MM-DD 형식으로 입력해 주세요.');
 if(issues.length)return {rows,removeIds,summaries,issues,canSave:false};
 const days=[];
 for(let day=first;day<last;day+=86400000){
  const date=new Date(day).toISOString().slice(0,10);
  if(weekdays.includes(new Date(day).getUTCDay())&&!excludedDates.includes(date))days.push(date);
 }
 const all=Object.values(events);
 for(const classId of [...new Set(selectedClasses)]){
  const name=classes.find(c=>c.id===classId).name;
  const selected=lessons.filter(l=>projectIds.includes(l.project)).sort((a,b)=>a.number-b.number);
  const pending=selected.filter(l=>!progress[progressKey(classId,l.number)]?.activity);
  const pendingIds=new Set(pending.map(l=>String(l.id)));
  const replace=mode==='rebalance'?all.filter(e=>e.classId===classId&&pendingIds.has(String(e.lessonId))&&e.date>=startDate):[];
  const replacedIds=new Set(replace.map(e=>e.id));
  const retained=all.filter(e=>!replacedIds.has(e.id));
  const fixed=new Map(pending.map(l=>[l.id,retained.filter(e=>e.classId===classId&&String(e.lessonId)===String(l.id)).sort((a,b)=>stamp(a).localeCompare(stamp(b)))[0]]));
  const occupied=Object.fromEntries(retained.map((e,i)=>[e.id||i,e]));
  // Keep legacy individual fixed events; combine only consecutive unassigned
  // members of a lesson unit so no existing schedule is silently moved.
  const tasks=[];
  for(const unit of lessonUnits(pending))for(const lesson of unit.members){
   const existing=fixed.get(lesson.id),previous=tasks.at(-1);
   if(!existing&&previous&&!previous.existing&&previous.group===unit.group&&previous.project===unit.project)previous.members.push(lesson);
   else tasks.push({group:unit.group,project:unit.project,members:[lesson],existing});
  }
  const classRows=[];let cursor=`${startDate}T00:00`,missing=0,kept=0;
  for(let index=0;index<tasks.length;index++){
   const task=tasks[index],existing=task.existing;
   if(existing){
    kept++;
    if(existing.date>=deadline)issues.push(`${name}: ${task.members[0].number}차시의 기존 일정이 마감일 이후입니다. '남은 진도 다시 배정'을 선택해 주세요.`);
    if(existing.date>=startDate){
     const previous=tasks[index-1];
     const sameBlock=previous?.existing&&previous.group===task.group&&stamp(previous.existing)===stamp(existing)&&previous.existing.endTime===existing.endTime;
     if(stamp(existing)<cursor&&!sameBlock)issues.push(`${name}: 기존 ${task.members[0].number}차시 일정의 순서가 앞선 차시와 맞지 않습니다. 다시 배정해 주세요.`);
     cursor=[cursor,`${existing.date}T${existing.endTime}`].sort().at(-1);
    }
    continue;
   }
   const count=Math.min(2,task.members.length);
   const nextFixed=tasks.slice(index+1).find(t=>t.existing)?.existing;
   let slot;
   for(const date of days){
    for(let period=startPeriod;period+count<=startPeriod+periodsPerDay;period++){
     const candidate={date,...periodSlot(period,count)};
     if(stamp(candidate)>=cursor&&(!nextFixed||`${date}T${candidate.endTime}`<=stamp(nextFixed))&&!hasConflict(occupied,{...candidate,classId})){slot=candidate;break;}
    }
    if(slot)break;
   }
   if(!slot){missing+=task.members.length;continue;}
   for(const lesson of task.members){
    const value={classId,lessonId:String(lesson.id),...slot,note:replace.find(e=>String(e.lessonId)===String(lesson.id))?.note||''};
    classRows.push({value,number:lesson.number,project:lesson.project,title:lesson.title});
    occupied[`planned-${lesson.id}`]=value;
   }
   cursor=`${slot.date}T${slot.endTime}`;
  }
  if(missing)issues.push(`${name}: ${missing}차시를 배정하지 못했습니다. 수업 요일을 늘리거나 시작일·하루 교시 수·기존 일정을 조정해 주세요.`);
  rows.push(...classRows);removeIds.push(...replace.map(e=>e.id));
  summaries.push({classId,name,completed:selected.length-pending.length,remaining:pending.length,kept,assigned:classRows.length,missing,lastDate:classRows.at(-1)?.value.date,days:new Set(classRows.map(r=>r.value.date)).size});
 }
 return {rows,removeIds,summaries,issues:[...new Set(issues)],canSave:issues.length===0&&rows.length>0&&rows.length+removeIds.length<=450};
}
