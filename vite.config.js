import { defineConfig, loadEnv } from 'vite';
import { createRequire } from 'node:module';
import react from '@vitejs/plugin-react';
const {createClient}=createRequire(import.meta.url)('./functions/sgis.cjs');
function sgisApi(env){
 const client=createClient(()=>({serviceId:env.SGIS_SERVICE_ID,securityKey:env.SGIS_SECURITY_KEY}));
 const configure=server=>{server.middlewares.use('/api/sgis',async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');res.end(JSON.stringify({error:'method-not-allowed'}));return;}
  const query=new URL(req.url,'http://localhost').searchParams;
  try{const data=await client.details(query.get('code'),query.get('year')||undefined);res.setHeader('Cache-Control','public,max-age=3600');res.end(JSON.stringify(data));}
  catch(e){res.statusCode=e.message.startsWith('invalid-')?400:503;res.end(JSON.stringify({error:res.statusCode===400?'지역 또는 연도를 확인해 주세요.':'SGIS 상세 자료를 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.'}));}
 });};
 return {name:'private-sgis-api',configureServer:configure,configurePreviewServer:configure};
}
const populationProxy={'/api/population':{target:'https://baekdong-population-2026.web.app',changeOrigin:true}};
export default defineConfig(({mode})=>({ plugins: [react(),sgisApi(loadEnv(mode,process.cwd(),'SGIS_'))], server: { port: 5173,proxy:populationProxy },preview:{proxy:populationProxy}, build:{rollupOptions:{output:{manualChunks:{firebase:['firebase/app','firebase/auth','firebase/firestore','firebase/storage'],react:['react','react-dom']}}}} }));
