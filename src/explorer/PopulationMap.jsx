import React,{useRef,useState} from 'react';
import {Minus,Plus,RotateCcw} from 'lucide-react';
import map from './map.json';
import {number as n,populationColor,populationBin} from './domain.mjs';

export default function PopulationMap({rows,code,onSelect,metric,easy}){
 const [view,setView]=useState({x:0,y:0,zoom:1});
 const pointers=useRef(new Map()),gesture=useRef(null);
 const byCode=new Map(rows.map(r=>[r.code,r]));
 const districts=[...map.districts.filter(d=>d.code!==code),...map.districts.filter(d=>d.code===code)];
 const lift=d=>({transform:d.code===code?'translateY(-12px) scale(1.06)':'translateY(0) scale(1)',transformOrigin:`${d.label[0]}px ${d.label[1]}px`});
 const constrain=v=>({...v,x:Math.max(0,Math.min(700-700/v.zoom,v.x)),y:Math.max(0,Math.min(630-630/v.zoom,v.y))});
 function zoomBy(factor){setView(v=>{const zoom=Math.max(1,Math.min(3,v.zoom*factor));return constrain({zoom,x:v.x+(700/v.zoom-700/zoom)/2,y:v.y+(630/v.zoom-630/zoom)/2});});}
 function down(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const points=[...pointers.current.values()];
  gesture.current={view,points,rect:e.currentTarget.getBoundingClientRect(),code:e.target.closest('[data-district]')?.getAttribute('data-district'),moved:points.length>1};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function move(e){
  if(!pointers.current.has(e.pointerId)||!gesture.current)return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const g=gesture.current,points=[...pointers.current.values()];
  if(points.length===2&&g.points.length===2){
   const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   const zoom=Math.max(1,Math.min(3,g.view.zoom*distance(points)/Math.max(distance(g.points),1)));
   setView(constrain({zoom,x:g.view.x+(700/g.view.zoom-700/zoom)/2,y:g.view.y+(630/g.view.zoom-630/zoom)/2}));g.moved=true;
  }else if(points.length===1&&g.points.length===1){
   const dx=points[0].x-g.points[0].x,dy=points[0].y-g.points[0].y;
   if(Math.hypot(dx,dy)>8)g.moved=true;
   // SVG uses a centered, aspect-preserving viewport, including its letterboxing.
   const scale=Math.min(g.rect.width/(700/g.view.zoom),g.rect.height/(630/g.view.zoom));
   if(g.moved)setView(constrain({...g.view,x:g.view.x-dx/scale,y:g.view.y-dy/scale}));
  }
 }
 function up(e){
  const g=gesture.current;
  if(e.type!=='pointercancel'&&pointers.current.size===1&&g&&!g.moved&&g.code)onSelect(g.code);
  pointers.current.delete(e.pointerId);
  gesture.current=null;
 }
 return <div className="population-map-stage">
  <svg className="population-map" viewBox={`${view.x} ${view.y} ${700/view.zoom} ${630/view.zoom}`} aria-label="양산시 읍면동 인구 지도" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
   <text className="population-neighbor" x="320" y="23" textAnchor="middle">밀양 · 울산</text>
   <text className="population-neighbor" x="75" y="460" transform="rotate(-65 75 460)">낙동강 · 김해</text>
   <text className="population-neighbor" x="440" y="619">부산</text>
   {/* District fills cover shared edges, leaving the gray stroke only outside the city. */}
   <g className="population-city-outline" aria-hidden="true" pointerEvents="none">
    {map.districts.map(d=><path key={d.code} d={d.path} fill="none"/>)}
   </g>
   {districts.map(d=>{
    const row=byCode.get(d.code),selected=code===d.code;
    return <path key={d.code} d={d.path} style={lift(d)} data-district={d.code} fill={populationColor(row,metric)} fillRule="evenodd" className={selected?'selected':''} role="button" tabIndex="0" aria-pressed={selected} aria-label={`${d.name} 지도에서 선택`} onClick={e=>{if(e.detail===0)onSelect(d.code);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(d.code);}}}><title>{d.name} · {n(row?.total)}명{row?.derived?' · 계산값':''}</title></path>;
   })}
   {districts.map(d=>{
    const row=byCode.get(d.code),dark=metric==='population'?populationBin(row?.total)?.dark:Number.isFinite(row?.change)&&row.change!==0;
    const value=metric==='change'?(!Number.isFinite(row?.change)?'자료 없음':`${row.change>0?'+':''}${n(row.change)}`):n(row?.total);
    return <g key={d.code} className="population-label-lift" style={lift(d)} pointerEvents="none"><g className={`population-map-label ${dark?'on-dark':''}`} transform={`translate(${d.label[0]} ${d.label[1]})`}><text textAnchor="middle">{d.name}</text>{!['51000','51500'].includes(d.code)&&<text y="18" className="population-map-value" textAnchor="middle">{easy&&metric==='change'?(row?.change>0?'늘었어요':row?.change<0?'줄었어요':row?.change===0?'같아요':'자료 없음'):value}</text>}</g></g>;
   })}
  </svg>
  <div className="population-zoom" aria-label="지도 확대 도구">
   <button aria-label="지도 확대" title="지도 확대" disabled={view.zoom>=3} onClick={()=>zoomBy(1.3)}><Plus/></button>
   <button aria-label="지도 축소" title="지도 축소" disabled={view.zoom<=1} onClick={()=>zoomBy(1/1.3)}><Minus/></button>
   <button aria-label="지도 처음 크기" title="지도 처음 크기" onClick={()=>setView({x:0,y:0,zoom:1})}><RotateCcw size={20}/></button>
  </div>
 </div>;
}
