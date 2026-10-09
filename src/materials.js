// Older uploaded resources use one lessonId; shared local resources use lessonIds.
export function resourceMatchesLesson(resource,lesson) {
 const ids=resource.lessonIds?.length?resource.lessonIds:resource.lessonId?[resource.lessonId]:[];
 if(!ids.length)return Number(resource.project)===lesson.project;
 const [start,end=start]=lesson.group.split('~').map(Number);
 return (!resource.project||Number(resource.project)===lesson.project)&&ids.some(id=>Number(id)>=start&&Number(id)<=end);
}

export function materialCells(rows,resources) {
 const cells=rows.map(lesson=>({resources:resources.filter(r=>resourceMatchesLesson(r,lesson)),rowSpan:1,hidden:false}));
 for(let i=0;i<rows.length;i++) {
  if(cells[i].hidden||!cells[i].resources.some(r=>r.lessonIds?.length>1))continue;
  const key=JSON.stringify(cells[i].resources.map(r=>r.id));
  let j=i+1;
  while(j<rows.length&&rows[j].project===rows[i].project&&JSON.stringify(cells[j].resources.map(r=>r.id))===key) {
   cells[j].hidden=true;cells[i].rowSpan++;j++;
  }
 }
 return cells;
}
