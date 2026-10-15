import React from 'react';
import {FileText,ExternalLink} from 'lucide-react';

export default function PolicySource({policy,worksheet=false,compact=false}){
 const {document,year,page,pdf}=policy;
 return <aside className={`policy-source-citation${compact?' source-compact':''}`} aria-label="정책 자료 출처">
  <div className="policy-source-heading"><span><FileText size={18}/>{worksheet?'활동지에 기록할 출처':'정책 자료 출처'}</span><a href={`${pdf}#page=${page}`} target="_blank" rel="noreferrer">원문 PDF 열기<ExternalLink size={15}/></a></div>
  <strong className="policy-source-label">{document} · PDF {page}쪽</strong>
  {!compact&&<dl className="policy-source-fields"><div><dt>자료명</dt><dd>{document}</dd></div><div><dt>자료 연도</dt><dd>{year}년</dd></div><div><dt>PDF 쪽수</dt><dd>{page}쪽</dd></div></dl>}
  {worksheet&&!compact&&<p className="policy-source-help">활동지의 출처 칸에 자료명·연도·PDF 쪽수를 옮겨 적어요. 원문 PDF를 열어 내용도 확인해요.</p>}
 </aside>;
}
