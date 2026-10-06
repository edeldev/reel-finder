import {build_search_queries, fold} from '../data/search_terms.js';
import {sceneProfiles,creatorReferences,footageSources} from '../data/content_references.js';
import type {VideoResult} from '../types/video.js';

// These signals describe indexed text, not a verified analysis of the video.
const reaction = /\b(videoreacci\w*|video reacci\w*|reaccion\w*|reaction\w*|reacts?\b|reacting\b|dueto\b|duet\b|stitch\b|comenta (este|el) video|analiz\w* (este|el) video)/;
const scene = /\b(captad\w*|grabado\w*|grabacion\w*|camara\w*|caught\b|cctv\b|footage\b|on camera|real incident|en este video|lo que (paso|ocurrio)|esta escena|este (incidente|video muestra)|sorprend\w*|descubri\w*|encontro\b|encontraron\b|enfrent\w*|confront\w*|humill(a|an|o|aron|ad[oa]s?)\b|agredi\w*|expuls\w*|gets humbled|gets karma|gets what|betrayal caught|pillad\w*|discusion\w*|embarazad\w*|pregnant\b|se sube\b|cede\b|sostiene\b|abraza\b|broma\w*|golpe\w*|ayudo\b|ayudando\b|ayuda a\b|helping|kindness)/;
const reflection = /\b(reflexion\w*|leccion\w*|ensenanza\w*|moraleja\w*|aprend\w*|nos ensena|lesson\w*|takeaway\w*|moral of|learn from|what we can learn)/;
const staged = /\b(sketch\w*|skit\w*|dramatiz\w*|actuad\w*|scripted\b|staged\b|ficcion\b|fiction\b|parodia\w*|parody\b|serie sobre|novela\w*|telenovela\w*|drama familiar en television)/;
const monologue = /\b(podcast\w*|tutorial\w*|frases (de|sobre)|quotes\b|tips (for|para)|consejos\b|claves para|tips\b|como (superar|sanar|olvidar)|terapeuta\w*|therapist\w*|psicologo\w*)/;
export function reaction_match(video: VideoResult, query: string) {
 const text=fold(`${video.title} ${video.description}`).replace(/\b[\d.,]+\s*[km]?\s+(reactions?|views?|likes?)\b/g,'');
 const profile=sceneProfiles.find(p=>p.keys.some(key=>fold(query).includes(key)));
 const topicTerms=[...build_search_queries(query),...(profile?.terms??[])].map(fold);
 const topic=topicTerms.some(term=>text.includes(term)) || fold(query).split(/\s+/).filter(w=>w.length>3).some(word=>text.includes(word));
 const signals={topic,reaction:reaction.test(text),scene:scene.test(text),reflection:reflection.test(text),excluded:staged.test(text)||(monologue.test(text)&&!scene.test(text))};
 const reference=[...creatorReferences.map(c=>c.handle),...footageSources.map(c=>fold(c.term))].some(term=>text.includes(term)||fold(video.url).includes(term));
 const score=(signals.topic?4:0)+(signals.reaction?3:0)+(signals.scene?8:0)+(signals.reflection?1:0)+(reference?1:0);
 return {...signals,score,matches:signals.topic&&(signals.reaction||signals.scene)&&!signals.excluded};
}
