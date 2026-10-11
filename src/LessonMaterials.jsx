import React from 'react';
import ResourcePreviewButton from './ResourcePreview';

export default function LessonMaterials({resources,download}){
 const items=['PPT','활동지'].map(type=>resources.find(r=>r.type===type)).filter(Boolean);
 if(!items.length)return <span className="unregistered">등록 예정</span>;
 return <div className="lesson-materials">{items.map(r=><div key={r.id} className={`material-item ${r.type==='PPT'?'material-ppt':'material-worksheet'}`}><button type="button" className="material-download" title={r.name} aria-label={`${r.name} 다운로드`} onClick={()=>download(r)}>{r.type}</button><ResourcePreviewButton resource={r} compact/></div>)}</div>;
}
