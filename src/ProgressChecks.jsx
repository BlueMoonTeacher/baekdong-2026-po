import React,{useEffect,useRef} from 'react';
import {Check,Minus} from 'lucide-react';
export {CHECK_COLUMNS,bulkProgressRows} from './progress.js';
export default function ProgressCheck({label,checked,mixed=false,disabled,onChange,header=false}) {
 const input=useRef(null);
 useEffect(()=>{if(input.current)input.current.indeterminate=mixed;},[mixed]);
 return <label className={`progress-check ${header?'bulk-check':''}`} title={header?`${label} · 선택한 반과 프로젝트 전체 완료 또는 해제`:label}>
  <input ref={input} type="checkbox" aria-label={header?`${label} 일괄 체크`:label} checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)}/>
  <span className="progress-check-box" aria-hidden="true">{mixed?<Minus size={14}/>:<Check size={14}/>}</span>
  {header&&<span>{label}</span>}
 </label>;
}
