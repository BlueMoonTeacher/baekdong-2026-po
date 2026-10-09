# 양산 인구 탐험

학생용 도구: https://baekdong-population-2026.web.app/explore

기존 수업 프로젝트 사이트의 ‘양산 인구 탐험’ 링크로도 접속할 수 있습니다. 로그인 없이 지도·정책·원문을 조회하며, 학생 제안서는 각 브라우저에 저장되고 파일로 내려받거나 인쇄할 수 있습니다.

## 집에서 이어서 작업하기

```powershell
git clone https://github.com/BlueMoonTeacher/baekdong-2026-po.git
cd baekdong-2026-po
npm install
npm run dev
```

브라우저에서 http://127.0.0.1:5173/explore 를 엽니다. 로컬에서는 공개 인구 저장본을 먼저 표시한 뒤 Vite 프록시를 통해 운영 `/api/population`을 호출합니다. 개발 서버와 `npm run preview` 모두 같은 API를 사용합니다. 호출에 실패하면 저장본과 연결 상태를 표시하며, 저장본도 없으면 다시 불러오기 안내를 표시합니다.

화면은 `src/explorer/Explorer.jsx`, 디자인은 `src/explorer/explorer.css`, 가공한 정책 자료는 `src/explorer/policies.json`, 실제 행정경계는 `src/explorer/map.json`에 있습니다. 원문 PDF와 공개 인구 저장본은 `public/explore/`에 있습니다.

## 배포

Node.js 22와 Firebase CLI를 사용합니다. 기존 Firebase 프로젝트 `baekdong-population-2026`에 접근할 수 있는 계정으로 로그인합니다.

```powershell
firebase login
npm run build
firebase deploy --only hosting
```

서버 코드도 바꿨다면:

```powershell
npm install --prefix functions
firebase deploy --only functions:population
```

공공데이터 인증키는 Google Secret Manager의 `YANGSAN_DATA_KEY`에 저장되어 있습니다. 집에서 저장소를 내려받아도 서버의 기존 키와 자동 갱신은 유지됩니다. 인증키를 소스에 넣거나 GitHub에 올리지 마세요. 로컬에서 직접 자료를 갱신하려면 저장소 최상위의 제외 파일 `api-key.txt`에 키를 넣고 `node scripts/sync-population.cjs`를 실행합니다. 키 변경 시 `node scripts/set-population-secret.cjs`는 원본 파일에서 표준입력으로 전달하며 추가 키 파일을 만들지 않습니다.

## 자료와 갱신 방식

- 같은 Firebase 프로젝트의 Firestore `populationSnapshots/current`에 공개 통계 캐시를 저장합니다. 클라이언트에서 캐시 문서를 변경할 수 없습니다.
- Firebase Functions `populationData`가 `/api/population`으로 자료를 제공하고, `refreshPopulation`이 매일 오전 8시(한국 시간) 갱신합니다.
- 함수는 최소 실행 인스턴스 0, 최대 1로 설정했습니다. 컨테이너 이미지 정리는 7일 기준입니다. Functions·Scheduler·Firestore 사용량은 연결된 Blaze 결제 계정에 적용됩니다.
- API 연결이 안 되면 마지막 저장본을 표시합니다. 화면에 자료 수집일과 각 통계의 실제 기준 월을 표시합니다.
- 지도는 통계청 SGIS 경계를 가공한 vuski/admdongkor의 2026-07-01 자료를 양산시만 추출해 사용했습니다. 지도 출처와 이용 조건은 도구의 ‘자료와 출처’ 및 `public/explore/MAP-LICENSE.txt`에 있습니다.

## 원자료에서 발견한 차이

최초 수집(2026-10-09) 기준 읍면동 인구는 2026년 9월까지 제공됩니다. 강서동은 지역별·읍면동별 API 응답이 누락되어, 시 전체 성별 합계에서 다른 12개 지역 합계를 뺀 **계산값**으로 명시합니다. 다른 지역이 추가로 누락되면 완전한 월로 취급하지 않습니다.

2025년 10월과 2026년 4월은 지역별 합계 검산을 통과하지 못해 제외했습니다. 연령별 자료도 검산하여 합계가 맞는 월만 사용하며 최초 화면은 2026년 8월 자료입니다. 숫자를 0으로 대체하거나 선택한 동네의 나이 분포라고 표현하지 않습니다.

2026 가이드북과 로드맵의 아동수당 나이·금액이 달라 두 안내를 나란히 명시했습니다. 2025 자료는 시행계획이며, 사업 완료나 현재 신청 가능 상태를 의미하지 않습니다. 2025 중점 사업 17개와 2026 쉬운 설명 46개를 먼저 표시하고, 2026 원문 전체 목록 131개도 검색할 수 있습니다.

2025 시행계획 원문은 양산시청 공개 페이지 https://www.yangsan.go.kr/portal/contents.do?mid=0401150100 에서 확보했습니다. 제공받은 2026 PDF 두 개도 원문 그대로 다운로드할 수 있습니다.

## 이번 작업 확인 기록

빌드와 단위 테스트 9개가 통과했고, 독립 브라우저에서 지도 선택, 읽기 수준 전환, 정책 필터, 근거 담기, 제안서 내려받기, 새로고침 후 초안 복원, PC·모바일 화면을 확인했습니다. Firebase 서버 캐시 조회와 자동 갱신 작업 1회도 실행했습니다. 이후 사용자의 요청으로 추가 검증은 생략하고 GitHub 업로드 및 배포를 진행했습니다.
