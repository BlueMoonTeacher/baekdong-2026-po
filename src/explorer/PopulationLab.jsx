import React,{useEffect,useId,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,BarChart3,ChartNoAxesCombined,Equal,GitCompareArrows,Maximize,Minimize,Pause,Play,Plus,RotateCcw,Users} from 'lucide-react';
import map from './map.json';
import PopulationMap from './PopulationMap.jsx';
import SgisDetail from './SgisDetail.jsx';
import PictogramImage from './PictogramImage.jsx';
import {number as n,monthText,pct,ageGroups,districtHistory,changeText,populationBins,changeColors,changeScale,changePictureUnit,populationPictures} from './domain.mjs';

export function LevelSwitch({mode,onChange}){
 return <div className="level-switch" aria-label="학년별 탐험"><button aria-pressed={mode==='low'} className={mode==='low'?'selected':''} onClick={()=>onChange('low')}>저학년</button><button aria-pressed={mode==='high'} className={mode==='high'?'selected':''} onClick={()=>onChange('high')}>고학년</button><button aria-pressed={mode==='sixth'} className={mode==='sixth'?'selected':''} onClick={()=>onChange('sixth')}>6학년 수업</button></div>;
}
function PersonMark({fraction=1,large=false}){
 const id=useId().replaceAll(':','');
 return <svg className={large?'person-large':'person-small'} viewBox="0 0 20 32" aria-hidden="true"><defs><clipPath id={id}><rect width={20*fraction} height="32"/></clipPath></defs><g className="person-empty"><circle cx="10" cy="5" r="4"/><path d="M5 11h10l4 11-3 1-3-8v16H10.8v-10H9.2v10H7V15l-3 8-3-1z"/></g><g className="person-filled" clipPath={`url(#${id})`}><circle cx="10" cy="5" r="4"/><path d="M5 11h10l4 11-3 1-3-8v16H10.8v-10H9.2v10H7V15l-3 8-3-1z"/></g></svg>;
}
function PictureKey(){
 return <div className="lab-picture-key lab-mixed-key"><span><PersonMark large/><b>큰 그림 = 10,000명</b></span><span><PersonMark/><b>작은 그림 = 1,000명</b></span></div>;
}
function Pictogram({total,unit=1000,mixed=false}){
 const value=total/unit,pictures=mixed?populationPictures(total):Array.from({length:Math.ceil(value)},(_,i)=>({unit,fraction:Math.min(1,value-i)}));
 return <div className={`lab-people ${mixed?'lab-mixed-people':''}`} role="img" aria-label={`${n(total)}명, ${mixed?'큰 사람 그림은 10,000명, 작은 사람 그림은 1,000명':`사람 그림 하나는 ${n(unit)}명`}`}>
  {pictures.map((p,i)=><PersonMark key={i} fraction={p.fraction} large={mixed&&p.unit===10000}/>)}
 </div>;
}
function Comparison({selected,other,easy}){
 const max=Math.max(selected.total,other.total,1),diff=Math.abs(selected.total-other.total);
 return <div className="lab-comparison">
  {easy&&<PictureKey/>}
  {[selected,other].map((r,i)=><div className={`lab-compare-row compare-${i}`} key={r.code}><div><b>{r.name}</b><strong>{n(r.total)}<small>명</small></strong></div>{easy?<Pictogram total={r.total} mixed/>:<div className="lab-bar-track"><span style={{width:`${pct(r.total,max)}%`}}/></div>}{r.derived&&<small>시 전체에서 뺀 계산값</small>}</div>)}
  <p className="lab-answer">{diff===0?'두 동네의 사람 수가 같아요.':<><b>{selected.total>other.total?selected.name:other.name}</b>에 <b>{n(diff)}명</b> 더 살아요.</>}</p>
  <p className="lab-caption">{easy?'두 동네에 같은 그림 기준을 써요. 남은 수는 작은 그림을 일부 칠했어요.':'막대는 0명부터 · 같은 길이는 같은 사람 수예요.'}</p>
 </div>;
}
function History({history,easy}){
 if(history.length<2)return <p className="lab-answer">이때까지의 비교 자료가 더 필요해요.</p>;
 const shown=easy?history:history.slice(-6),first=shown[0],last=shown.at(-1),difference=last.total-first.total;
 const unit=changePictureUnit(difference),scale=changeScale(shown.map(r=>r.change));
 const direction=difference>0?'increase':difference<0?'decrease':'unchanged',DirectionIcon=difference>0?ArrowUp:difference<0?ArrowDown:Equal;
 return <div className={`lab-history ${direction}`}>
  <div className="history-endpoints"><div><span>{monthText(first.period)}</span><b>{n(first.total)}<small>명</small></b></div><span className="history-to">→</span><div><span>{monthText(last.period)}</span><b>{n(last.total)}<small>명</small></b></div></div>
  <div className="history-change-summary"><DirectionIcon size={30}/><div><strong>{n(Math.abs(difference))}<small>명</small></strong><span>{difference>0?'늘었어요':difference<0?'줄었어요':'변화가 없어요'}</span></div>{!easy&&<b>{difference>0?'+':''}{pct(difference,first.total).toFixed(2)}%</b>}</div>
  {easy?<><h3>두 때의 사람 수 차이</h3>{difference!==0?<><Pictogram total={Math.abs(difference)} unit={unit}/><p className="lab-caption">그림 하나 = {n(unit)}명 · 마지막 그림은 남은 수만큼 칠했어요.</p></>:<p className="lab-answer">처음과 지금의 사람 수가 같아요.</p>}<p className="lab-question">{difference<0?'사람 수가 줄어든 까닭은 무엇일까요?':difference>0?'사람 수가 늘어난 까닭은 무엇일까요?':'그 사이 동네에는 어떤 일이 있었을까요?'} 숫자만으로 이유를 알 수는 없어요.</p></>:<>
   <h3>월마다 늘고 줄어든 사람 수</h3>
   <div className="change-chart" role="img" aria-label={shown.map(r=>`${monthText(r.period)} 전월 대비 ${changeText(r.change)}`).join(', ')}>
    <div className="change-chart-axis"><span>기준 월</span><div><span>−{n(scale)}명</span><b>0</b><span>+{n(scale)}명</span></div><span>전월 증감</span></div>
    {shown.map(r=>{const available=Number.isFinite(r.change),width=available?Math.abs(r.change)/scale*50:0;return <div className={`change-chart-row ${available?(r.change<0?'decrease':r.change>0?'increase':'unchanged'):'missing'}`} key={r.period}><span>{r.period.slice(2).replace('-','.')}</span><div className="change-chart-track"><i className="change-chart-zero"/>{available&&r.change!==0&&<i className="change-chart-bar" style={{left:`${r.change<0?50-width:50}%`,width:`${width}%`}}/>}{available&&r.change===0&&<i className="change-chart-dot"/>}</div><b>{available?`${r.change>0?'+':''}${n(r.change)}명`:'자료 없음'}</b></div>;})}
   </div><p className="lab-caption">0에서 왼쪽은 감소, 오른쪽은 증가 · 최근 6개 관측 월의 전월 증감이에요. 빠진 달은 채우지 않아요. 위의 전체 기간 차이와 각 달의 전월 증감은 기준이 달라요.</p>
   <details><summary>월별 숫자와 전월 증감</summary><table><thead><tr><th>기준 월</th><th>인구</th><th>전월 증감</th></tr></thead><tbody>{history.map(r=><tr key={r.period}><td>{r.period}</td><td>{n(r.total)}</td><td>{Number.isFinite(r.change)?`${r.change>0?'+':''}${n(r.change)}`:'자료 없음'}</td></tr>)}</tbody></table></details>
  </>}
 </div>;
}
export default function PopulationLab({data,connection,period,onPeriod,code,onCode,mode,onMode,addNote}){
 const [board,setBoard]=useState(false),[metric,setMetric]=useState('population'),[detail,setDetail]=useState('population'),[compare,setCompare]=useState('31000'),[playing,setPlaying]=useState(false),[resetVersion,setResetVersion]=useState(0);
 const root=useRef(null),wasFullscreen=useRef(false);
 const easy=mode==='low',rows=data.region.filter(r=>r.period===period),selected=rows.find(r=>r.code===code)||rows[0],city=rows.reduce((s,r)=>s+r.total,0);
 const comparisonCode=compare===selected?.code?rows.find(r=>r.code!==selected.code)?.code:compare,other=rows.find(r=>r.code===comparisonCode);
 const history=districtHistory(data,selected?.code,period),index=data.periods.indexOf(period);
 const age=data.ages.filter(r=>r.period<=period).at(-1),groups=age?ageGroups(age.bands):[];
 useEffect(()=>{if(easy&&detail==='ages')setDetail('population');},[easy,detail]);
 useEffect(()=>{
  if(!playing)return;
  const timer=setTimeout(()=>{if(index>=data.periods.length-1){setPlaying(false);return;}onPeriod(data.periods[index+1]);},1800);
  return()=>clearTimeout(timer);
 },[playing,index,data.periods,onPeriod]);
 useEffect(()=>{
  const changed=()=>{if(document.fullscreenElement){wasFullscreen.current=true;}else if(wasFullscreen.current){wasFullscreen.current=false;setBoard(false);setPlaying(false);}};
  const esc=e=>{if(e.key==='Escape'){setPlaying(false);setBoard(false);}};
  document.addEventListener('fullscreenchange',changed);document.addEventListener('keydown',esc);
  return()=>{document.removeEventListener('fullscreenchange',changed);document.removeEventListener('keydown',esc);};
 },[]);
 useEffect(()=>{if(!board)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[board]);
 async function toggleBoard(){
  if(board){setBoard(false);setPlaying(false);if(document.fullscreenElement===root.current)await document.exitFullscreen().catch(()=>{});}
  else{setBoard(true);try{await root.current.requestFullscreen?.();}catch{/* The expanded layout also works in browsers without fullscreen permission. */}}
 }
 function moveMonth(next){setPlaying(false);onPeriod(data.periods[Math.max(0,Math.min(data.periods.length-1,next))]);}
 function play(){if(!playing&&index>=data.periods.length-1)onPeriod(data.periods[0]);setPlaying(v=>!v);}
 function reset(){setPlaying(false);onPeriod(data.latestPeriod);onCode('25300');setCompare('31000');setMetric('population');setDetail('population');setResetVersion(v=>v+1);}
 const stateText={live:'공공데이터 연결',loading:'저장본 · 연결 확인 중',stale:'저장본 · 갱신 지연',snapshot:'저장본 · 오프라인',failed:'저장본 · 오프라인'}[connection];
 const ChangeIcon=!Number.isFinite(selected?.change)?Users:selected.change>0?ArrowUp:selected.change<0?ArrowDown:Equal;
 if(!selected)return <p>이달의 동네 자료가 없습니다.</p>;
 return <section ref={root} className={`population-lab ${board?'is-board':''} ${easy?'is-easy':'is-advanced'}`} aria-label="양산 인구 탐험 공간">
  <div className="lab-header">{board&&<div className="lab-title"><img src="/images/yangsan-city-logo.png" alt=""/><h1>양산 인구 탐험</h1></div>}<div className="lab-board-level"><LevelSwitch mode={mode} onChange={onMode}/></div><div className="lab-timeline-control"><button className="lab-play" title={playing?'시간 멈추기':'시간 재생'} aria-label={playing?'시간 멈추기':'시간 재생'} aria-pressed={playing} onClick={play}>{playing?<Pause size={21}/>:<Play size={21}/>}</button><select aria-label="인구 기준 월" value={period} onChange={e=>{setPlaying(false);onPeriod(e.target.value);}}>{data.periods.toReversed().map(p=><option key={p} value={p}>{monthText(p)}</option>)}</select></div><div className="lab-header-actions"><button className="lab-icon-button" title="처음부터 탐험" aria-label="탐험 처음으로" onClick={reset}><RotateCcw size={21}/></button><button className="lab-fullscreen" aria-label={board?'전체 화면 종료':'전체 화면'} title={board?'전체 화면 종료':'전체 화면'} onClick={toggleBoard}>{board?<Minimize size={21}/>:<Maximize size={21}/>}<span>{board?'전체 화면 종료':'전체 화면'}</span></button></div></div>
  <div className="lab-map-toolbar"><div className="lab-metric" aria-label="지도에 표시할 정보"><button aria-pressed={metric==='population'} className={metric==='population'?'active':''} onClick={()=>{setMetric('population');setDetail('population');}}><Users size={20}/>사람 수</button><button aria-pressed={metric==='change'} className={metric==='change'?'active':''} onClick={()=>{setMetric('change');setDetail('change');}}><ChartNoAxesCombined size={20}/>{easy?'늘었을까?':'인구 변화'}</button></div><span className="lab-city-total">양산시 전체 <strong>{n(city)}</strong>명</span></div>
  <div className="lab-workspace">
   <section className="lab-map-area" aria-label="동네 선택"><PopulationMap key={resetVersion} rows={rows} code={selected.code} onSelect={onCode} metric={metric} easy={easy}/><div className="lab-legend" aria-label="지도 색상 기준">{(metric==='population'?populationBins.map(b=>[b.color,b.label]):[[changeColors.increase,'늘었어요'],[changeColors.decrease,'줄었어요'],[changeColors.unchanged,'같아요'],[changeColors.missing,'자료 없음']]).map(([color,label])=><span key={label}><i style={{background:color}}/>{label}</span>)}</div><div className="lab-districts" aria-label="동네 이름으로 선택">{map.districts.map(d=><button key={d.code} aria-pressed={selected.code===d.code} className={selected.code===d.code?'active':''} onClick={()=>onCode(d.code)}>{d.name}</button>)}</div></section>
   <aside className="lab-detail" aria-label="선택한 동네 상세">
    <div className="lab-district-heading" aria-live="polite" aria-atomic="true"><div><span>지금 살펴보는 동네</span><h2>{selected.name}</h2></div><div className="lab-selected-total"><strong>{n(selected.total)}</strong><span>명 · {monthText(period)}</span></div></div>
    <div className="lab-detail-tabs" role="tablist" aria-label="동네 탐구 주제">{[['population',easy?'그림으로':'인구 구성',Users],['change',easy?'전과 지금':'월별 변화',BarChart3],['compare','동네 비교',GitCompareArrows],['sgis','동네 자세히',Users],...(!easy?[['ages','양산의 세대',Users]]:[])].map(([id,label,Icon])=><button key={id} id={`lab-tab-${id}`} role="tab" aria-selected={detail===id} aria-controls="lab-detail-panel" className={detail===id?'active':''} onClick={()=>setDetail(id)}><Icon size={19}/>{label}</button>)}</div>
    <div className="lab-detail-content" id="lab-detail-panel" role="tabpanel" aria-labelledby={`lab-tab-${detail}`} tabIndex="0">
     {detail==='population'&&<>
      <div className={`lab-change ${selected.change<0?'decrease':''}`}><ChangeIcon size={24}/><span>지난달보다 <b>{changeText(selected.change,easy)}</b></span></div>
      {easy?<><PictureKey/><Pictogram total={selected.total} mixed/><p className="lab-caption">마지막 작은 그림은 남은 사람 수만큼 칠했어요.</p><p className="lab-question">이곳에 사는 사람들은 어디에서 만날까요?</p></>:<><div className="lab-share"><span>양산시 인구에서 차지하는 비율</span><strong>{pct(selected.total,city).toFixed(1)}<small>%</small></strong><div className="lab-bar-track"><span style={{width:`${pct(selected.total,city)}%`}}/></div></div><h3>남녀 인구 구성</h3><div className="lab-sex-bar" role="img" aria-label={`남자 ${n(selected.male)}명, 여자 ${n(selected.female)}명`}><span style={{width:`${pct(selected.male,selected.total)}%`}}/><span style={{width:`${pct(selected.female,selected.total)}%`}}/></div><div className="lab-sex-counts"><div><i/><span>남자</span><b>{n(selected.male)}명</b><small>{pct(selected.male,selected.total).toFixed(1)}%</small></div><div><i/><span>여자</span><b>{n(selected.female)}명</b><small>{pct(selected.female,selected.total).toFixed(1)}%</small></div></div><p className="lab-question">땅의 넓이와 사람 수는 어떤 관계일까요?</p></>}
     </>}
     {detail==='change'&&<History history={history} easy={easy}/>}
     {detail==='compare'&&<><label className="lab-compare-select">비교할 동네<select aria-label="비교할 동네" value={comparisonCode} onChange={e=>setCompare(e.target.value)}>{map.districts.filter(d=>d.code!==selected.code).map(d=><option key={d.code} value={d.code}>{d.name}</option>)}</select></label>{other&&<Comparison selected={selected} other={other} easy={easy}/>}</>}
     {detail==='sgis'&&<SgisDetail code={selected.code} easy={easy}/>}
     {detail==='ages'&&<><div className="lab-scope"><b>양산시 전체의 나이 자료</b><p>{age?`${monthText(age.period)} · ${n(age.total)}명`:'이때까지 검산된 연령 자료가 없습니다.'}</p><p>선택한 {selected.name}의 나이 분포는 아니에요.{age&&age.period!==period?' 선택한 달의 합계가 맞지 않아 검산된 최근 달을 보여줘요.':''}</p></div>{groups.map(g=><div className="lab-age-row" key={g.min}><div><b><PictogramImage name={g.icon}/>{g.label}</b><span>{n(g.total)}명 · {pct(g.total,age.total).toFixed(1)}%</span></div><div className="lab-bar-track"><span style={{width:`${pct(g.total,age.total)}%`,background:g.color}}/></div></div>)}{age&&<details><summary>5세 단위로 자세히 보기</summary><table><thead><tr><th>나이</th><th>인구</th><th>비율</th></tr></thead><tbody>{age.bands.map(b=><tr key={b.min}><td>{b.label}</td><td>{n(b.total)}</td><td>{pct(b.total,age.total).toFixed(1)}%</td></tr>)}</tbody></table></details>}</>}
     {selected.derived&&<p className="lab-derived">강서동은 시 전체에서 다른 12개 동네를 뺀 계산값이에요. 전월 증감도 같은 기준이에요.</p>}
    </div>
    {mode==='sixth'&&<div className="lab-evidence-action"><button className="explore-primary" onClick={addNote}><Plus size={19}/>제안서에 인구 근거 담기</button></div>}
   </aside>
  </div>
  <div className="lab-time"><div className="lab-time-slider"><div><span>{monthText(data.periods[0])}</span><label htmlFor="lab-month">{monthText(period)}</label><span>{monthText(data.periods.at(-1))}</span></div><input id="lab-month" aria-label="탐색할 월" aria-valuetext={monthText(period)} type="range" min="0" max={data.periods.length-1} step="1" value={Math.max(0,index)} onChange={e=>moveMonth(Number(e.target.value))}/></div></div>
  <div className="lab-data-status"><span><i className={connection==='live'?'live':''}/>{stateText} · 수집 {data.fetchedAt.slice(0,10)}</span><span>주민등록 인구 · 빈 달은 제외 · 행정경계 참고 지도</span></div>
 </section>;
}
