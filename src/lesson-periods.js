import {progressKey} from './domain.js';

export const SCHOOL_PERIODS=[1,2,3,4,5,6];
// Retain time/endTime for compatibility with saved events and Firestore rules.
// The teacher-facing schedule uses numbered periods throughout.
const clock=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
export function periodSlot(period,count=1) {
 if(!Number.isInteger(period)||!Number.isInteger(count)||period<1||count<1||count>2||period+count-1>6)throw new Error('수업 교시를 확인해 주세요.');
 return {time:clock(540+(period-1)*50),endTime:clock(540+(period+count-2)*50+40)};
}
export function eventPeriod(event) {
 return SCHOOL_PERIODS.find(period=>periodSlot(period).time===event.time)||1;
}
export function periodLabel(event) {
 for(const period of SCHOOL_PERIODS)for(const count of [1,2]) {
  if(period+count-1>6)continue;
  const slot=periodSlot(period,count);
  if(slot.time===event.time&&slot.endTime===event.endTime)return count===1?`${period}교시`:`${period}~${period+1}교시`;
 }
 return '수업 일정';
}
export function lessonUnits(lessons) {
 const units=[];
 for(const lesson of lessons) {
  let unit=units.find(u=>u.project===lesson.project&&u.group===lesson.group);
  if(!unit){unit={...lesson,members:[]};units.push(unit);}
  unit.members.push(lesson);
 }
 return units;
}
export const unitPeriodCount=unit=>Math.min(2,unit.members.length);
export function availableUnits(lessons,progress,classIds,currentLessonId) {
 return lessonUnits(lessons).filter(unit=>unit.members.some(l=>String(l.id)===String(currentLessonId))||classIds.some(id=>unit.members.some(l=>!progress[progressKey(id,l.number)]?.activity)));
}
// Group new schedules into a single calendar entry, keeping the underlying
// per-lesson records available for progress and previously saved calendars.
export function eventBlocks(events,lessons) {
 const blocks=[];
 for(const event of events) {
  const lesson=lessons.find(l=>String(l.id)===String(event.lessonId));
  const key=[event.classId,event.date,event.time,event.endTime,lesson?.group||event.lessonId].join('|');
  let block=blocks.find(b=>b.blockKey===key);
  if(!block){block={...event,blockKey:key,relatedIds:[],lessonIds:[]};blocks.push(block);}
  block.relatedIds.push(event.id);block.lessonIds.push(String(event.lessonId));
 }
 return blocks;
}
