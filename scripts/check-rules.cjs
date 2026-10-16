// Read-only tests through the official Firebase Rules testing API.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const {configstore}=require(path.join(root,'configstore.js'));
const tokens=configstore.get('tokens'),firebaseAuth=require(path.join(root,'auth.js'));
const c={post:async(endpoint,body)=>{
 const fresh=await firebaseAuth.getAccessToken(tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 const response=await fetch('https://firebaserules.googleapis.com/v1/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+fresh.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok)throw new Error('Rules test API failed: '+response.status);
 return {body:await response.json()};
}};
const auth=(email='teacher@example.test',verified=true,provider='google.com')=>({uid:'qa',token:{email,email_verified:verified,firebase:{sign_in_provider:provider}}});
const mocks=(member,role='teacher')=>[{function:'exists',args:[{anyValue:{}}],result:{value:member}},{function:'get',args:[{anyValue:{}}],result:{value:{data:{role}}}}];
const make=(name,expectation,collection,authentication,functions=[],method='get',data)=>({name,test:{expectation,request:{path:`/databases/(default)/documents/${collection}`,method,auth:authentication,time:'2026-10-09T07:00:00Z',...(data?{resource:{data}}:{})},functionMocks:functions}});
const padlet='https://padlet.com/hermione7531/2-6-pyt1a86nrhhp76wx';
const general={classes:Array.from({length:3},(_,i)=>({id:'class-'+(i+1),name:'6학년 '+(i+1)+'반',teacher:'',padlet})),updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'};
const material={name:'지도안.pdf',description:'',project:2,lessonId:'11',type:'지도안',url:'',path:'materials/qa/lesson.pdf',size:1000,updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'};
const cases=[
 make('master can edit fixed three-class settings','ALLOW','settings/general',auth('kth9302@gmail.com'),[],'update',general),
 make('legacy administrator cannot edit school settings','DENY','settings/general',auth(),mocks(true,'admin'),'update',general),
 make('common Padlet cannot be changed','DENY','settings/general',auth('kth9302@gmail.com'),[],'update',{...general,classes:general.classes.map(c=>({...c,padlet:'https://padlet.com/other'}))}),
 make('master can register materials','ALLOW','resources/qa',auth('kth9302@gmail.com'),[],'create',material),
 make('master can publish a per-lesson PDF replacement','ALLOW','resources/lesson-file-26-guide-pdf',auth('kth9302@gmail.com'),[],'create',{...material,project:3,lessonId:'26',type:'지도안 PDF',url:'https://firebasestorage.googleapis.com/v0/b/baekdong-population-2026.firebasestorage.app/o/materials%2Flesson-file-26-guide-pdf%2Fguide.pdf?alt=media',path:'materials/lesson-file-26-guide-pdf/guide.pdf'}),
 make('ordinary teacher cannot replace a per-lesson file','DENY','resources/lesson-file-26-guide-pdf',auth(),[],'create',{...material,project:3,lessonId:'26',type:'지도안 PDF',path:'materials/lesson-file-26-guide-pdf/guide.pdf'}),
 make('per-lesson metadata cannot point into a different resource upload folder','DENY','resources/lesson-file-26-guide-pdf',auth('kth9302@gmail.com'),[],'create',{...material,path:'materials/another-resource/guide.pdf'}),
 make('legacy administrator cannot register materials','DENY','resources/qa',auth(),mocks(true,'admin'),'create',material),
 make('guest cannot read shared events','DENY','events/qa',null),
 make('guest can read classroom names','ALLOW','settings/general',null),
 make('guest cannot read progress','DENY','progress/class-1_1',null),
 make('signed teacher can read all classroom events','ALLOW','events/qa',auth()),
 make('signed teacher can read progress','ALLOW','progress/class-1_1',auth()),
 make('unverified identity cannot read progress','DENY','progress/class-1_1',auth(undefined,false)),
 make('guest cannot list progress','DENY','progress/class-1_1',null,[],'list'),
 make('guest can read discussions','ALLOW','discussions/qa',null),
 make('guest can read resource catalog','ALLOW','resources/qa',null),
 make('teacher may check their own registration','ALLOW','members/teacher@example.test',auth()),
 make('teacher cannot list registered accounts','DENY','members/teacher@example.test',auth(),mocks(true),'list'),
 make('master can list accounts','ALLOW','members/teacher@example.test',auth('kth9302@gmail.com'),[],'list'),
 make('a legacy admin role cannot grant master privileges','DENY','members/teacher@example.test',auth(),mocks(true,'admin'),'list'),
 make('teacher cannot change class settings','DENY','settings/general',auth(),mocks(true),'update',{classes:[]}),
 make('unknown document paths stay private','DENY','private/qa',auth(),mocks(true,'admin')),
 make('Google login grants progress editing without registration','ALLOW','progress/class-1_11',auth(),mocks(false),'create',{classId:'class-1',number:11,activity:true,updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'}),
 make('guest cannot edit progress','DENY','progress/class-1_11',null,[],'create',{classId:'class-1',number:11,activity:true,updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'}),
 make('unverified identity cannot edit','DENY','progress/class-1_11',auth(undefined,false),[],'create',{classId:'class-1',number:11,activity:true,updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'}),
 make('non-Google provider cannot edit','DENY','progress/class-1_11',auth(undefined,true,'password'),[],'create',{classId:'class-1',number:11,activity:true,updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'}),
 make('progress values must be booleans','DENY','progress/class-1_11',auth(),mocks(true),'create',{classId:'class-1',number:11,activity:'true',updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'}),
 make('teacher cannot impersonate another writer','DENY','progress/class-1_11',auth(),mocks(true),'create',{classId:'class-1',number:11,activity:true,updatedBy:'another@example.test',updatedAt:'2026-10-09T07:00:00Z'}),
 make('master can register a teacher','ALLOW','members/another@example.test',auth('kth9302@gmail.com'),[],'create',{name:'Teacher',role:'teacher',updatedBy:'qa',updatedAt:'2026-10-09T07:00:00Z'}),
 make('teacher cannot invite themselves as administrator','DENY','members/another@example.test',auth(),mocks(true),'create',{name:'Teacher',role:'admin',updatedBy:'teacher@example.test',updatedAt:'2026-10-09T07:00:00Z'}),
];
(async()=>{
 const result=await c.post('projects/baekdong-population-2026:test',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('firestore.rules','utf8')}]},testSuite:{testCases:cases.map(x=>x.test)}});
 let failed=0;for(let i=0;i<cases.length;i++){const r=result.body.testResults?.[i];console.log(r?.state,cases[i].name);if(r?.state!=='SUCCESS'){failed++;console.log(JSON.stringify(r));}}
 if(result.body.issues)console.log(JSON.stringify(result.body.issues));
 const storageCases=[
  make('guest can download teaching materials','ALLOW','qa',null),
  make('guest cannot upload teaching materials','DENY','qa',null,[],'create'),
  make('ordinary Google user cannot upload as administrator','DENY','qa',auth(),[],'create'),
  make('administrator Google account can upload materials','ALLOW','qa',auth('kth9302@gmail.com'),[],'create'),
  make('unverified administrator cannot upload','DENY','qa',auth('kth9302@gmail.com',false),[],'create'),
  make('oversized file cannot be uploaded','DENY','qa',auth('kth9302@gmail.com'),[],'create'),
 ];
 for(let i=0;i<storageCases.length;i++){
  storageCases[i].test.request.path='/b/baekdong-population-2026.firebasestorage.app/o/materials/qa-check/material.pdf';
  storageCases[i].test.request.resource={size:i===5?60*1024*1024:1024,contentType:'application/pdf'};
 }
 const storageResult=await c.post('projects/baekdong-population-2026:test',{source:{files:[{name:'storage.rules',content:fs.readFileSync('storage.rules','utf8')}]},testSuite:{testCases:storageCases.map(x=>x.test)}});
 for(let i=0;i<storageCases.length;i++){const r=storageResult.body.testResults?.[i];console.log(r?.state,storageCases[i].name);if(r?.state!=='SUCCESS'){failed++;console.log(JSON.stringify(r));}}
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
