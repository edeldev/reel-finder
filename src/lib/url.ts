import type { Platform } from '../types/video.js';
export function normalize_video_url(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('URL inválida');
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key) || ['fbclid', 'igsh', 'igshid', 'tt_from', 'is_from_webapp', 'sender_device', 'share_app_id', 'share_link_id', '_r', '_t'].includes(key)) url.searchParams.delete(key);
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.searchParams.sort();
  return url.toString();
}
export function video_platform(value: string): Platform | null {
  try { const u = new URL(value); if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null;
    const host = u.hostname.replace(/^www\./, '');
    if ((host === 'tiktok.com' || host.endsWith('.tiktok.com')) && /^\/@[^/]+\/video\/\d+\/?$/.test(u.pathname)) return 'tiktok';
    if ((host === 'instagram.com' || host.endsWith('.instagram.com')) && /^\/(reel|reels)\/[^/]+\/?$/.test(u.pathname)) return 'instagram';
    if ((host === 'facebook.com' || host.endsWith('.facebook.com')) && (/^\/reel\/\d+\/?$/.test(u.pathname) || /\/videos\/[^/]+/.test(u.pathname) || (u.pathname.replace(/\/$/, '') === '/watch' && /^\d+$/.test(u.searchParams.get('v') || '')))) return 'facebook';
  } catch { /* Malformed search results are excluded. */ } return null;
}
