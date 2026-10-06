import { platforms, type Platform, type VideoResult } from '../src/types/video.js';
import { build_reaction_queries, fold } from '../src/data/search_terms.js';
import { reference_queries } from '../src/data/content_references.js';
import { reaction_match } from '../src/lib/reaction_match.js';
import { normalize_video_url, video_platform } from '../src/lib/url.js';
const labels = {tiktok:'TikTok', instagram:'Instagram', facebook:'Facebook'};
const domains = {tiktok:'tiktok.com', instagram:'instagram.com', facebook:'facebook.com'};
const scopes = {tiktok:'site:tiktok.com inurl:video', instagram:'site:instagram.com/reel', facebook:'site:facebook.com/reel'};
export class SearchError extends Error { constructor(public status: number, message: string) {super(message);} }
export function rank_video_results(results: VideoResult[], query: string): VideoResult[] {
 const words = fold(query).split(/\s+/).filter(Boolean);
 const rank = (v: VideoResult) => reaction_match(v,query).score * 3 + words.reduce((n,w) => n + (fold(v.title).includes(w) ? 3 : fold(v.description).includes(w) ? 1 : 0),0) + (video_platform(v.url) ? 2 : 0) + (v.score ?? 0) * 2 + (v.thumbnail_url ? .2 : 0) + (v.duration_seconds !== null ? .2 : 0);
 return [...results].sort((a,b) => rank(b)-rank(a));
}
export function map_result(raw: unknown): VideoResult | null {
 if (!raw || typeof raw !== 'object') return null;
 const r = raw as Record<string, unknown>;
 if (typeof r.url !== 'string' || typeof r.title !== 'string' || !r.title.trim()) return null;
 const platform = video_platform(r.url); if (!platform) return null;
 const url = normalize_video_url(r.url);
 // Search snippets and query-level images cannot verify a video's duration or thumbnail.
 return {id: url, url, platform, title: r.title.slice(0,400), description: typeof r.content === 'string' ? r.content.slice(0,650) : '', thumbnail_url: null, duration_seconds: null, score: typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : null};
}
export async function search_videos(query: string, selected: Platform[], limit: number, key: string, signal?: AbortSignal, discovery:{round:number;exclude_urls:string[]}={round:0,exclude_urls:[]}) {
 const variations = build_reaction_queries(query,discovery.round);
 const searches = selected.flatMap(platform => [...variations,...reference_queries(query,platform)].map(term => ({platform, term})));
 const responses = await Promise.allSettled(searches.map(async ({platform,term}) => {
  const response = await fetch('https://api.tavily.com/search', {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${key}`}, body:JSON.stringify({query:`${scopes[platform]} ${term}`, search_depth:'basic', topic:'general', max_results:Math.min(20, Math.max(5,Math.ceil(limit/selected.length))), include_domains:[domains[platform]], include_answer:false, include_raw_content:false, include_images:false}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(18000)]) : AbortSignal.timeout(18000)});
  if (!response.ok) throw new SearchError(response.status === 401 ? 503 : [429,432,433].includes(response.status) ? 429 : 502, response.status === 401 ? 'La clave de Tavily no es válida. Revísala en el servidor.' : [429,432,433].includes(response.status) ? 'Tavily alcanzó su límite de solicitudes o créditos. Intenta más tarde.' : 'Tavily no pudo completar la búsqueda. Intenta de nuevo.');
  const data = await response.json(); if (!Array.isArray(data.results)) throw new SearchError(502,'El servicio de búsqueda devolvió una respuesta inesperada.');
  return {platform, results:data.results.map(map_result).filter((v: VideoResult | null): v is VideoResult => !!v && v.platform === platform && reaction_match(v, query).topic && !reaction_match(v, query).excluded)};
 }));
 const successful = responses.filter((r): r is PromiseFulfilledResult<{platform:Platform; results:VideoResult[]}> => r.status === 'fulfilled');
 if (!successful.length) { const reason = (responses[0] as PromiseRejectedResult).reason; if (reason instanceof SearchError) throw reason; throw new SearchError(504,'La búsqueda tardó demasiado o no pudo conectarse. Intenta nuevamente.'); }
 const unique = new Map<string,VideoResult>(); successful.forEach(r=>r.value.results.forEach(v=>{const previous=unique.get(v.url);if(!previous || reaction_match(v,query).score>reaction_match(previous,query).score || (reaction_match(v,query).score===reaction_match(previous,query).score && (v.score??0)>(previous.score??0))) unique.set(v.url,v);}));
 const warnings: string[] = [];
 selected.forEach(p=> {if (!successful.some(r=>r.value.platform===p)) warnings.push(`No pudimos consultar ${labels[p]}. Los demás resultados están disponibles.`); else if (!successful.some(r=>r.value.platform===p && r.value.results.length)) warnings.push(`No encontramos videos públicos indexados de ${labels[p]} para estas consultas.`);});
 if (responses.some(r=>r.status==='rejected') && !warnings.some(w=>w.startsWith('No pudimos'))) warnings.push('Una búsqueda adicional falló; los resultados pueden ser parciales.');
 const excluded=new Set(discovery.exclude_urls.map(normalize_video_url));
 const results=rank_video_results([...unique.values()].filter(v=>!excluded.has(v.url)),query).slice(0,limit);
 if(excluded.size&&!results.length)warnings.push('Estas consultas no encontraron videos diferentes a los que ya revisaste. Prueba una escena más específica o una plataforma distinta.');
 if(results.some(v=>!reaction_match(v,query).matches)) warnings.push('Algunos enlaces tienen descripciones incompletas y su formato está por confirmar. Priorizamos escenas concretas, con o sin videoreacción; revisa el contenido original.');
 return {results, warnings};
}
