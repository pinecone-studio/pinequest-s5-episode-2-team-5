import {create} from 'zustand';
/** Consumed once by the selected experiment's guide, including before stock preparation. */
export const useShowcaseLaunch=create<{id:string|null;sequence:number}>(()=>({id:null,sequence:0}));
export function requestShowcase(id:string){useShowcaseLaunch.setState(s=>({id,sequence:s.sequence+1}));}
