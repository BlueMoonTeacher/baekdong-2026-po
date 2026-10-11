import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Search,ChevronLeft,ChevronRight,Download,ExternalLink,X} from 'lucide-react';
import './resource-preview.css';

export default function ResourcePreviewButton({resource:r,compact=false}){
 const [open,setOpen]=useState(false);
 if(!r.previewImages?.length)return null;
 return <><button className={compact?'material-preview-button':'secondary preview-icon-button'} type="button" title={`${r.type||'자료'} 미리보기`} aria-label={`${r.name} 미리보기`} onClick={()=>setOpen(true)}><Search size={18}/></button>{open&&<ResourcePreview resource={r} onClose={()=>setOpen(false)}/>}</>;
}

function ResourcePreview({resource:r,onClose}){
 const dialog=useRef(null),[page,setPage]=useState(0),[failed,setFailed]=useState(false);
 const images=r.previewImages;
 const isPpt=r.type==='PPT',unit='쪽';
 const title=r.lessonRange?`프로젝트 ${r.project} · ${r.lessonRange}차시 ${isPpt?'수업 PPT':'활동지'}`:r.name.replace(/\.[^.]+$/,'');
 const pdfPath=isPpt?r.pdfPath:r.staticPath;
 useEffect(()=>{const el=dialog.current;el.showModal();return()=>{if(el.open)el.close();};},[]);
 useEffect(()=>setFailed(false),[page]);
 return createPortal(<dialog ref={dialog} className="resource-preview" aria-labelledby={`preview-title-${r.id}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}>
  <header className="resource-preview-header"><div className="resource-preview-title"><small>{isPpt?'PDF 변환본 미리보기':'활동지 미리보기'}</small><h2 id={`preview-title-${r.id}`}>{title}</h2></div><button className="resource-preview-close" type="button" aria-label="미리보기 닫기" onClick={onClose}><X size={22}/></button></header>
  <div className="preview-toolbar"><div className="preview-pagination"><button type="button" aria-label="이전 페이지" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={20}/></button><span aria-live="polite">{page+1} / {images.length}{unit}</span><button type="button" aria-label="다음 페이지" disabled={page===images.length-1} onClick={()=>setPage(p=>p+1)}><ChevronRight size={20}/></button></div><div className="preview-downloads">{pdfPath&&<a href={pdfPath} download={isPpt?r.pdfName:r.name} className="secondary"><Download size={16}/>PDF 저장</a>}{isPpt&&<a href={r.staticPath} download={r.name} className="secondary">PPT 원본</a>}{r.editablePath&&<a href={r.editablePath} download={r.editableName} className="secondary">한글 원본</a>}<a href={pdfPath?`${pdfPath}#page=${page+1}`:images[page]} target="_blank" rel="noreferrer" className="secondary" aria-label="현재 페이지 크게 보기"><ExternalLink size={16}/>크게 보기</a></div></div>
  <div className={`preview-page ${isPpt?'preview-slides':''}`}>{failed?<p role="alert">이미지를 불러오지 못했습니다. PDF 저장으로 자료를 확인해 주세요.</p>:<img key={images[page]} src={images[page]} alt={`${title} ${page+1}${unit}`} onError={()=>setFailed(true)}/>}</div>
 </dialog>,document.body);
}
