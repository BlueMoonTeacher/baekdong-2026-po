import React,{useEffect,useRef,useState} from 'react';

export default function PdfPage({document:pdf,page,title,onError}){
 const canvas=useRef(null),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let cancelled=false,render;
  setLoading(true);
  (async()=>{
   const sheet=await pdf.getPage(page+1);
   if(cancelled)return;
   const viewport=sheet.getViewport({scale:1.8}),element=canvas.current;
   element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height);
   render=sheet.render({canvas:element,canvasContext:element.getContext('2d'),viewport});
   await render.promise;
   if(!cancelled)setLoading(false);
  })().catch(error=>{if(!cancelled&&error.name!=='RenderingCancelledException')onError();});
  return()=>{cancelled=true;render?.cancel();};
 },[pdf,page]);
 return <>{loading&&<p className="preview-loading" role="status">페이지를 불러오는 중…</p>}<canvas ref={canvas} role="img" aria-label={`${title} ${page+1}쪽`} style={loading?{visibility:'hidden'}:undefined}/></>;
}
