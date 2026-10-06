import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize_video_url,video_platform} from '../src/lib/url';
import {reaction_match} from '../src/lib/reaction_match';
import {build_search_queries,build_reaction_queries} from '../src/data/search_terms';
import {map_result,rank_video_results,search_videos,SearchError} from '../backend/search_service';

test('normalización conserva IDs funcionales y elimina tracking',()=>{
 assert.equal(normalize_video_url('https://www.facebook.com/watch/?v=123&fbclid=track&utm_source=share#x'),'https://facebook.com/watch?v=123');
 assert.equal(normalize_video_url('https://www.instagram.com/reel/ABC/?igsh=tracking'),'https://instagram.com/reel/ABC');
 assert.throws(()=>normalize_video_url('javascript:alert(1)'));
});
test('solo acepta URLs de videos de dominios reales',()=>{
 assert.equal(video_platform('https://www.tiktok.com/@creator/video/123'),'tiktok');
 assert.equal(video_platform('https://instagram.com/reel/ABC/'),'instagram');
 assert.equal(video_platform('https://facebook.com/watch/?v=123'),'facebook');
 for(const url of ['https://tiktok.com.evil.com/@a/video/123','https://instagram.com/explore/','https://facebook.com/profile.php?id=123','https://instagram.com/reel/','invalid','javascript:alert(1)'])assert.equal(video_platform(url),null);
});
test('expansiones español-inglés sin API adicional',()=>{assert.ok(build_search_queries('Karma').includes('instant karma'));assert.ok(build_search_queries('Infidelidad').includes('caught cheating'));assert.ok(build_search_queries('Humillación').includes('public humiliation'));assert.deepEqual(build_search_queries('Tema nuevo'),['Tema nuevo']);});
test('no inventa metadata del contenido ni acepta páginas genéricas',()=>{const v=map_result({url:'https://instagram.com/reel/ABC',title:'Karma',content:'47 segundos, 200 likes',score:.9,images:[{url:'https://example.com/image.jpg'}]});assert.ok(v);assert.equal(v.duration_seconds,null);assert.equal(v.thumbnail_url,null);assert.equal(map_result({url:'https://instagram.com/explore',title:'Example'}),null);assert.equal(map_result({url:'invalid',title:'Example'}),null);});
test('coincidencia de tema prioriza el ranking',()=>{const relevant=map_result({url:'https://instagram.com/reel/a',title:'Karma instantáneo',score:.5})!;const other=map_result({url:'https://instagram.com/reel/b',title:'Otros videos',score:.9})!;assert.equal(rank_video_results([other,relevant],'karma')[0].id,relevant.id);});
test('búsqueda real maneja fallas parciales, duplica consultas y deduplica URLs',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_input,init)=>{calls++;const request=JSON.parse(init!.body as string);assert.equal((init!.headers as Record<string,string>).Authorization,'Bearer test-key');assert.ok(request.include_domains.length===1);assert.match(request.query,/video/);if(request.include_domains[0]==='facebook.com')return new Response('',{status:429});return Response.json({results:[{url:'https://instagram.com/reel/ABC/?utm_source=share',title:'Karma: reaccionando al video',content:'Captado en cámara, una lección para reflexionar.',score:.8},{url:'https://instagram.com/reel/ABC/',title:'Karma: reaction',content:'Caught on camera, life lesson.',score:.9},{url:'https://instagram.com/explore/',title:'Generic'}]});};
 try{const result=await search_videos('karma',['instagram','facebook'],20,'test-key');assert.equal(calls,7);assert.equal(result.results.length,1);assert.ok(result.warnings.some(w=>w.includes('Facebook')));}finally{globalThis.fetch=original;}
});
test('rate limit upstream produce un error entendible',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:429});try{await assert.rejects(()=>search_videos('karma',['tiktok'],20,'test-key'),(e:unknown)=>e instanceof SearchError && e.status===429);}finally{globalThis.fetch=original;}});
test('respuesta inesperada es un error controlado',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({unexpected:true});try{await assert.rejects(()=>search_videos('new topic',['tiktok'],10,'test-key'),(e:unknown)=>e instanceof SearchError && e.status===502);}finally{globalThis.fetch=original;}});

function candidate(title:string,description='') {return map_result({url:'https://instagram.com/reel/example',title,content:description,score:.99})!;}
test('consultas cortas enfocadas sin exigir reflexión',()=>{const queries=build_reaction_queries('infidelidad');assert.equal(queries.length,2);assert.match(queries[0],/infidelidad.*pareja descubierta.*video/);assert.match(queries[1],/caught cheating.*reaction/);assert.ok(queries.every(q=>!q.includes('reflexión')&&!q.includes('life lesson')));});
test('selecciona reacción a un incidente con reflexión en español e inglés',()=>{assert.equal(reaction_match(candidate('Reaccionando a infidelidad captada en cámara','Reflexión sobre lo que ocurrió.'),'infidelidad').matches,true);assert.equal(reaction_match(candidate('Caught cheating reaction','Real incident caught on camera. A life lesson.'),'infidelidad').matches,true);});
test('conserva reacción o escena sin exigir reflexión y excluye ficción explícita',()=>{assert.equal(reaction_match(candidate('Karma reaction caught on camera'),'karma').matches,true);assert.equal(reaction_match(candidate('Karma instantáneo captado en cámara'),'karma').matches,true);for(const v of [candidate('Karma reaction life lesson skit'),candidate('Podcast karma reacción')])assert.equal(reaction_match(v,'karma').excluded,true);});
test('ranking prioriza formato solicitado frente a tema general con score alto',()=>{const general=candidate('Infidelidad, infidelidad: reflexión y consejos');const specific={...candidate('Reaccionando a infidelidad captada en cámara','Una reflexión y lección de lo que ocurrió.'),score:.1};assert.equal(rank_video_results([general,specific],'infidelidad')[0],specific);});

test('descripciones incompletas no vacían la búsqueda y reciben un aviso',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({results:[{url:'https://instagram.com/reel/short',title:'Karma',content:'',score:.8},{url:'https://instagram.com/reel/podcast',title:'Podcast sobre karma',score:.9}]});try{const result=await search_videos('karma',['instagram'],20,'test-key');assert.equal(result.results.length,1);assert.ok(result.warnings.some(w=>w.includes('formato está por confirmar')));}finally{globalThis.fetch=original;}});

test('contadores de Facebook no son señales de videoreacción',()=>{const signals=reaction_match(candidate('14K reactions | Caught cheating','48K views · 103 reactions'),'infidelidad');assert.equal(signals.reaction,false);assert.equal(signals.scene,true);});
test('descarta escenas identificadas como ficción y monólogos de terapia',()=>{assert.equal(reaction_match(candidate('Infidelidad, reacción','Serie sobre infidelidad, drama familiar en televisión'),'infidelidad').excluded,true);assert.equal(reaction_match(candidate('Infidelidad: tu terapeuta te ayuda'),'infidelidad').excluded,true);});
test('descarta videos ajenos al tema aunque contengan cámara y reacción',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({results:[{url:'https://facebook.com/reel/123',title:'Cutest baby reaction caught on camera',score:.99},{url:'https://facebook.com/reel/124',title:'Facebook',content:'Facebook',score:.9}]});try{const result=await search_videos('infidelidad',['facebook'],20,'test-key');assert.equal(result.results.length,0);}finally{globalThis.fetch=original;}});

test('referencias incluyen originales sin narrador ni reflexión',()=>{assert.equal(reaction_match(candidate('Humillaron a esta trabajadora sin razón','Una empleada en la gasolinera, UPSOMEDIA'),'humillación').matches,true);assert.equal(reaction_match(candidate('Un esposo ayuda a su pareja embarazada','Pequeños gestos de cuidado.'),'relaciones').matches,true);assert.equal(reaction_match(candidate('Un guardia enfrenta al hombre','Una broma sale mal y termina en confrontación.'),'karma').matches,true);});
test('escena original relevante puede superar una reflexión general del creador',()=>{const original=candidate('Humillaron a esta trabajadora','Escena captada en la gasolinera');const commentary=candidate('Reflexión sobre humillación','elson_olivei reflexiona sobre este tema');assert.equal(rank_video_results([commentary,original],'humillación')[0],original);});

test('consejos de pareja no se confunden con escenas por decir encontrar equilibrio',()=>{const v=candidate('Consecuencias de descuidar a tu pareja por el trabajo','Descubre cómo encontrar el equilibrio. #consejos #pareja');const signals=reaction_match(v,'gestos de pareja');assert.equal(signals.scene,false);assert.equal(signals.excluded,true);});
