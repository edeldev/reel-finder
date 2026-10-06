import 'dotenv/config';
import express from 'express';
import {createServer as createHttpServer} from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import search from './node_search.js';
const app = express();
const httpServer = createHttpServer(app);
app.disable('x-powered-by');
app.use(express.json({limit:'8kb'}));
const buckets = new Map<string,{count:number; until:number}>();
const cleanup = setInterval(()=>{for (const [key,b] of buckets) if (b.until < Date.now()) buckets.delete(key);},60000); cleanup.unref();
app.post('/api/search',(req,res,next)=>{const id=req.ip ?? 'local'; const now=Date.now(); const existing=buckets.get(id); const b=existing && existing.until>now ? existing : {count:0,until:now+60000}; buckets.set(id,b); if (++b.count>12) {res.set('Retry-After','60'); res.status(429).json({error:'Has realizado varias búsquedas. Espera un minuto y vuelve a intentar.'}); return;} next();},search);
app.get('/api/health',(_req,res)=>res.json({configured:!!process.env.TAVILY_API_KEY}));
app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint no disponible.'}));
if (process.env.NODE_ENV === 'production') {const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'../dist');app.use(express.static(dist)); app.get('/{*path}',(_req,res)=>res.sendFile(path.join(dist,'index.html')));}
else {const {createServer}=await import('vite'); const vite=await createServer({server:{middlewareMode:true,hmr:{server:httpServer}},appType:'spa'});app.use(vite.middlewares);}
app.use((err: {status?:number},_req: express.Request,res: express.Response,_next: express.NextFunction)=>res.status(err.status || 500).json({error:'La solicitud no es válida. Intenta nuevamente.'}));
const port = Number(process.env.PORT || 3000);
httpServer.on('error',(error: NodeJS.ErrnoException)=>{
 console.error(error.code==='EADDRINUSE'
  ? `El puerto ${port} ya está ocupado. Cierra la otra instancia de Reel Finder o inicia en otro puerto: PORT=${port+1} npm run dev`
  : 'No se pudo iniciar Reel Finder. Revisa la configuración del servidor.');
 process.exit(1);
});
httpServer.listen(port,'0.0.0.0',()=>console.log(`Reel Finder: http://localhost:${port}`));
