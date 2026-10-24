import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { newAttempt, restoreAttempt, type InvestigationAttempt } from '../../../../src/lib/textbook-investigations';
export const useInquiry = create<{ attempts: Record<string, InvestigationAttempt>; put:(id:string,attempt:InvestigationAttempt)=>void }>()(persist((set)=>({
  attempts:{},put:(id,attempt)=>set((s)=>({attempts:{...s.attempts,[id]:attempt}})),
}),{name:'openlab-textbook-inquiries-v1',version:1,partialize:(s)=>({attempts:s.attempts}),merge:(raw,current)=>{
  const attempts=(raw as {attempts?:Record<string,unknown>})?.attempts??{};
  return {...current,attempts:Object.fromEntries(Object.entries(attempts).map(([id,value])=>[id,restoreAttempt(value)]))};
}}));
export function clearInquiry(id:string) { useInquiry.getState().put(id,newAttempt()); }
