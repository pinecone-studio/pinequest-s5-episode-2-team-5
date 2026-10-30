import type {InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
import {useLabStore} from '../../../store/useLabStore';
import {requestShowcase} from './launch-store';
/** false бол заавар самбар дээрх шар «ЭНЭ ТУРШИЛТЫН 3D ҮЗҮҮЛБЭР» товч гарахгүй (код хэвээр, true болгоход буцаж гарна) */
export const SHOW_3D_SHOWCASE_BUTTON: boolean = false;
/** This button belongs to the selected experiment's guide; it never changes experiments. */
export function ShowcaseLauncher({definition}:{definition:InvestigationDefinition}){
 if(!SHOW_3D_SHOWCASE_BUTTON&&definition.id!=='nacl')return null;
 return <><button type="button" aria-label="Энэ туршилтын 3D үзүүлбэр" className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-amber-600 bg-[#F5B800] px-4 py-3 text-left text-slate-950 shadow-md hover:bg-amber-300 focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-600" onClick={()=>{if(useLabStore.getState().active===definition.id)requestShowcase(definition.id);}}><span aria-hidden="true" className="text-3xl">▶</span><span><strong className="block text-sm">ЭНЭ ТУРШИЛТЫН 3D ҮЗҮҮЛБЭР</strong><span className="block text-[11px]">{definition.title}</span></span></button><p className="mt-1 text-[10px] text-slate-600">Энэ туршилтын шинэ дээжээр үзүүлнэ. Түр зогсоож, өөрөө үргэлжлүүлж болно.</p></>;
}
