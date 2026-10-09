import {progressKey} from './domain.js';
export const CHECK_COLUMNS=[['activity','활동 완료'],['padlet','패들렛 업로드'],['worksheet','활동지 작성']];
export function bulkProgressRows(lessons,progress,classId,key,checked) {
 if(!CHECK_COLUMNS.some(([id])=>id===key))throw new Error('진행 항목을 확인해 주세요.');
 return lessons.filter(l=>!!progress[progressKey(classId,l.number)]?.[key]!==checked).map(l=>({id:progressKey(classId,l.number),value:{classId,number:l.number,[key]:checked}}));
}
