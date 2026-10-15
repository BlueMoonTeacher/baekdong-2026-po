// Create local, dated knowledge files for the classroom Gem. Never uploads them.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {enrichPolicy} from '../src/explorer/policy-learning.mjs';

const destination=path.resolve('output/gemini/학생용_Gem_지식자료');
await mkdir(destination,{recursive:true});
const materials='추가자료/2026_인구교육_26~30차시_개정본';
const copies=[
 ['public/explore/guide-2026.pdf','01_2026_생애주기별_인구정책_가이드북.pdf'],
 ['public/explore/roadmap-2026.pdf','02_2026_생애주기별_인구정책_로드맵.pdf'],
 ['public/explore/policy-2025.pdf','03_2025_양산시_인구정책_시행계획.pdf'],
 [`${materials}/차시별 활동지/인구교육 프로젝트3 활동지(6학년) - 27차시.pdf`,'04_27차시_활동지.pdf'],
];
for(const [source,name] of copies)await copyFile(source,path.join(destination,name));
const catalog=JSON.parse(await readFile('src/explorer/policies.json','utf8')).map(enrichPolicy);
const base='https://baekdong-population-2026.web.app';
const lines=[
 '양산시 인구정책 찾아보기 - 웹앱에 등록된 자료의 색인',
 '이 파일은 원문 PDF를 찾기 위한 보조 색인입니다. 원문 PDF가 정책 내용의 기준입니다.',
 '학교 수업용 자료이며 현재 신청 가능 여부나 실제 정책 성과를 보장하지 않습니다.',
 '아래 쪽수는 책에 인쇄된 쪽수가 아닌 웹앱이 연결한 PDF 페이지 번호입니다.',
 '2025년 시행계획과 2026년 안내 자료를 구분합니다. 가상 생활 사례와 탐구 질문은 사실 근거에서 제외했습니다.',
 `등록된 정책 ${catalog.length}개. 쉬운 학습 설명이 있는 항목 ${catalog.filter(p=>p.learning).length}개.`,
 '',
];
for(const p of catalog){
 lines.push(`정책 ID: ${p.id}`,`정책명: ${p.title}`,`자료 연도: ${p.year}`,
  `출처: ${p.document} · PDF ${p.page}쪽`,`원문 위치: ${base}${p.pdf}#page=${p.page}`,
  p.year===2025?'자료 성격: 2025년 시행계획. 사업 완료나 현재 운영 여부를 의미하지 않음.':'자료 성격: 2026년 안내 자료. 현재 조건은 해당 정책의 최신 공식 안내로 별도 확인.');
 if(p.learning){
  lines.push(`웹앱에 정리된 대상: ${p.target}`,'원문을 풀어 쓴 웹앱의 학습 설명(인용 전 원문 대조):',...p.learning.facts.map(f=>'- '+f));
 }else lines.push('원문 목록 항목. 별도의 학습 설명이 없으므로 원문 PDF를 직접 확인해야 함.');
 if(p.conflict)lines.push('주의: 웹앱에서 가이드북과 로드맵의 안내 차이를 표시한 정책. 하나의 조건으로 합치거나 현재 기준을 확정하지 말고 두 원문을 비교할 것.');
 lines.push('');
}
await writeFile(path.join(destination,'05_정책명과_원문출처_찾아보기.txt'),lines.join('\n'),'utf8');

let population,source;
try{
 const candidate=JSON.parse(await readFile('artifacts/gemini-knowledge/population-snapshot.json','utf8'));
 if(!Array.isArray(candidate.region)||!candidate.region.length||!candidate.periods?.includes(candidate.latestPeriod)||!Array.isArray(candidate.ages)||!candidate.fetchedAt)throw Error('Incomplete response');
 population=candidate;source='웹앱의 공개 /api/population 응답을 복사한 저장본';
}catch{
 population=JSON.parse(await readFile('public/explore/population.json','utf8'));
 source='웹앱 저장소의 정적 population.json 저장본(실시간 조회 자료가 아님)';
}
const age=population.ages.filter(a=>a.period<=population.latestPeriod).sort((a,b)=>a.period.localeCompare(b.period)).at(-1);
const stats=[
 '양산시 인구 자료 - 업로드 시점의 고정 저장본',
 `자료 구성: ${source}`,`자료 수집 시각(UTC): ${population.fetchedAt}`,`읍면동 인구 기준 월: ${population.latestPeriod}`,
 '이 파일은 웹앱과 자동 동기화되지 않습니다. 대화하는 날짜의 최신 인구라고 표현하지 마세요.',
 '지역별 인구는 정책 효과를 직접 입증하는 자료가 아닙니다. 실제 이용과 인과관계는 별도로 확인해야 합니다.',
 '',`[읍면동 인구: ${population.latestPeriod}]`,
 ...population.region.filter(r=>r.period===population.latestPeriod).map(r=>`${r.name}: 총 ${r.total}명 / 남 ${r.male}명 / 여 ${r.female}명 / 전월 대비 ${r.change??'자료 없음'}명${r.derived?' / 원자료 누락으로 다른 지역 합계와 시 전체 합계의 차이를 사용한 계산값':''}`),
 '', '[양산시 전체 연령별 인구: 읍면동 연령 분포가 아님]',
 ...age?[`기준 월: ${age.period}`,`전체: ${age.total}명`,...age.bands.map(b=>`${b.label}: ${b.total}명`)]:['검산된 연령 자료 없음'],
 '', '[연도별 인구: 제공된 연도만 수록]',
 ...population.years.map(y=>`${y.year}년: ${y.total}명 / 집계 방식: ${y.source}`),
 '', '[자료 유의점]',...(population.warnings||[]).map(s=>'- '+s),
 '', '[자료 출처]',...(population.sources||[]).map(s=>`${s.title}: ${s.url}`),
];
await writeFile(path.join(destination,'06_양산시_인구자료_기준시점포함.txt'),stats.join('\n'),'utf8');
const guide=[
 'Gem 지식 자료 사용 안내',
 '',
 '1. 01~03 PDF는 정책 원문이며 05 TXT는 그 원문을 찾는 색인입니다. 문서명·연도·PDF 쪽수로 대조합니다.',
 '2. 원문의 정책 정보, 활동지의 예시, 학생의 제안, 예상 효과, 실제 반응을 서로 구분합니다.',
 '3. 자료를 참고하여 질문의 맥락과 학생 근거의 적절성을 살핍니다. 학생에게 정책 요약이나 완성 글을 먼저 길게 제공하지 않습니다.',
 '4. 학생이 사용한 근거를 듣고 필요한 경우 원문을 확인합니다. 사실을 확인한 범위를 넘어 정책의 효과까지 검증했다고 말하지 않습니다.',
 '5. 자료 간 안내가 다르면 출처를 나누어 설명하고 학생이 확인할 지점을 질문합니다. 연도가 다르다는 이유만으로 실제 최신 조건을 확정하지 않습니다.',
 '6. PDF 쪽수는 PDF 뷰어의 페이지 순번입니다. PDF의 인쇄 쪽수나 이 TXT 파일의 줄 번호로 대체하지 않습니다.',
 '7. 06 TXT는 기준 시점이 있는 인구 저장본입니다. 새로운 월의 자료가 필요하면 교사가 파일을 교체해야 합니다.',
 '8. 04 PDF는 학생 활동의 구조를 이해하는 자료입니다. 예시 문장을 정책 효과가 확인된 증거로 사용하지 않습니다.',
 '',
 '업로드: 이 폴더의 파일 7개를 Gem 편집 화면의 ‘지식 +’에 파일로 추가한 뒤 저장합니다. ZIP 전체를 지식 파일로 올리지 않습니다.',
 '지식 출처 인용을 끄는 옵션은 선택하지 않습니다. 학생에게 공유할 때 첨부 파일에 대한 보기 권한도 확인합니다.',
 '소크라테스식 문답 규칙은 Gem의 ‘요청 사항’에 별도로 설정합니다.',
 '',`인구 자료 수집 시각(UTC): ${population.fetchedAt}`,`인구 자료 기준 월: ${population.latestPeriod}`,`양산시 전체 연령 자료 기준 월: ${age?.period||'없음'}`,
];
await writeFile(path.join(destination,'00_자료_읽는_방법.txt'),guide.join('\n'),'utf8');
console.log(JSON.stringify({folder:destination,files:copies.length+3,policies:catalog.length,populationFetchedAt:population.fetchedAt,populationPeriod:population.latestPeriod,agePeriod:age?.period},null,2));
