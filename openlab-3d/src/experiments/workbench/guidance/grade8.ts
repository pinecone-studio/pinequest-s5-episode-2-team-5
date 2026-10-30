import links from '../../../data/textbook-experiments/lab-links.json';
import {useLabStore} from '../../../store/useLabStore';
import {grade8Chemistry} from '../../../chemistry/grade8';

/**
 * Grade 8 labs keep their earlier full 3D demonstration: the demo button, equipment tour, step
 * strip, reaction camera and reaction visuals. Every other grade uses the main lab unchanged.
 */
export const GRADE8_LABS:ReadonlySet<string>=new Set(['nacl',...Object.entries(links as Record<string,string>).filter(([book])=>book.startsWith('8-')).map(([,lab])=>lab)]);
export const isGrade8Lab=(id:string|null|undefined)=>!!id&&GRADE8_LABS.has(id);
export const grade8Active=()=>isGrade8Lab(useLabStore.getState().active);
export const useGrade8Lab=()=>useLabStore(s=>isGrade8Lab(s.active));

// Deferred: this module can load while the lab store is still initialising (session ↔ store import cycle).
queueMicrotask(()=>{grade8Chemistry.active=grade8Active();useLabStore.subscribe(s=>{grade8Chemistry.active=isGrade8Lab(s.active);});});
