import test from 'node:test';
import assert from 'node:assert/strict';
import {seedProposal,sanitizeProposalForm,proposalSections,proposalText,proposalFilename} from '../src/explorer/proposal-domain.mjs';
import {wrapImageText,layoutProposalPages,posterSize} from '../src/explorer/proposal-image.mjs';
import {loadDraft} from '../src/explorer/domain.mjs';
const a={id:'a',title:'밤에 문 연 약국',year:2025,target:'양산 시민',high:'늦은 밤 약국 운영 지원',learning:{summary:'밤 10시부터 새벽 1시까지 지정 약국이 운영하도록 지원해요.'},document:'2025 시행계획',pdf:'/explore/policy-2025.pdf',page:20};
const b={id:'b',title:'장난감 빌리기',year:2026,target:'미취학 아동 가정',high:'장난감 대여',document:'2026 안내',pdf:'/explore/guide-2026.pdf',page:30,conflict:true};

test('a saved policy explicitly seeds baseline information rather than merely attaching a reference',()=>{
 const result=seedProposal({},a);
 assert.equal(result.basePolicyId,'a');assert.equal(result.policySummary,a.learning.summary);
 assert.equal(result.target,a.target);assert.equal(result.title,'밤에 문 연 약국 더 잘 전하기');
 assert.equal(result.region,'양산시 전체');assert.equal(result.reviewed,false);
});
test('changing a baseline replaces policy basics but never overwrites the student outreach plan or identity',()=>{
 const form={...seedProposal({},a),author:'함께모둠',title:'밤에 도움을 찾아요',target:'우리 학교 가족',policySummary:'우리말로 수정한 요약',idea:'가정 안내지 배포',message:'운영 중인 약국 확인하기',problem:'설명이 어려운지 물어보기',improvement:'전화 안내도 같이 적기',feedback:'대상을 이해했어요',reviewed:true};
 const previous=JSON.stringify(form),result=seedProposal(form,b,a);
 assert.equal(result.basePolicyId,'b');assert.equal(result.policySummary,b.high);assert.equal(result.reviewed,false);
 for(const key of ['author','title','target','idea','message','problem','improvement','feedback'])assert.equal(result[key],form[key]);
 assert.equal(JSON.stringify(form),previous);
 const untouched=seedProposal(seedProposal({},a),b,a);assert.equal(untouched.target,b.target);assert.equal(untouched.title,'장난감 빌리기 더 잘 전하기');
});
test('v1 drafts keep old student writing while restoring the new author, baseline, outreach and review fields',()=>{
 const saved={form:{author:'별모둠',basePolicyId:'a',policySummary:'쉬운 설명',title:'우리 제안',idea:'예전 제안',benefit:'기대 변화',needs:'장소',channel:'직접 설명',message:'우리말 안내',feedback:'새 반응',improvement:'새 개선',reviewed:true,ignored:'secret'},notes:[{id:'n',text:'인구 자료',source:'출처',period:'2026-09',fetchedAt:'2026-10-09'}],policyIds:['a','a','b',42]};
 const restored=loadDraft({getItem:()=>JSON.stringify(saved)});
 assert.equal(restored.form.idea,'예전 제안');assert.equal(restored.form.author,'별모둠');assert.equal(restored.form.reviewed,true);assert.equal(restored.form.improvement,'새 개선');assert.equal(restored.form.ignored,undefined);assert.deepEqual(restored.policyIds,['a','b']);
 assert.equal(loadDraft({getItem:()=>'{bad-json'}),null);assert.equal(loadDraft({getItem:()=>{throw Error('blocked');}}),null);
 assert.equal(sanitizeProposalForm({author:'가'.repeat(200)}).author.length,80);
});
test('text and image content distinguish the original policy, student modifications and unverified outreach claims',()=>{
 const form={...seedProposal({},b),author:'탐험모둠',policySummary:'학생의 쉬운 설명',message:'문의처를 먼저 확인해요',improvement:'신청 준비물 안내',measure:'대상과 다음 행동을 설명할 수 있는지 물어요'};
 const note={text:'9월 원동면 인구',source:'공공데이터포털',period:'2026-09',fetchedAt:'2026-10-09'};
 const text=proposalText(form,[note],[b]);
 for(const phrase of ['탐험모둠','학생의 쉬운 설명','원문 대상: 미취학 아동 가정','원문 자료의 대상·금액','문의처를 먼저 확인해요','신청 준비물 안내','#page=30','2026-09','2026-10-09','검토 미확인','공식 안내가 아닙니다'])assert.ok(text.includes(phrase));
 assert.equal(proposalSections({...form,reviewed:true},[],[b]).at(-1).text.includes('확인했다고 표시함'),true);
 assert.doesNotMatch(proposalFilename({author:'모둠/1',title:'도움:찾기?'}),/[/:?]/);
});
test('Korean and long URLs wrap without dropped characters and long sections continue on new PNG pages',()=>{
 const measure=text=>[...text].length*32;
 const text='긴한국어제목과https://example.test/very/long/path\n둘째 줄\n';
 const lines=wrapImageText(text,160,measure);assert.equal(lines.join(''),text.replaceAll('\n',''));for(const line of lines)assert.ok(measure(line)<=160);
 const plan='전달계획'.repeat(1000),form={...seedProposal({},a),author:'긴 제안 모둠',title:'이웃에게 전해요',idea:plan,message:'누구·도움·문의처',reviewed:false};
 const pages=layoutProposalPages(form,[],[a],measure);assert.ok(pages.length>1);
 const all=pages.flatMap(page=>page.items);assert.equal(all.filter(item=>item.kind==='body').map(item=>item.text).join('').includes(plan),true);
 assert.ok(all.some(item=>item.kind==='heading'&&item.text.includes('(계속)')));
 assert.ok(all.some(item=>item.text.includes('공식 안내가 아닙니다')));
 const frames=all.filter(item=>item.kind==='frame');assert.ok(frames.length>=2);for(const frame of frames)assert.ok(frame.height>=120);
 const imported=proposalSections(form,[{text:'인구 근거',source:'지역별 인구 API'}],[a]).filter(section=>section.kind==='evidence');assert.deepEqual(imported.map(section=>section.title),['가져온 기존 정책','담아둔 인구 자료 근거','정책 원문 출처']);
 for(const page of pages)for(const item of page.items)assert.ok(item.y>=0&&item.y<posterSize.height-100);
});
