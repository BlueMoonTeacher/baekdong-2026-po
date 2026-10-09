import React from 'react';
import {Users} from 'lucide-react';
import {projects} from './domain';
export function ClassSelect({classes,value,onChange,all,label='반 선택'}){return <label className="class-select"><Users size={17}/><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{all&&<option value="all">전체 반</option>}{classes.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>;}
export function ProjectTabs({project,setProject}){return <div className="project-tabs">{[{id:0,short:'전체 프로젝트'},...projects].map(p=><button key={p.id} className={project===p.id?'active':''} onClick={()=>setProject(p.id)}>{p.id?`P${p.id} ${p.short}`:p.short}</button>)}</div>;}
