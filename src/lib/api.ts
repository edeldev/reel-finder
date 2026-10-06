import type { Platform, SearchResponse } from '../types/video';
export async function searchVideos(query:string,platforms:Platform[],limit:number,signal:AbortSignal,discovery:{round:number;exclude_urls:string[]}={round:0,exclude_urls:[]}):Promise<SearchResponse>{
 const body={query,platforms,limit,round:discovery.round,exclude_urls:discovery.exclude_urls.slice(-50)};
 while(new TextEncoder().encode(JSON.stringify(body)).length>7500&&body.exclude_urls.length)body.exclude_urls.shift();
 const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(24000)])});
 let data;try{data=await response.json();}catch{throw new Error(response.status>=500?'El backend del hosting falló al iniciar. Revisa el despliegue y los logs de las funciones.':response.status===404?'El endpoint de búsqueda no está desplegado. Revisa la configuración del hosting.':'El endpoint de búsqueda no devolvió JSON. Verifica que las rutas /api apunten al backend.');}
 if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'No pudimos completar la búsqueda.');
 if(!Array.isArray(data.results)||!Array.isArray(data.warnings))throw new Error('Recibimos una respuesta inesperada. Intenta de nuevo.');return data;
}
