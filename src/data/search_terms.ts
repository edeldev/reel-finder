import {sceneProfiles} from './content_references.js';
export const quickTerms = ['Karma', 'Infidelidad', 'Humillación', 'Paz mental', 'Relaciones', 'Justicia', 'Respeto', 'Actos de bondad', 'Trabajadora humillada', 'Gestos de pareja', 'Límites personales'];
export const searchTerms: Record<string, string[]> = {
 karma: ['karma instantáneo', 'instant karma', 'gets what he deserved', 'rude person gets karma', 'instant justice'],
 infidelidad: ['caught cheating', 'cheating girlfriend', 'cheating boyfriend', 'infidelity caught', 'relationship betrayal'],
 humillacion: ['public humiliation', 'bully gets humbled'], 'paz mental': ['peace of mind', 'protect your peace'], relaciones: ['relationship conflict', 'couple argument'], justicia: ['instant justice', 'instant karma'], respeto: ['disrespectful person', 'setting boundaries'], 'actos de bondad': ['random acts of kindness', 'helping strangers'],
 'falta de respeto': ['disrespectful person', 'rude people'], 'personas arrogantes': ['arrogant person gets humbled'], 'empleados vs clientes': ['rude customer employee', 'customer confrontation'], 'discusiones de pareja': ['couple argument', 'relationship conflict'], 'limites personales': ['setting boundaries'], suegras: ['mother in law conflict'], bodas: ['wedding drama'], propuestas: ['marriage proposal'], 'adultos mayores': ['helping elderly'], mascotas: ['funny pets', 'animal rescue'], bullying: ['bully gets humbled'], 'superacion personal': ['overcoming adversity', 'personal growth']
};
export function fold(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function build_search_queries(query: string): string[] {
 const normalized = fold(query); const match = Object.keys(searchTerms).sort((a,b)=>b.length-a.length).find(key => normalized.includes(key));
 return [...new Set([query.trim(), ...(match ? searchTerms[match] : [])])];
}

// Search for an actual situation as well as a reaction, never requiring a narrator.
export function build_reaction_queries(query: string): string[] {
 const terms = build_search_queries(query);
 const topic = query.trim().replace(/["\n\r]/g, ' ');
 const profile=sceneProfiles.find(p=>p.keys.some(key=>fold(topic).includes(key)));
 return [
  `${topic} ${profile?.scenario??'escena captada'} video -podcast -tutorial`,
  `${profile?.english??terms[1]??topic} reaction video -podcast -skit`,
 ];
}
