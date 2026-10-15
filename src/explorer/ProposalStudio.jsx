import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,Check,ChevronLeft,ChevronRight,Download,Eye,FileText,MapPin,Printer,X} from 'lucide-react';
import map from './map.json';
import PictogramImage from './PictogramImage.jsx';
import PolicySource from './PolicySource.jsx';
import {channels,proposalFilename} from './proposal-domain.mjs';
import {canvasBlob,prepareProposalImages} from './proposal-image.mjs';

function ImagePreview({form,notes,policies,onClose,onSaved}){
 const [pages,setPages]=useState([]),[index,setIndex]=useState(0),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const canvas=useRef(null),close=useRef(null);
 useEffect(()=>{
  let active=true;prepareProposalImages(form,notes,policies).then(result=>{if(active)setPages(result);}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[form,notes,policies]);
 useEffect(()=>{if(!pages[index]||!canvas.current)return;const src=pages[index](),out=canvas.current;out.width=src.width;out.height=src.height;out.getContext('2d').drawImage(src,0,0);},[pages,index]);
 useEffect(()=>{
  const before=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';close.current?.focus();
  const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){
   const items=[...document.querySelectorAll('.proposal-image-modal button:not(:disabled)')],first=items[0],last=items.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }};
  document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);before?.focus();};
 },[onClose]);
 async function download(){
  setSaving(true);setError('');
  try{const blob=await canvasBlob(canvas.current),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=proposalFilename(form,pages.length>1?index+1:0);link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);onSaved();}
  catch(e){setError(e.message);}finally{setSaving(false);}
 }
 return <div className="proposal-image-backdrop" onClick={onClose}><section className="proposal-image-modal" role="dialog" aria-modal="true" aria-label="제안서 이미지 미리보기" onClick={e=>e.stopPropagation()}>
  <header><h2>제안서 이미지</h2><button ref={close} aria-label="이미지 미리보기 닫기" title="닫기" onClick={onClose}><X/></button></header>
  <div className="proposal-image-actions"><div><button title="이전 쪽" aria-label="이미지 이전 쪽" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ChevronLeft/></button><span>{pages.length?`${index+1} / ${pages.length}`:'이미지 준비 중'}</span><button title="다음 쪽" aria-label="이미지 다음 쪽" disabled={index>=pages.length-1} onClick={()=>setIndex(i=>i+1)}><ChevronRight/></button></div><button className="explore-primary" disabled={!pages.length||saving} onClick={download}><Download size={19}/>{saving?'저장 중':'PNG 내려받기'}</button></div>
  {error&&<p className="proposal-error" role="alert">{error}</p>}
  {pages.length>1&&<p className="proposal-page-note">내용을 모두 담아 {pages.length}쪽으로 나뉘었어요. 각 쪽을 저장해 함께 올려요.</p>}
  <div className="proposal-image-paper">{pages.length?<canvas ref={canvas} aria-label={`제안서 ${index+1}쪽 미리보기`} role="img"/>:<p>제안서를 이미지로 만들고 있어요.</p>}</div>
 </section></div>;
}

export default function ProposalStudio({form,setForm,notes,setNotes,savedPolicies,basePolicy,onUsePolicy,onRemovePolicy,onReadPolicy,onNavigate,onExportText,onNotice,localSaved}){
 const [preview,setPreview]=useState(false),[pending,setPending]=useState(null);
 const closePreview=useCallback(()=>setPreview(false),[]);
 const projectPolicies=basePolicy?[basePolicy,...savedPolicies.filter(p=>p.id!==basePolicy.id)]:savedPolicies;
 const openPreview=()=>setPreview({form:{...form},notes:[...notes],policies:projectPolicies});
 function update(key,value){setForm(f=>({...f,[key]:value,reviewed:key==='reviewed'?value:false}));}
 function choose(policy){
  if(basePolicy&&form.policySummary&&form.policySummary!==(basePolicy.learning?.summary||basePolicy.high)){setPending(policy);return;}
  onUsePolicy(policy);
 }
 const field=(key,label,placeholder,rows=3)=><label key={key}>{label}<textarea maxLength={4000} rows={rows} value={form[key]||''} onChange={e=>update(key,e.target.value)} placeholder={placeholder}/></label>;
 return <>
  <div className="proposal-project-heading"><div><span className="explore-eyebrow">6학년 · 우리 동네 정책 연결 프로젝트</span><h1>필요한 이웃에게 닿는 정책</h1></div><button className="explore-primary" onClick={openPreview}><Eye size={19}/>이미지 미리보기 · 저장</button></div>
  <ol className="proposal-workflow"><li><b>1</b>기존 정책 이해</li><li><b>2</b>필요한 이웃에게 전달</li><li><b>3</b>반응 확인 · 개선 제안</li></ol>
  <div className="proposal-studio"><section className="proposal-editor" aria-label="제안서 작성">
   <div className="proposal-editor-title"><h2>정책 전달·개선 제안서</h2><span className={localSaved?'draft-saved':'draft-warning'}>{localSaved?'초안 저장됨':'기기 저장 불가'}</span></div>
   <div className="proposal-editor-row"><label>제안자 또는 모둠명<input maxLength={80} value={form.author||''} onChange={e=>update('author',e.target.value)} placeholder="예: 6학년 1반 함께모둠"/></label><label>살펴본 지역<select value={form.region||'양산시 전체'} onChange={e=>update('region',e.target.value)}><option>양산시 전체</option>{map.districts.map(d=><option key={d.code}>{d.name}</option>)}</select></label></div>
   <label>제안 이름<input maxLength={150} value={form.title||''} onChange={e=>update('title',e.target.value)} placeholder="예: 밤에도 도움을 찾을 수 있는 우리 동네"/></label>
   <section className="proposal-editor-section"><h3><b>1</b>기존 정책 이해</h3>
    {basePolicy?<div className="proposal-base-info" data-policy-id={basePolicy.id}><PictogramImage name={basePolicy.category}/><div><strong>{basePolicy.title}</strong><p>원문 대상: {basePolicy.target}</p><PolicySource policy={basePolicy} worksheet compact/>{basePolicy.learning&&<details><summary>원문의 지원 내용</summary><ul>{basePolicy.learning.facts.map(fact=><li key={fact}>{fact}</li>)}</ul></details>}{basePolicy.conflict&&<p className="proposal-error">원문 안내가 서로 달라요. 현재 기준 확인이 필요합니다.</p>}</div><button className="proposal-icon" title="기본 정책 선택 해제" aria-label="기본 정책 선택 해제" onClick={()=>update('basePolicyId','')}><X size={18}/></button></div>:<div className="proposal-empty"><BookOpen size={22}/><span>바탕이 될 정책을 선택해 주세요.</span><button className="explore-secondary" onClick={()=>onNavigate('policies')}>정책 찾기</button></div>}
    {field('policySummary','정책의 도움을 우리말로 정리하기','이 정책은 어떤 도움을 주나요? 지원 대상·조건과 도움을 구분해 써요.')}
   </section>
   <section className="proposal-editor-section"><h3><b>2</b>필요한 이웃에게 전달</h3>
    <label>이 안내를 전할 이웃<input maxLength={300} value={form.target||''} onChange={e=>update('target',e.target.value)} placeholder="예: 늦은 밤 문 연 약국을 찾는 가족"/></label>
    {field('problem','발견한 전달의 어려움 · 확인할 질문','정책을 모르거나 이해하기 어려운가요? 누구에게 무엇을 물어 확인할까요? 소득이나 실제 수급 여부는 묻지 않아요.')}
    {field('message','우리가 전할 핵심 안내','누구를 위한 도움인지, 어떤 도움인지, 어디에 문의할지 이웃의 눈높이로 써요.')}
    <label>전달 방법<select value={channels.includes(form.channel)?form.channel:channels[0]} onChange={e=>update('channel',e.target.value)}>{channels.map(channel=><option key={channel}>{channel}</option>)}</select></label>
    {field('idea','우리의 전달계획','언제, 어디서, 어떤 안내물을 누구에게 전할까요? 읽기 쉬운 글씨·그림과 문의 방법도 생각해요.',4)}
    {field('measure','이해와 반응을 확인할 방법','읽은 사람이 대상·도움·다음 행동을 설명할 수 있나요? 배포 횟수만으로 혜택 이용이 늘었다고 판단하지 않아요.')}
   </section>
   <section className="proposal-editor-section"><h3><b>3</b>반응 확인 · 개선 제안</h3>
    {field('feedback','실제로 나눈 뒤 알게 된 점','누구에게 어떤 반응을 들었나요? 확인한 사실과 아직 확인하지 못한 생각을 나눠 써요.')}
    {field('improvement','전달·이용을 더 편하게 할 개선 제안','안내가 어렵거나 문의·신청이 불편한 점을 어떻게 바꿀까요? 새로운 혜택을 꼭 만들 필요는 없어요.')}
    <details open={!!(form.benefit||form.needs)}><summary>기대하는 변화 · 필요한 것</summary>{field('benefit','기대하는 변화','어떤 이웃이 어떻게 도움을 찾기 쉬워질까요?')}{field('needs','필요한 것 · 해결할 어려움','사람, 장소, 비용, 게시 허락은? 다른 이웃의 개인정보를 드러내지는 않나요?')}</details>
   </section>
   <label className="proposal-review"><input type="checkbox" checked={!!form.reviewed} onChange={e=>update('reviewed',e.target.checked)}/><span>공유할 내용의 대상·금액·기간·문의처를 최신 공식 안내와 대조하고 선생님과 검토했어요.</span></label>
   <div className="proposal-bottom-actions"><button className="explore-primary" onClick={openPreview}><Eye size={19}/>이미지 미리보기 · 저장</button><button className="proposal-icon" aria-label="제안서 텍스트 내려받기" title="텍스트 내려받기" onClick={onExportText}><FileText/></button><button className="proposal-icon" aria-label="제안서 인쇄 또는 PDF 저장" title="인쇄 · PDF 저장" onClick={()=>window.print()}><Printer/></button></div>
   <p className="proposal-sharing-note">학생의 탐구 초안이며 양산시 공식 안내가 아닙니다. 공개할 때는 모둠명이나 별칭을 써도 좋아요.</p>
  </section>
  <aside className="proposal-materials" aria-label="제안서에 담은 자료">
   <section className="proposal-material-section"><header><h2>담아둔 정책</h2><span>{savedPolicies.length} / 6</span></header>
    {pending&&<div className="proposal-replace" role="alert"><b>정책 요약을 새 정책으로 바꿀까요?</b><p>작성한 전달계획과 개선 제안은 그대로 남습니다.</p><button onClick={()=>{onUsePolicy(pending);setPending(null);}}>바꾸기</button><button onClick={()=>setPending(null)}>취소</button></div>}
    {!savedPolicies.length&&<p className="proposal-material-empty">아직 담아둔 정책이 없습니다.</p>}
    {savedPolicies.map(p=><article className={`proposal-policy ${basePolicy?.id===p.id?'is-base':''}`} data-policy-id={p.id} key={p.id}><div className="proposal-policy-title"><PictogramImage name={p.category}/><h3>{p.title}</h3><button className="proposal-icon" title="목록에서 빼기" aria-label={`${p.title} 담기 취소`} onClick={()=>{onRemovePolicy(p);if(pending?.id===p.id)setPending(null);}}><X size={18}/></button></div><p>{p.learning?.summary||p.high}</p><div className="proposal-policy-actions"><button className="proposal-use" disabled={basePolicy?.id===p.id} onClick={()=>choose(p)}>{basePolicy?.id===p.id?<Check size={17}/>:<ArrowLeft size={17}/>} {basePolicy?.id===p.id?'기본 정책으로 선택됨':'기본정보로 가져오기'}</button><button className="proposal-icon" title="정책 자세히 읽기" aria-label={`${p.title} 자세히 읽기`} onClick={()=>onReadPolicy(p)}><BookOpen size={18}/></button></div></article>)}
    <button className="explore-secondary" onClick={()=>onNavigate('policies')}><BookOpen size={18}/>정책 더 찾기</button>
   </section>
   <section className="proposal-material-section"><header><h2>인구 자료 근거</h2><span>{notes.length} / 12</span></header>{notes.map(x=><article className="proposal-population-note" key={x.id}><button className="proposal-icon" title="인구 근거 삭제" aria-label="인구 근거 삭제" onClick={()=>setNotes(s=>s.filter(r=>r.id!==x.id))}><X size={18}/></button><p>{x.text}</p><small>기준 {x.period} · 수집 {x.fetchedAt?.slice(0,10)}</small><a href="https://www.data.go.kr/data/15082066/openapi.do" target="_blank" rel="noreferrer">지역별 인구 자료 출처</a></article>)}{!notes.length&&<p className="proposal-material-empty">아직 담아둔 인구 자료가 없습니다.</p>}<button className="explore-secondary" onClick={()=>onNavigate('map')}><MapPin size={18}/>지도 살펴보기</button></section>
  </aside></div>
  {preview&&<ImagePreview form={preview.form} notes={preview.notes} policies={preview.policies} onClose={closePreview} onSaved={()=>onNotice('제안서 PNG를 저장했어요. 패들렛에 올릴 때 개인정보를 확인해요.')}/>}
 </>;
}
