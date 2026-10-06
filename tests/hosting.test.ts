import {EventEmitter} from 'node:events';
import type {IncomingMessage,ServerResponse} from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import vercelSearch from '../api/search';
import vercelHealth from '../api/health';
import netlifySearch from '../netlify/functions/search.mts';
import netlifyHealth from '../netlify/functions/health.mts';

function webAdapter(handler:typeof vercelSearch){
 return async (request:Request)=>{
  const headers:Record<string,string>={};request.headers.forEach((v,k)=>headers[k]=v);
  const req=Object.assign(new EventEmitter(),{method:request.method,url:new URL(request.url).pathname,headers,body:request.method==='GET'?undefined:await request.text()});
  const responseHeaders=new Headers();let result='';
  const res=Object.assign(new EventEmitter(),{statusCode:200,writableEnded:false,setHeader:(k:string,v:string)=>responseHeaders.set(k,v),end:(body:string)=>{result=body;res.writableEnded=true;}});
  await handler(req as unknown as IncomingMessage,res as unknown as ServerResponse);
  return new Response(result,{status:res.statusCode,headers:responseHeaders});
 };
}
for(const [name,search,health] of [['Vercel',webAdapter(vercelSearch),webAdapter(vercelHealth)],['Netlify',netlifySearch,netlifyHealth]] as const){
 test(`${name}: contratos de endpoints y clave faltante`,async()=>{
  const oldKey=process.env.TAVILY_API_KEY;delete process.env.TAVILY_API_KEY;
  try{
   const state=await health(new Request('https://example.com/api/health'));assert.equal(state.status,200);assert.deepEqual(await state.json(),{configured:false});
   assert.equal((await search(new Request('https://example.com/api/search'))).status,405);
   assert.equal((await search(new Request('https://example.com/api/search',{method:'POST',body:'invalid'}))).status,400);
   assert.equal((await search(new Request('https://example.com/api/search',{method:'POST',body:JSON.stringify({query:'karma',platforms:['evil']})}))).status,400);
   const missing=await search(new Request('https://example.com/api/search',{method:'POST',body:JSON.stringify({query:'karma',platforms:['tiktok']})}));assert.equal(missing.status,503);assert.equal((await missing.json()).code,'MISSING_API_KEY');
  }finally{if(oldKey===undefined)delete process.env.TAVILY_API_KEY;else process.env.TAVILY_API_KEY=oldKey;}
 });
 test(`${name}: búsqueda con servidor externo simulado, sin exponer la clave`,async()=>{
  const oldKey=process.env.TAVILY_API_KEY;const oldFetch=globalThis.fetch;process.env.TAVILY_API_KEY='test-hosting-key';
  globalThis.fetch=async()=>Response.json({results:[{url:'https://tiktok.com/@creator/video/123',title:'Karma captado en cámara',score:.9}]});
  try{const response=await search(new Request('https://example.com/api/search',{method:'POST',body:JSON.stringify({query:'karma',platforms:['tiktok'],limit:10})}));assert.equal(response.status,200);const body=await response.text();assert.ok(!body.includes('test-hosting-key'));assert.equal(JSON.parse(body).results.length,1);assert.equal(response.headers.get('cache-control'),'no-store');}
  finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.TAVILY_API_KEY;else process.env.TAVILY_API_KEY=oldKey;}
 });
}
