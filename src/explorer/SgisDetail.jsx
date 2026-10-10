import React,{useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {number as n} from './domain.mjs';
const cache=new Map();
const display=value=>value===null||value===undefined?'비공개·자료 없음':n(value);
export default function SgisDetail({code,easy}){
 const [year,setYear]=useState(''),[data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[area,setArea]=useState('');
 useEffect(()=>{let active=true;const controller=new AbortController();setData(null);setError('');setArea('');const key=`${code}:${year}`;
  (async()=>{try{let result=cache.get(key);if(!result){const response=await fetch(`/api/sgis?code=${code}${year?`&year=${year}`:''}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])});if(!response.ok)throw Error();result=await response.json();if(result.code!==code||!result.summary||!Array.isArray(result.areas))throw Error();cache.set(key,result);}if(active)setData(result);}catch{if(active)setError('동네 상세 자료에 연결하지 못했어요. 지도와 월별 인구는 계속 살펴볼 수 있어요.');}})();
  return()=>{active=false;controller.abort();};
 },[code,year,retry]);
 if(error)return <div className="sgis-message" role="status"><p>{error}</p><button className="explore-secondary" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={18}/>다시 연결</button></div>;
 if(!data)return <p role="status">SGIS에서 동네 상세 자료를 가져오고 있어요.</p>;
 const chosen=data.areas.find(a=>a.code===area),s=data.summary;
 return <div className="sgis-detail"><div className="sgis-heading"><h3>{data.name} 더 알아보기</h3><select aria-label="상세 통계 연도" value={data.year} onChange={e=>setYear(e.target.value)}>{data.years.map(y=><option key={y} value={y}>{y}년 총조사</option>)}</select></div>
  <p className="sgis-basis">{data.year}년 인구주택총조사 · 위의 월별 주민등록 인구와 기준이 달라요.</p>
  <dl className="sgis-metrics"><div><dt>사람 수</dt><dd>{display(s.total)}<small>명</small></dd></div><div><dt>함께 사는 가구</dt><dd>{display(s.households)}<small>가구</small></dd></div>{!easy&&<><div><dt>평균 나이</dt><dd>{display(s.averageAge)}<small>세</small></dd></div><div><dt>1㎢당 사람 수</dt><dd>{display(s.density)}<small>명</small></dd></div></>}</dl>
  <p className="sgis-explanation">{easy?'가구는 한집에서 살림을 함께하는 사람들을 말해요. 같은 동네 안에서도 사람 수는 다를 수 있어요.':'인구밀도는 사람 수를 땅의 넓이로 나눈 값이에요. 평균 나이는 모두의 나이를 더해 사람 수로 나눈 값이며, 가장 많은 나이를 뜻하지 않아요.'}</p>
  {!!data.areas.length&&<><h3>동네 안의 작은 통계 구역</h3><p className="sgis-basis">{data.areas.length}개 집계구 · 행정동·아파트 이름과는 다른 통계용 구역이에요. 현재 경계 API는 다른 연도여서 지도 위치와 연결하지 않았어요.</p><label className="sgis-area-select">살펴볼 구역<select aria-label="작은 통계 구역" value={area} onChange={e=>setArea(e.target.value)}><option value="">구역 선택</option>{data.areas.map(a=><option key={a.code} value={a.code}>{a.label} · {display(a.total)}명</option>)}</select></label>{chosen&&<div className="sgis-area-result" aria-live="polite"><b>{chosen.label}</b><strong>{display(chosen.total)}{chosen.total!==null&&'명'}</strong><small>{data.year}년 · 집계구 코드 {chosen.code}</small></div>}<details><summary>구역별 숫자 비교</summary><table><thead><tr><th>구역</th><th>사람 수</th></tr></thead><tbody>{data.areas.map(a=><tr key={a.code}><td>{a.label}</td><td>{display(a.total)}{a.total!==null&&'명'}</td></tr>)}</tbody></table></details></>}
  {data.areaError&&<p>{data.areaError}</p>}<p className="sgis-basis">비공개·누락 값은 0명으로 계산하지 않아요. 출처: <a href={data.sourceUrl} target="_blank" rel="noreferrer">SGIS 인구주택총조사</a></p>
 </div>;
}
