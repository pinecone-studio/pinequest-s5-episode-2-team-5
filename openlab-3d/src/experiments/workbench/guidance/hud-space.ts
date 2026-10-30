import {useLayoutEffect,type RefObject} from 'react';
import {create} from 'zustand';

/** True while the demo strip is on screen; 3D callouts, toasts and Star then leave the apparatus uncovered. */
export const useDemoShown=create(()=>false);
/** True once the shown demo has played its last step: the result celebration may open then. */
export const useDemoDone=create(()=>false);

/** Bottom edge (px) of every overlay pinned to the top of the bench view, by owner. */
const tops=new Map<string,number>();
/** Top HUD row ("Ширээнээс гарах", "Судалгааны дэвтэр") is always there. */
const BASE_TOP=56;
export const hudTop=()=>Math.max(BASE_TOP,...tops.values());

/** Keeps 3D callouts below a top overlay; call it from a component that always renders `ref`. */
export function useReserveTop(key:string,ref:RefObject<HTMLElement|null>){
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  const measure=()=>tops.set(key,el.getBoundingClientRect().bottom);
  measure();
  const observer=new ResizeObserver(measure);observer.observe(el);
  window.addEventListener('resize',measure);
  return ()=>{observer.disconnect();window.removeEventListener('resize',measure);tops.delete(key);};
 },[key,ref]);
}
