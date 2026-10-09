import React from 'react';
import {BookOpen} from 'lucide-react';

export default function ProjectIntro(){
 return <details className="project-intro">
  <summary><BookOpen size={17}/><span>프로젝트 개관</span><small>수업의 목표와 주요 활동 살펴보기</small></summary>
  <div className="intro-columns">
   <section><h3>인구 변화를 이해하는 배움</h3><p><span>저출산·고령화, 가족 구조 변화, 세대 차이와 다문화를 탐구합니다.</span><span>미래의 인구 구조와 삶의 모습을 예측하며, 지속 가능한 지역사회와 행복한 미래를 설계합니다.</span></p></section>
   <section><h3>탐구하고 직접 만드는 활동</h3><p><span>세대공감 그림책, 인구 문제 해결책 포스터, 양산시 인구정책 홍보 자료와 굿즈를 만듭니다.</span><span>부모님 청년 시절 인터뷰와 가정·마을 설문을 통해 배움을 생활 속으로 이어갑니다.</span></p></section>
   <section><h3>교육공동체와 함께하는 실천</h3><p><span>직접 만든 굿즈를 나누고 설문 결과를 분석하며, 가정곁·마을곁 교육공동체와 함께 실천합니다.</span><span>인간 존중, 가족과 공동체, 인구변화 이해, 미래사회 설계, 지역과의 공존 역량을 기릅니다.</span></p></section>
  </div>
 </details>;
}
