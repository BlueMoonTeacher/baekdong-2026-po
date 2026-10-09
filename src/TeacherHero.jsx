import React from 'react';
import {CalendarDays,ArrowUpRight,PackageOpen,ChartNoAxesCombined,Users,LockKeyhole} from 'lucide-react';
import {projects,classStats} from './domain';

export default function TeacherHero({data,lessons,classId,setClassId,ready,autoSchedule,navigate,canView,signIn}){
 return <section className="teacher-hero">
  <div className="hero-copy">
   <span className="hero-eyebrow">2026 · 백동초등학교</span>
   <h2>인구교육 프로젝트 수업 계획하기</h2>
   <p>학급별 상황에 맞게 운영 계획하기</p>
   <div className="hero-actions"><button className="primary" onClick={autoSchedule}><CalendarDays size={17}/>남은 진도 자동 배정</button>{canView&&<button className="secondary" onClick={()=>navigate('calendar')}>수업 달력<ArrowUpRight size={16}/></button>}</div>
   <div className="hero-facts"><span><b>3</b>개 프로젝트</span><span><b>30</b>차시</span><span><b>{data.classes.length}</b>개 반</span></div>
  </div>
  {canView?<div className="hero-plan">
   <div className="hero-plan-top"><span>우리 반 진도</span><label className="class-select"><Users size={15}/><select aria-label="플랜의 반 선택" value={classId} onChange={e=>setClassId(e.target.value)}>{data.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
   <div className="deadline-display"><CalendarDays size={17}/><small>프로젝트 2·3</small><strong>11월 25일까지 완료</strong></div>
   <div className="hero-projects">{projects.slice(1).map(p=>{const ls=lessons.filter(l=>l.project===p.id),s=classStats(classId,data.progress,ls),Icon=p.id===2?PackageOpen:ChartNoAxesCombined;return <div className={`hero-project p${p.id}`} key={p.id}><span className="hero-project-number"><Icon size={20}/></span><div><b>{p.short}</b><small>{ready?`${s.activity}/${ls.length}차시 완료`:'기록 불러오는 중…'}</small><span className="progress-track"><i style={{width:`${s.percent}%`}}/></span></div></div>;})}</div>
  </div>:<div className="hero-plan private-plan"><LockKeyhole size={23}/><div><b>학급별 수업 기록</b><p>Google 로그인 후 진행 상황과<br/>1~3반 수업 달력을 확인할 수 있어요.</p></div><button className="secondary" onClick={signIn}>로그인하고 확인하기<ArrowUpRight size={15}/></button></div>}
 </section>;
}
