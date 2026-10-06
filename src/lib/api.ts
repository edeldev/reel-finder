import type { Platform, SearchResponse } from '../types/video';
export async function searchVideos(query:string,platforms:Platform[],limit:number,signal:AbortSignal):Promise<SearchResponse>{
 const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,platforms,limit}),signal:AbortSignal.any([signal,AbortSignal.timeout(24000)])});
 let data;try{data=await response.json();}catch{throw new Error('El servidor no está disponible. Verifica que la aplicación esté iniciada.');}
 if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'No pudimos completar la búsqueda.');
 if(!Array.isArray(data.results)||!Array.isArray(data.warnings))throw new Error('Recibimos una respuesta inesperada. Intenta de nuevo.');return data;
}
