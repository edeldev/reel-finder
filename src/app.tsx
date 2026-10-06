import {useState,useEffect,useRef} from 'react';
import {Search,Heart,History,Settings as SettingsIcon,PanelLeftClose,PanelLeftOpen,Clapperboard,ArrowUpRight,Menu,X,CheckCheck} from 'lucide-react';
import {Toaster,toast} from 'sonner';
import {SearchPage} from './pages/search_page';
import {SavedPage} from './pages/saved_page';
import {HistoryPage} from './pages/history_page';
import {SettingsPage} from './pages/settings_page';
import {VideoCard} from './components/video_card';
import {useSavedVideos} from './hooks/use_saved_videos';
import {useSearchHistory} from './hooks/use_search_history';
import {useStorage} from './lib/storage';
import {searchVideos} from './lib/api';
import {platforms,type Platform,type VideoResult,type Settings,type SearchHistory} from './types/video';
type Page='search'|'saved'|'history'|'settings';
const routes:Record<Page,string>={search:'Buscar',saved:'Guardados',history:'Historial',settings:'Configuración'};
const getPage=():Page=>{const page=location.hash.slice(1);return page in routes ? page as Page:'search';};
const defaults:Settings={accounts:[{id:'account-1',name:'Cuenta 1'},{id:'account-2',name:'Cuenta 2'},{id:'account-3',name:'Cuenta 3'}],results_per_search:20};
function validSettings(v:unknown):v is Settings{if(!v||typeof v!=='object')return false;const s=v as Settings;return [10,20,30].includes(s.results_per_search)&&Array.isArray(s.accounts)&&s.accounts.length===3&&s.accounts.every((a,i)=>a&&a.id===`account-${i+1}`&&typeof a.name==='string'&&!!a.name.trim());}
export default function App(){
 const [page,setPage]=useState<Page>(getPage);const [collapsed,setCollapsed]=useStorage('reel-finder:sidebar',false,(v):v is boolean=>typeof v==='boolean');const [mobileOpen,setMobileOpen]=useState(false);
 const [settings,setSettings]=useStorage<Settings>('reel-finder:settings',defaults,validSettings);const videos=useSavedVideos();const history=useSearchHistory();
 const [query,setQuery]=useState('');const [selected,setSelected]=useState<Platform[]>([...platforms]);const [duration,setDuration]=useState(true);const [results,setResults]=useState<VideoResult[]>([]);const [searched,setSearched]=useState('');const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [warnings,setWarnings]=useState<string[]>([]);const [configured,setConfigured]=useState<boolean|null>(null);
 const active=useRef<{controller:AbortController;key:string}|null>(null);
 useEffect(()=>{const onHash=()=>setPage(getPage());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/health',{signal:c.signal}).then(r=>r.json()).then(d=>setConfigured(typeof d.configured==='boolean'?d.configured:null)).catch(()=>{});return()=>{c.abort();active.current?.controller.abort();};},[]);
 function navigate(next:Page){location.hash=next;setPage(next);setMobileOpen(false);window.scrollTo({top:0});}
 async function search(text:string,options?:{platforms:Platform[];limit:number}){
 const term=text.trim();const target=options?.platforms??selected;const limit=options?.limit??settings.results_per_search;if(!term||!target.length)return;
 const key=JSON.stringify([term,[...target].sort(),limit]);if(active.current?.key===key)return;
 active.current?.controller.abort();const controller=new AbortController();active.current={controller,key};setQuery(term);setSelected(target);setSearched(term);setLoading(true);setResults([]);setError('');setWarnings([]);navigate('search');
 try{const data=await searchVideos(term,target,limit,controller.signal);if(active.current?.controller!==controller)return;setResults(data.results);setWarnings(data.warnings);setConfigured(true);history.add({query:term,platforms:target,result_count:data.results.length,limit});}
 catch(e){if(controller.signal.aborted)return;setError(e instanceof Error?(e.name==='TimeoutError'?'La búsqueda tardó demasiado. Intenta nuevamente.':e.message):'No se pudo conectar con el servidor.');}
 finally{if(active.current?.controller===controller){active.current=null;setLoading(false);}}
 }
 function cancel(){active.current?.controller.abort();active.current=null;setLoading(false);setWarnings(['Búsqueda cancelada. Puedes iniciar otra cuando quieras.']);}
 const renderCard=(video:VideoResult,editable=false)=><VideoCard key={video.id} video={video} saved={videos.find(video.url)} accounts={settings.accounts} onToggle={()=>videos.toggle(video,searched)} onDelete={editable?()=>videos.remove(video.id):undefined} onUpdate={editable?patch=>videos.update(video.id,patch):undefined}/>;
 const usedCount=videos.saved.filter(v=>v.status==='used').length;
 return <div className={`app-shell ${collapsed?'collapsed':''}`}><Toaster position="bottom-right" richColors closeButton/><button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Abrir navegación">{mobileOpen?<X size={20}/>:<Menu size={20}/>}</button>{mobileOpen&&<button className="sidebar-overlay" aria-label="Cerrar navegación" onClick={()=>setMobileOpen(false)}/>}
 <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}><a className="brand" href="#search" onClick={()=>navigate('search')} title="Reel Finder"><span className="brand-icon"><Clapperboard size={23}/></span><span className="brand-name">reel<span>finder</span><span className="brand-dot">.</span></span></a><div className="sidebar-section-label">TU ESPACIO CREATIVO</div><nav aria-label="Navegación principal">{([{key:'search',Icon:Search},{key:'saved',Icon:Heart},{key:'history',Icon:History}] as const).map(({key,Icon})=><a href={`#${key}`} key={key} onClick={()=>navigate(key)} className={`nav-item ${page===key?'active':''}`} title={routes[key]} aria-current={page===key?'page':undefined}><Icon size={19}/><span>{routes[key]}</span>{key==='saved'&&<span className="nav-count">{videos.saved.length}</span>}{key==='search'&&<span className="nav-active-dot"/>}</a>)}</nav>
 <div className="sidebar-bottom"><div className="creative-note"><div className="note-icon"><Clapperboard size={19}/><ArrowUpRight size={14}/></div><strong>Una buena reacción<br/>empieza con una historia.</strong><p>Tu siguiente idea está<br/>a una búsqueda.</p></div><a className={`nav-item ${page==='settings'?'active':''}`} href="#settings" onClick={()=>navigate('settings')} title="Configuración"><SettingsIcon size={19}/><span>Configuración</span></a><button className="collapse-button" onClick={()=>setCollapsed(!collapsed)} title={collapsed?'Expandir menú':'Colapsar menú'} aria-label={collapsed?'Expandir menú':'Colapsar menú'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}<span>Colapsar menú</span></button><div className="profile"><span className="avatar">CR</span><div><strong>Mi espacio creativo</strong><span>Listo para crear</span></div><span className="profile-dot"/></div></div></aside>
 <div className="main-shell"><header className="topbar"><div className="breadcrumb">Mi espacio <span>/</span><strong>{routes[page]}</strong></div><div className="topbar-right"><span className="workspace-badge"><CheckCheck size={14}/>Tu inspiración, organizada</span><span className="top-avatar">CR</span></div></header><main>
 {page==='search'&&<SearchPage query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} duration={duration} setDuration={setDuration} search={search} loading={loading} cancel={cancel} searched={searched} results={results} warnings={warnings} error={error} configured={configured} renderCard={v=>renderCard(v)} savedCount={videos.saved.length} usedCount={usedCount} goSaved={()=>navigate('saved')}/>}
 {page==='saved'&&<SavedPage onClear={videos.clear} saved={videos.saved} renderCard={v=>renderCard(v,true)} goSearch={()=>navigate('search')}/>}
 {page==='history'&&<HistoryPage history={history.history} clear={()=>{history.clear();toast.success('Historial borrado');}} repeat={(h:SearchHistory)=>search(h.query,{platforms:h.platforms,limit:h.limit})}/>}
 {page==='settings'&&<SettingsPage settings={settings} save={setSettings} configured={configured}/>}
 </main></div></div>;
}
