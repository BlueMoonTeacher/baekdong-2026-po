process.loadEnvFile('.env.local');
const fs=require('node:fs/promises');
const {createClient}=require('../functions/sgis.cjs');
const client=createClient(()=>({serviceId:process.env.SGIS_SERVICE_ID,securityKey:process.env.SGIS_SECURITY_KEY}));
(async()=>{
 const years=await client.years();console.log('Census years',JSON.stringify(years));
 const data=await client.details(process.argv[2]||'25300',process.argv[3]);
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/sgis-probe.json',JSON.stringify(data));
 console.log(JSON.stringify({name:data.name,year:data.year,admCode:data.admCode,summary:data.summary,areas:data.areas.length,availableAreas:data.areas.filter(a=>a.total!==null).length,areaError:data.areaError}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
