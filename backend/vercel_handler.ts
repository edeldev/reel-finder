import type {IncomingMessage,ServerResponse} from 'node:http';

// Classic Node handler supported by Vercel's /api runtime.
export function nodeHandler(handler:(request:Request)=>Response|Promise<Response>){
 return async (req:IncomingMessage & {body?:unknown},res:ServerResponse)=>{
  const controller=new AbortController();
  const close=()=>{if(!res.writableEnded)controller.abort();};
  res.on('close',close);
  try{
   const headers=new Headers();
   for(const [name,value] of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
   let body:string|undefined;
   if(req.method!=='GET'&&req.method!=='HEAD'){
    if(req.body!==undefined)body=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString():JSON.stringify(req.body);
    else{const chunks:Buffer[]=[];let length=0;for await(const chunk of req){const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);length+=bytes.length;if(length>8192){res.statusCode=413;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'La solicitud es demasiado grande.'}));return;}chunks.push(bytes);}body=Buffer.concat(chunks).toString();}
   }
   const response=await handler(new Request('https://reel-finder.local'+(req.url??'/'),{method:req.method??'GET',headers,body,signal:controller.signal}));
   res.statusCode=response.status;
   response.headers.forEach((value,name)=>res.setHeader(name,value));
   res.end(await response.text());
  }catch{
   if(!res.writableEnded){res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'No se pudo iniciar el servicio de búsqueda. Revisa los logs del servidor.'}));}
  }finally{res.off('close',close);}
 };
}
