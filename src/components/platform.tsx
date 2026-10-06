import { Music2, Instagram, Facebook } from 'lucide-react';
import type { Platform } from '../types/video';
export const platformNames={tiktok:'TikTok',instagram:'Instagram',facebook:'Facebook'};
export function PlatformIcon({platform,size=16}:{platform:Platform;size?:number}){const Icon={tiktok:Music2,instagram:Instagram,facebook:Facebook}[platform];return <Icon size={size}/>;}
