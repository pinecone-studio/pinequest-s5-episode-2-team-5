import {useShowcase} from './showcase';
import {useLabStore} from '../../../store/useLabStore';

/** How long the reaction takes at a real bench; the demo itself is kept short on purpose. */
const REAL_TIME:Record<string,string>={
 'g9-zinc-hcl':'Бодит лабораторид: устөрөгч 5–15 минут жигд ялгарна.',
};

export function RealTimeNote(){
 const active=useLabStore(s=>s.active),playing=useShowcase(s=>s.status==='playing'||s.status==='paused');
 const text=active?REAL_TIME[active]:undefined;
 if(!text||!playing)return null;
 return <div className="pointer-events-none fixed bottom-24 left-3 z-30 sm:bottom-4 max-w-[calc(100vw-1.5rem)] rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-lab-ink shadow-hud" role="note">⏱ {text}</div>;
}
