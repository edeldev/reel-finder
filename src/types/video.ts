export const platforms = ['tiktok', 'instagram', 'facebook'] as const;
export type Platform = typeof platforms[number];
export type VideoStatus = 'pending' | 'used' | 'discarded';
export interface VideoResult { id: string; title: string; description: string; url: string; platform: Platform; thumbnail_url: string | null; duration_seconds: number | null; score: number | null }
export interface SavedVideo extends VideoResult { search_query: string; saved_at: string; status: VideoStatus; used_in: string[] }
export interface SearchHistory { id: string; query: string; platforms: Platform[]; result_count: number; searched_at: string; limit: number }
export interface Settings { accounts: {id: string; name: string}[]; results_per_search: 10 | 20 | 30 }
export interface SearchResponse { results: VideoResult[]; warnings: string[] }
