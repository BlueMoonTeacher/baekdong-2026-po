import React from 'react';
import {ResourcePreview} from './ResourcePreview';
import previews from './lesson-plan-previews.json';

export default function LessonPlanPreview({lesson,onClose}){
 const guide=previews[lesson.group];
 const notices=[];
 if(guide.lessonIds.length>1)notices.push(`${lesson.group}차시는 원본의 묶음 지도안을 함께 사용합니다.`);
 if(lesson.number===21)notices.push('계획표는 ‘우리학교의 변화’, 원본 지도안은 ‘우리나라의 인구 변화’로 되어 있습니다. 원본 내용을 그대로 보여드립니다.');
 return <ResourcePreview resource={{...guide,description:lesson.title,previewNotice:notices.join(' ')}} onClose={onClose}/>;
}
