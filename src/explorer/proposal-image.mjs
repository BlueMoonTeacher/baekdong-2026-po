import {proposalSections} from './proposal-domain.mjs';
export const posterSize={width:1600,height:3200};
const margin=96,contentWidth=posterSize.width-margin*2,lineHeight=52;

export function wrapImageText(text,width,measure){
 const lines=[];
 for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')){
  let line='';
  for(const char of paragraph){
   if(line&&measure(line+char)>width){lines.push(line);line=char;}else line+=char;
  }
  lines.push(line);
 }
 return lines;
}

// Split long sections into continuation pages without omitting student writing or sources.
export function layoutProposalPages(form,notes,policies,measure,height=posterSize.height){
 const bottom=height-110;
 const title=wrapImageText(form.title||'우리 이웃에게 닿는 정책',contentWidth*32/48,measure);
 const author=wrapImageText(`제안자 · 모둠명: ${form.author||'미작성'}   |   지역: ${form.region||'양산시 전체'}`,contentWidth,measure);
 const pages=[];
 let page,y;
 const start=()=>{page={items:[]};pages.push(page);y=120;page.items.push({kind:'brand',text:'양산 인구 탐험 · 6학년 프로젝트',y});y+=76;
  for(const text of title){page.items.push({kind:'title',text,y});y+=64;}
  y+=24;for(const text of author){page.items.push({kind:'meta',text,y});y+=lineHeight;}y+=64;
 };
 start();
 for(const section of proposalSections(form,notes,policies)){
  const framed=section.kind==='evidence',lines=wrapImageText(section.text||'작성 전',contentWidth-(framed?48:0),measure);
  let index=0,continuation=false;
  while(index<lines.length){
   if(bottom-y<(framed?180:152))start();
   const frame=framed?{kind:'frame',text:'',y:y-4,height:0}:null;
   if(frame){page.items.push(frame);y+=24;}
   const x=margin+(framed?22:0);
   page.items.push({kind:'heading',text:section.title+(continuation?' (계속)':''),y,x,framed});y+=72;
   const available=Math.max(1,Math.floor((bottom-y-(framed?24:0))/lineHeight));
   const end=Math.min(lines.length,index+available);
   for(;index<end;index++){page.items.push({kind:section.kind==='source'||framed?'source':'body',text:lines[index],y,x});y+=lineHeight;}
   if(frame){y+=24;frame.height=y-frame.y;}
   y+=44;
   if(index<lines.length){continuation=true;start();}
  }
 }
 return pages;
}

export async function prepareProposalImages(form,notes,policies){
 await document.fonts.load('600 30px "Pretendard Local"');
 const probe=document.createElement('canvas').getContext('2d');
 if(!probe)throw Error('이미지를 만들 수 없는 브라우저입니다.');
 // The same font and width are used in layout and drawing, including long Korean words.
 probe.font='600 32px "Pretendard Local", "Malgun Gothic", sans-serif';
 const measure=text=>probe.measureText(text).width;
 const whole=layoutProposalPages(form,notes,policies,measure,Infinity)[0];
 const neededHeight=Math.max(...whole.items.map(item=>item.y+(item.kind==='frame'?item.height:item.kind==='title'?64:lineHeight)))+140;
 const height=neededHeight<=5000?Math.max(2400,Math.ceil(neededHeight/100)*100):posterSize.height;
 const pages=layoutProposalPages(form,notes,policies,measure,height);
 // Only the visible page is rasterized, keeping even very long drafts within modest memory.
 return pages.map((page,index)=>()=>{
  const canvas=document.createElement('canvas');canvas.width=posterSize.width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#009f43';ctx.fillRect(0,0,canvas.width,16);
  ctx.fillStyle='#c95b65';ctx.fillRect(canvas.width-220,0,220,16);
  ctx.textBaseline='top';ctx.font=probe.font;
  for(const item of page.items){
   if(item.kind==='frame'){
    ctx.fillStyle='#f0f5f2';ctx.fillRect(margin-14,item.y,contentWidth+28,item.height);
    ctx.strokeStyle='#cbd9d0';ctx.lineWidth=2;ctx.strokeRect(margin-14,item.y,contentWidth+28,item.height);
    ctx.fillStyle='#087639';ctx.fillRect(margin-14,item.y,6,item.height);continue;
   }
   ctx.fillStyle=item.kind==='heading'?'#003c96':item.kind==='brand'?'#087639':item.kind==='meta'||item.kind==='source'?'#55685e':'#26362f';
   ctx.font=item.kind==='title'?'750 48px "Pretendard Local", "Malgun Gothic", sans-serif':item.kind==='brand'?'650 28px "Pretendard Local", "Malgun Gothic", sans-serif':item.kind==='heading'?probe.font:'500 32px "Pretendard Local", "Malgun Gothic", sans-serif';
   if(item.kind==='heading'&&!item.framed){ctx.strokeStyle='#dce5e1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(margin,item.y+48);ctx.lineTo(posterSize.width-margin,item.y+48);ctx.stroke();}
   ctx.fillText(item.text,item.x??margin,item.y);
  }
  ctx.strokeStyle='#dce5e1';ctx.beginPath();ctx.moveTo(margin,height-78);ctx.lineTo(posterSize.width-margin,height-78);ctx.stroke();
  ctx.font='500 24px "Pretendard Local", "Malgun Gothic", sans-serif';ctx.fillStyle='#607067';
  ctx.fillText('학생의 정책 전달·개선 제안 · 공식 지원 안내와 구분해서 읽어요',margin,height-56);
  ctx.textAlign='right';ctx.fillText(`${index+1} / ${pages.length}`,posterSize.width-margin,height-56);
  return canvas;
 });
}

export function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG 저장에 실패했습니다.')),'image/png'));}
