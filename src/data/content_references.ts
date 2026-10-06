import type {Platform} from '../types/video.js';

// User-supplied accounts are search references, not proof of authorship or authenticity.
export const creatorReferences = [
 {platform:'instagram' as Platform,handle:'christianrenaudn',url:'https://www.instagram.com/christianrenaudn/'},
 {platform:'instagram' as Platform,handle:'elson_olivei',url:'https://www.instagram.com/elson_olivei/'},
];
// UPSOMEDIA is visible as a watermark in the supplied worker video.
export const footageSources = [{platform:'facebook' as Platform,term:'UPSOMEDIA'}];
export const sceneProfiles = [
 {keys:['humillacion','humillaciones','humillado','humillaron','empleados vs clientes','trabajador','trabajadora'],terms:['humillaron','trabajadora','trabajador humillado','empleada humillada','cliente grosero','rude customer','worker humiliated','disrespectful customer'],scenario:'cliente humilla a trabajador',english:'rude customer worker'},
 {keys:['infidelidad','infidelidades','infiel'],terms:['infidelidad','infiel','pillado con otra','pillada con otro','caught cheating','cheater','cheating','descubre a su pareja'],scenario:'pareja descubierta con otra persona',english:'caught cheating confrontation'},
 {keys:['karma','justicia','arrogantes','bullying'],terms:['karma','justicia','bully','humbled','gets what he deserved','consecuencias','broma sale mal'],scenario:'broma sale mal consecuencias',english:'instant karma caught on camera'},
 {keys:['relaciones','pareja','respeto','limites','paz mental','gestos de pareja'],terms:['pareja','relaciones','respeto','limites','esposo','esposa','embarazada','pregnant','husband','wife','couple','boundaries','relationship'],scenario:'gesto de pareja respeto',english:'couple respect touching moment'},
 {keys:['bondad','superacion','adultos mayores'],terms:['bondad','ayuda','ayudo','amabilidad','anciano','elderly','kindness','helping','superacion'],scenario:'ayuda a desconocido gesto de bondad',english:'stranger kindness caught on camera'},
];
export function reference_queries(query:string,platform:Platform):string[]{
 const topic=query.trim().replace(/["\n\r]/g,' ');
 return [...creatorReferences.filter(c=>c.platform===platform).map(c=>`${topic} ${c.handle} video`),...footageSources.filter(c=>c.platform===platform).map(c=>`${topic} ${c.term} video`)];
}
