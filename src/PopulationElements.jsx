import React from 'react';

const lines={
 '성에 대한 사회적 차별 해소':['성에 대한','사회적 차별 해소'],
 '다문화에 대한 이해와 존중':['다문화에 대한','이해와 존중'],
 '시대에 따른 가족구조 변화와 미래 전망':['시대에 따른','가족구조 변화와','미래 전망'],
 '인구정책과 저출산':['인구정책과','저출산'],
 '지역사회 공동 양육지원':['지역사회','공동 양육지원'],
 '인구 규모와 인구 구조':['인구 규모와','인구 구조'],
 '저출산의 문제점과 해결 방안':['저출산의 문제점과','해결 방안'],
 '고령화의 문제점과 해결 방안':['고령화의 문제점과','해결 방안'],
};

export default function PopulationElements({text=''}){
 const elements=text.split(/[∙•]/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
 return <ul className="plan-elements">{elements.map((element,i)=><li key={i}>{(lines[element]||[element]).map((line,j)=><span className="population-element-line" key={j}>{line}</span>)}</li>)}</ul>;
}
