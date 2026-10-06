import {platforms,type Platform} from '../src/types/video';
import {SearchError,search_videos} from './search_service';

const buckets=new Map<string,{count:number;until:number}>();
function rateLimited(ip:string){
 const now=Date.now();
 for(const [key,b] of buckets) if(b.until<=now) buckets.delete(key);
 const bucket=buckets.get(ip)??{count:0,until:now+60000};
 buckets.set(ip,bucket);return ++bucket.count>12;
}
function json(body:unknown,status=200,headers:Record<string,string>={}){
 return Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
}
export async function searchRequest(req:Request):Promise<Response>{
 if(req.method!=='POST')return json({error:'Usa POST para buscar.'},405,{Allow:'POST'});
 const declaredLength=Number(req.headers.get('content-length')||0);
 if(declaredLength>8192)return json({error:'La solicitud es demasiado grande.'},413);
 let body:unknown;
 try{const raw=await req.text();if(new TextEncoder().encode(raw).length>8192)return json({error:'La solicitud es demasiado grande.'},413);body=JSON.parse(raw);}catch{return json({error:'La solicitud no contiene JSON válido.'},400);}
 if(!body||typeof body!=='object')return json({error:'La solicitud no es válida.'},400);
 const {query,platforms:selected,limit=20}=body as Record<string,unknown>;
 if(typeof query!=='string'||!query.trim()||query.length>200||!Array.isArray(selected)||!selected.length||selected.some(p=>!platforms.includes(p))||typeof limit!=='number'||![10,20,30].includes(limit))return json({error:'Escribe un tema de hasta 200 caracteres y selecciona una plataforma.'},400);
 const key=process.env.TAVILY_API_KEY;
 if(!key)return json({error:'Configura TAVILY_API_KEY en las variables de entorno del servidor y vuelve a desplegar la aplicación.',code:'MISSING_API_KEY'},503);
 // Best-effort limit per warm instance; platform firewall rules provide global controls.
 const ip=req.headers.get('x-nf-client-connection-ip')??req.headers.get('x-vercel-forwarded-for')??req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown';
 if(rateLimited(ip))return json({error:'Has realizado varias búsquedas. Espera un minuto y vuelve a intentar.'},429,{'Retry-After':'60'});
 try{return json(await search_videos(query.trim(),[...new Set(selected)] as Platform[],limit,key,req.signal));}
 catch(e){if(process.env.NODE_ENV!=='production')console.error('Search failed:',e instanceof SearchError?e.message:'Upstream unavailable');return json({error:e instanceof SearchError?e.message:'No pudimos completar la búsqueda. Intenta nuevamente.'},e instanceof SearchError?e.status:502);}
}
export function healthRequest(req:Request):Response{
 if(req.method!=='GET')return json({error:'Usa GET para comprobar el servicio.'},405,{Allow:'GET'});
 return json({configured:!!process.env.TAVILY_API_KEY});
}
