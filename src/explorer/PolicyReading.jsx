import React from 'react';
import {BookOpen,FileText,Plus,Check,Users} from 'lucide-react';
import PolicySource from './PolicySource.jsx';
const terms=[['가구','한집에서 살림을 함께하는 사람들의 단위예요.'],['소득인정액','월 소득과 재산을 정해진 방식으로 계산해 지원 대상을 판단하는 값이에요.'],['중위소득','가구의 소득을 순서대로 놓았을 때 가운데에 해당하는 기준 소득이에요.'],['캐시백','돈을 결제한 뒤 일부를 돌려받는 방식이에요.'],['환급','이미 낸 돈의 일부 또는 전부를 돌려주는 것이에요.'],['이용권','정해진 물건이나 서비스를 이용할 수 있도록 지급하는 지원이에요.'],['양육 공백','보호자가 일이나 다른 사정으로 아이를 돌보기 어려운 시간·상황이에요.'],['제3자 배상','사고로 다른 사람에게 준 피해를 보상하는 것이에요.'],['멘토링','경험이 있는 사람이 준비 과정과 어려움을 상담하며 돕는 활동이에요.'],['원가구','청년과 부모 등 사업 기준에서 함께 판단하는 가족 가구예요.'],['미취업','현재 일자리에 취업하지 않은 상태예요.'],['문해','글을 읽고 뜻을 이해해 생활에 활용하는 능력이에요.']];
const lowQuestions={common:'이 도움을 받으면 우리 이웃의 하루가 어떻게 달라질까요?',birth:'아기가 태어난 가족은 어떤 준비와 도움이 필요할까요?',baby:'아이를 돌보는 가족의 어려움을 이 도움은 어떻게 줄일까요?',child:'학교가 끝난 뒤 우리 친구에게 필요한 도움은 무엇일까요?',youth:'새로운 일을 준비하는 이웃에게 어떤 응원을 보내고 싶나요?',middle:'우리 가족이나 이웃 중 이 도움이 필요한 분이 있을까요?',senior:'어르신이 더 편하게 생활하려면 무엇이 필요할까요?'};
export default function PolicyReading({policy:p,mode,saved,onToggle}){
 const easy=mode==='low',lesson=p.learning;
 const vocabulary=lesson?terms.filter(([word])=>[lesson.summary,...lesson.facts].join(' ').includes(word)):[];
 return <div className={`policy-reading ${easy?'reading-easy':'reading-advanced'}`}>
  <span className="explore-eyebrow">{p.year} · {p.year===2025?'시행계획':'생애주기 가이드북'}</span>
  <h2>{easy?p.easyTitle:p.title}</h2>{easy&&p.easyTitle!==p.title&&<p className="policy-original-name">{p.title}</p>}
  <PolicySource policy={p} worksheet={mode==='sixth'}/>
  <p className="policy-modal-summary">{lesson?.summary||(easy?p.low:p.high)}</p>
  <section className="reading-target"><h3><Users size={20}/>누구를 위한 도움인가요?</h3><p>{p.target}</p></section>
  {lesson&&<><section className="reading-facts"><h3>어떤 도움을 주나요?</h3><ul>{lesson.facts.map(fact=><li key={fact}>{fact}</li>)}</ul></section>
   <section className="reading-example"><h3><BookOpen size={20}/>생활 속에서 만나면</h3><p>{lesson.example}</p><small>정책을 이해하기 위한 가상 사례예요. 실제 이용 후기나 지원 결정이 아니에요.</small></section>
   {!!vocabulary.length&&<section className="reading-words"><h3>말뜻을 알아봐요</h3><dl>{vocabulary.map(([word,meaning])=><div key={word}><dt>{word}</dt><dd>{meaning}</dd></div>)}</dl></section>}
   <section className="reading-inquiry"><h3>{easy?'함께 생각해요':'정책의 효과를 따져 봐요'}</h3><p>{easy?(p.id==='plan2025-1'?'밤에 문을 연 약국이 우리 집에서 멀면 어떤 어려움이 있을까요?':lowQuestions[p.category]):lesson.question}</p>{!easy&&<p className="reading-evidence">인구 수는 도움이 필요한 이웃의 규모를 짐작하는 자료예요. 실제 이용 여부·거리·생활 경험까지 살펴야 정책이 충분한지 판단할 수 있어요.</p>}</section>
  </>}
  {p.conflict&&<div className="conflict-box"><b>원문 두 개의 안내가 달라요</b><p>가이드북 35쪽: 8세 미만 · 월 10만원<br/>로드맵: 9세 미만 · 월 10만 5,000원</p><p>하나의 값을 현재 기준으로 단정하지 않아요. 담당 기관의 최신 기준 확인이 필요합니다.</p><a href="/explore/roadmap-2026.pdf" target="_blank" rel="noreferrer">로드맵 비교하기</a></div>}
  <div className="reading-source"><p>{lesson?'위 지원 내용은 해당 연도 원문을 풀어 쓴 설명이며, 생활 사례·탐구 질문은 수업용으로 덧붙였어요.':'추가 원문 목록 항목입니다. 별도로 가공된 학습 설명은 아직 없어요.'} {p.year===2025?'2025년 계획은 현재 운영·모집 여부를 보장하지 않아요.':'2026년 자료의 모집 기간은 현재 날짜와 다를 수 있어요.'} 실제 신청 전에는 최신 공고를 확인해요.</p></div>
  <div className="modal-actions"><a className="explore-secondary" href={`${p.pdf}#page=${p.page}`} target="_blank" rel="noreferrer"><FileText size={18}/>설명의 근거 확인</a>{mode==='sixth'&&<button className="explore-primary" aria-pressed={saved} onClick={()=>onToggle(p)}>{saved?<Check size={18}/>:<Plus size={18}/>} {saved?'담기 취소':'제안서에 담기'}</button>}</div>
 </div>;
}
