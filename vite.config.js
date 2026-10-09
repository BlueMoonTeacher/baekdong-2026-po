import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const populationProxy={'/api/population':{target:'https://baekdong-population-2026.web.app',changeOrigin:true}};
export default defineConfig({ plugins: [react()], server: { port: 5173,proxy:populationProxy },preview:{proxy:populationProxy}, build:{rollupOptions:{output:{manualChunks:{firebase:['firebase/app','firebase/auth','firebase/firestore','firebase/storage'],react:['react','react-dom']}}}} });
