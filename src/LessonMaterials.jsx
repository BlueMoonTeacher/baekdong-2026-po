import React,{useState} from 'react';
import {Download,LoaderCircle} from 'lucide-react';
import ResourcePreviewButton from './ResourcePreview';

const materialItems=resources=>['PPT','활동지'].map(type=>resources.find(r=>r.type===type)).filter(Boolean);

export default function LessonMaterials({resources,download}){
 const items=materialItems(resources);
 if(!items.length)return <span className="unregistered">등록 예정</span>;
 return <div className="lesson-materials">{items.map(r=><div key={r.id} className={`material-item ${r.type==='PPT'?'material-ppt':'material-worksheet'}`}><ResourcePreviewButton resource={r} label={r.type} onDownload={download} compact/></div>)}</div>;
}

export function LessonMaterialsDownload({resources,downloadAll}){
 const [downloading,setDownloading]=useState(false);
 const items=materialItems(resources);
 if(!items.length)return null;
 const bundleLabel=`${items.map(r=>r.type).join('·')} 원본 함께 다운로드 (ZIP)`;
 async function downloadBundle(){
  if(downloading)return;
  setDownloading(true);
  try{await downloadAll(items);}finally{setDownloading(false);}
 }
 return <button type="button" className="materials-download-all" title={downloading?'수업자료를 묶는 중…':bundleLabel} aria-label={bundleLabel} aria-busy={downloading} disabled={downloading} onClick={downloadBundle}>{downloading?<LoaderCircle className="download-spinner" size={18}/>:<Download size={18}/>}</button>;
}
