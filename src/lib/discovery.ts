import {fold} from '../data/search_terms';
import {normalize_video_url} from './url';
import type {Platform} from '../types/video';
export interface DiscoveryEntry {round:number;urls:string[]}
export type DiscoveryState=Record<string,DiscoveryEntry>;
export const discoveryKey=(query:string,platforms:Platform[])=>JSON.stringify([fold(query.trim()).replace(/\s+/g,' '),[...platforms].sort()]);
export function rememberDiscovery(state:DiscoveryState,key:string,urls:string[]):DiscoveryState{
 const previous=state[key]??{round:0,urls:[]};
 const next={...state};delete next[key];
 const updated={...next,[key]:{round:previous.round>=100000?0:previous.round+1,urls:[...new Set([...previous.urls,...urls.map(normalize_video_url)])].slice(-150)}};
 return Object.fromEntries(Object.entries(updated).slice(-50));
}
export function validDiscovery(value:unknown):value is DiscoveryState{
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(v=>v&&Number.isInteger(v.round)&&v.round>=0&&v.round<=100000&&Array.isArray(v.urls)&&v.urls.every((u:unknown)=>typeof u==='string'));
}
