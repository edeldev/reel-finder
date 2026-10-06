import type {Request, Response} from 'express';
import {platforms,type Platform} from '../src/types/video.js';
import {video_platform} from '../src/lib/url.js';
import {SearchError,search_videos} from './search_service.js';
export default async function search(req: Request, res: Response) {
 if (req.method !== 'POST') return res.status(405).json({error:'Usa POST para buscar.'});
 const {query, platforms:selected, limit=20,round=0,exclude_urls=[]} = req.body ?? {};
 if (typeof query !== 'string' || !query.trim() || query.length > 200 || !Array.isArray(selected) || !selected.length || selected.some(p=> !platforms.includes(p)) || ![10,20,30].includes(limit)) return res.status(400).json({error:'Escribe un tema de hasta 200 caracteres y selecciona una plataforma.'});
 if(typeof round!=='number'||!Number.isInteger(round)||round<0||round>100000||!Array.isArray(exclude_urls)||exclude_urls.length>50||exclude_urls.some(u=>typeof u!=='string'||u.length>2048||!video_platform(u)))return res.status(400).json({error:'Las opciones de búsqueda no son válidas.'});
 const key = process.env.TAVILY_API_KEY;
 if (!key) return res.status(503).json({error:'Configura TAVILY_API_KEY en el archivo .env del servidor y reinicia la aplicación para empezar a buscar.', code:'MISSING_API_KEY'});
 const controller = new AbortController(); const abort = () => {if (!res.writableEnded) controller.abort();}; res.on('close',abort);
 try {res.json(await search_videos(query.trim(),[...new Set(selected)] as Platform[],limit,key,controller.signal,{round,exclude_urls}));}
 catch(e) {if (controller.signal.aborted) return; if (process.env.NODE_ENV !== 'production') console.error('Search failed:',e instanceof SearchError ? e.message : 'Upstream unavailable'); res.status(e instanceof SearchError ? e.status : 502).json({error:e instanceof SearchError ? e.message : 'No pudimos completar la búsqueda. Intenta nuevamente.'});}
 finally {res.off('close',abort);}
}
