import {useLayoutEffect,type RefObject} from 'react';

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
