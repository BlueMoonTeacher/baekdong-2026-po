export const proposalFields=['author','title','region','target','problem','idea','benefit','needs','measure','basePolicyId','policySummary','message','channel','feedback','improvement'];
export const channels=['가정 안내지','학교 게시판','마을 게시판','카드뉴스','직접 설명','기타'];

export function seedProposal(form,policy,previousPolicy){
 const summary=policy.learning?.summary||policy.high;
 const autoTitle=p=>`${p.title} 더 잘 전하기`;
 return {...form,basePolicyId:policy.id,
  title:!form.title||previousPolicy&&form.title===autoTitle(previousPolicy)?autoTitle(policy):form.title,
  policySummary:summary,
  target:!form.target||form.target===previousPolicy?.target?policy.target:form.target,
  region:form.region||'양산시 전체',channel:form.channel||channels[0],reviewed:false};
}

export function sanitizeProposalForm(form){
 const clean=Object.fromEntries(Object.entries(form||{}).filter(([key,value])=>proposalFields.includes(key)&&typeof value==='string').map(([key,value])=>[key,value.slice(0,key==='author'?80:key==='title'?150:4000)]));
 if(typeof form?.reviewed==='boolean')clean.reviewed=form.reviewed;
 return clean;
}

export function proposalSections(form,notes,policies){
 const base=policies.find(p=>p.id===form.basePolicyId);
 const source=p=>`${p.title} (${p.year}) · ${p.document}, PDF ${p.page}쪽\nhttps://baekdong-population-2026.web.app${p.pdf}#page=${p.page}`;
 const sections=[
  {title:'가져온 기존 정책',text:base?`${base.title} (${base.year} ${base.year===2025?'시행계획':'안내 자료'})\n원문 대상: ${base.target}\n${base.learning?.summary||base.high}${base.conflict?'\n주의: 원문 자료의 대상·금액 안내가 달라 현재 기준을 확인해야 합니다.':''}`:'기본 정책 미선택',kind:'evidence'},
  {title:'정책의 도움을 우리말로',text:form.policySummary||''},
  {title:'안내를 전할 이웃',text:form.target||''},
  {title:'발견한 어려움 · 확인할 질문',text:form.problem||''},
  {title:'우리가 전할 핵심 안내',text:form.message||''},
  {title:'우리의 전달계획',text:`전달 방법: ${form.channel||channels[0]}${form.idea?'\n'+form.idea:''}`},
  {title:'이해와 반응을 확인할 방법',text:form.measure||''},
 ];
 for(const [key,title] of [['feedback','실제로 나눈 뒤 알게 된 점'],['improvement','전달·이용을 더 편하게 할 개선 제안'],['benefit','기대하는 변화'],['needs','필요한 것 · 해결할 어려움']])if(form[key])sections.push({title,text:form[key]});
 if(notes.length)sections.push({title:'담아둔 인구 자료 근거',text:notes.map(x=>`${x.text}\n기준: ${x.period||''} · 수집: ${x.fetchedAt?.slice(0,10)||''}\n출처: ${x.source}`).join('\n\n'),kind:'evidence'});
 if(policies.length)sections.push({title:'정책 원문 출처',text:policies.map(source).join('\n\n'),kind:'evidence'});
 sections.push({title:'공유 전 확인',text:`${form.reviewed?'최신 공식 안내와 선생님 검토를 확인했다고 표시함':'최신 공식 안내·선생님 검토 미확인'}\n학생 탐구 초안이며 양산시 공식 안내가 아닙니다. 실제 신청 전 대상·금액·기간·문의처를 확인합니다. 인구 수만으로 이용의 어려움을 단정하지 않습니다. 현장 조사와 최신 공고 확인 뒤 선생님과 함께 검토합니다.`,kind:'source'});
 return sections;
}

export function proposalText(form,notes,policies){
 return `양산시 정책 전달·개선 제안서\n\n제안 이름: ${form.title||'(작성 전)'}\n제안자 · 모둠명: ${form.author||'(작성 전)'}\n살펴본 지역: ${form.region||'양산시 전체'}\n\n${proposalSections(form,notes,policies).map((s,i)=>`${i+1}. ${s.title}\n${s.text||'(작성 전)'}`).join('\n\n')}\n`;
}

export function proposalFilename(form,page=0){
 const safe=value=>(value||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,50);
 return `양산_정책제안_${safe(form.author)||'모둠'}_${safe(form.title)||'초안'}${page?'_'+page:''}.png`;
}
