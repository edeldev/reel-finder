import { useStorage } from '../lib/storage';
import { normalize_video_url, video_platform } from '../lib/url';
import type { SavedVideo, VideoResult } from '../types/video';
import { toast } from 'sonner';
function isSaved(value:unknown):value is SavedVideo[] {return Array.isArray(value) && value.every(v=>v && typeof v.id==='string' && typeof v.url==='string' && video_platform(v.url)===v.platform && typeof v.title==='string' && typeof v.description==='string' && ['pending','used','discarded'].includes(v.status) && Array.isArray(v.used_in) && v.used_in.every((a:unknown)=>typeof a==='string') && typeof v.saved_at==='string' && typeof v.search_query==='string' && (v.duration_seconds===null || typeof v.duration_seconds==='number'));}
export function useSavedVideos() {
 const [saved,setSaved]=useStorage<SavedVideo[]>('reel-finder:saved',[],isSaved);
 const find=(url:string)=>saved.find(v=>normalize_video_url(v.url)===normalize_video_url(url));
 function toggle(video:VideoResult,query:string) {const existing=find(video.url);setSaved(current=>existing ? current.filter(v=>v.id!==existing.id) : [{...video,url:normalize_video_url(video.url),search_query:query,saved_at:new Date().toISOString(),status:'pending',used_in:[]},...current]);toast.success(existing?'Video eliminado de guardados':'Video guardado. Listo para tu próxima reacción.');}
 function update(id:string,patch:Partial<Pick<SavedVideo,'status'|'used_in'>>) {setSaved(current=>current.map(v=>v.id===id?{...v,...patch}:v));}
 function remove(id:string) {setSaved(current=>current.filter(v=>v.id!==id));toast.success('Video eliminado de guardados');}
 function clear() {setSaved([]);toast.success('Todos los videos guardados fueron eliminados');}
 return {saved,find,toggle,update,remove,clear};
}
