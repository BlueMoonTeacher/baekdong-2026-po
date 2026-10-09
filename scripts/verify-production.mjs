import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://baekdong-population-2026.web.app';
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const file of ['lesson-plan.hwpx','project-plan.hwpx']){
 const response=await fetch(`${base}/materials/${file}`);
 if(!response.ok)throw new Error(`Download failed: ${file} (${response.status})`);
 const actual=Buffer.from(await response.arrayBuffer()),expected=await readFile(`public/materials/${file}`);
 if(hash(actual)!==hash(expected))throw new Error(`Download content mismatch: ${file}`);
 console.log('Published download verified:',file,actual.length,'bytes');
}
const response=await fetch('https://firestore.googleapis.com/v1/projects/baekdong-population-2026/databases/(default)/documents/settings/general');
if(response.status!==200)throw new Error(`Public classroom access failed: ${response.status}`);
console.log('Production Firestore allows the requested public classroom view (200).');
const privateResponse=await fetch('https://firestore.googleapis.com/v1/projects/baekdong-population-2026/databases/(default)/documents/members/kth9302@gmail.com');
if(privateResponse.status!==403)throw new Error(`Private member record was exposed: ${privateResponse.status}`);
console.log('Production Firestore keeps account registration private (403).');
