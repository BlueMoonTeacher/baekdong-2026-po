// Uses the locally installed Firebase CLI's existing account. Never prints credentials.
const path = require('node:path');
const root = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
const { configstore } = require(path.join(root, 'configstore.js'));
const api = require(path.join(root, 'apiv2.js'));
const tokens = configstore.get('tokens');
if (!tokens) throw new Error('Firebase CLI login is required');
api.setRefreshToken(tokens.refresh_token);
api.setAccessToken(tokens.access_token);
const project = 'baekdong-population-2026';
const client = host => new api.Client({urlPrefix: 'https://' + host, apiVersion: 'v1'});
(async () => {
 const mode = process.argv[2];
 if(mode === 'enable') {
  for(const service of ['firestore.googleapis.com','identitytoolkit.googleapis.com','firebasestorage.googleapis.com','storage.googleapis.com']) {
   await client('serviceusage.googleapis.com').post(`projects/${project}/services/${service}:enable`, {});
   console.log('Enabled',service);
  }
 } else if(mode === 'billing') {
  const r=await client('cloudbilling.googleapis.com').get('billingAccounts');
  console.log(JSON.stringify((r.body.billingAccounts||[]).map(x=>({name:x.name,displayName:x.displayName,open:x.open}))));
 } else if(mode === 'link-billing') {
  const account=process.argv[3];
  if(!/^billingAccounts\/[A-Z0-9-]+$/.test(account)) throw new Error('Invalid billing account');
  const result=await client('cloudbilling.googleapis.com').put(`projects/${project}/billingInfo`,{billingAccountName:account},{resolveOnHTTPError:true});
  if(result.status>=400){console.log(JSON.stringify(result.body));return;}
  console.log('Billing connected');
 } else if(mode === 'auth') {
  const authClient=new api.Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'admin/v2'});
  let r=await authClient.get(`projects/${project}/config`,{resolveOnHTTPError:true});
  if(r.status===404){await new api.Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v2'}).post(`projects/${project}/identityPlatform:initializeAuth`,{}); r=await authClient.get(`projects/${project}/config`);}
  console.log('Auth config available', !!r.body.name);
  const oauth = await authClient.get(`projects/${project}/defaultSupportedIdpConfigs/google.com`, {resolveOnHTTPError:true});
  if(oauth.status===404) {
   await authClient.post(`projects/${project}/defaultSupportedIdpConfigs`,{name:`projects/${project}/defaultSupportedIdpConfigs/google.com`,enabled:true}, {queryParams:{idpId:'google.com'}});
  } else {await authClient.patch(`projects/${project}/defaultSupportedIdpConfigs/google.com`,{enabled:true},{queryParams:{updateMask:'enabled'}});}
  console.log('Google sign-in enabled');
 } else if(mode === 'auth-enable') {
  const c=new api.Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v2'});
  const r=await c.post(`projects/${project}/identityPlatform:enable`,{}, {resolveOnHTTPError:true});
  console.log(JSON.stringify(r.body));
 } else if(mode === 'auth-basic') {
  const c=new api.Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'admin/v2'});
  const r=await c.patch(`projects/${project}/config`,{signIn:{email:{enabled:true,passwordRequired:true}}},{queryParams:{updateMask:'signIn.email'},resolveOnHTTPError:true});
  console.log(JSON.stringify(r.body));
 } else if(mode === 'seed') {
  const c=client('firestore.googleapis.com');
  const base=`projects/${project}/databases/(default)/documents`;
  await c.patch(`${base}/members/${encodeURIComponent('kth9302@gmail.com')}`, {fields:{role:{stringValue:'admin'},name:{stringValue:'학년 관리자'}}});
  await c.patch(`${base}/settings/general`,{fields:{classes:{arrayValue:{values:Array.from({length:6},(_,i)=>({mapValue:{fields:{id:{stringValue:`class-${i+1}`},name:{stringValue:`6학년 ${i+1}반`},teacher:{stringValue:''},padlet:{stringValue:''}}}}))}}}});
  console.log('Owner and six editable classes initialized');
 } else if(mode === 'status') {
  const c=new api.Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'admin/v2'});
  const conf=await c.get(`projects/${project}/config`);
  const google=await c.get(`projects/${project}/defaultSupportedIdpConfigs/google.com`);
  const billing=await client('cloudbilling.googleapis.com').get(`projects/${project}/billingInfo`);
  console.log(JSON.stringify({authorizedDomains:conf.body.authorizedDomains,googleEnabled:google.body.enabled,googleClientConfigured:!!google.body.clientId,billingEnabled:billing.body.billingEnabled,billingAccountName:billing.body.billingAccountName}));
 } else if(mode === 'cors') {
  const c=new api.Client({urlPrefix:'https://storage.googleapis.com',apiVersion:'storage/v1'});
  const r=await c.patch(`b/${project}.firebasestorage.app`,{cors:[{origin:[`https://${project}.web.app`,`https://${project}.firebaseapp.com`,'http://localhost:5173','http://127.0.0.1:5173'],method:['GET'],responseHeader:['Content-Type','Content-Disposition'],maxAgeSeconds:3600}]});
  console.log('Authenticated download CORS configured:',r.body.name);
 } else if(mode === 'bucket') {
  const r=await new api.Client({urlPrefix:'https://firebasestorage.googleapis.com',apiVersion:'v1alpha'}).post(`projects/${project}/defaultBucket`,{location:'ASIA-NORTHEAST3'});
  console.log(JSON.stringify(r.body));
 } else throw new Error('Unknown mode');
})().catch(e=>{console.error(e.message);process.exitCode=1});
