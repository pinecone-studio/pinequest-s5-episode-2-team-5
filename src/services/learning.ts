import {supabase} from '@/lib/supabase';
import {applyLessonPack} from '@/data/revision-hub';
import {applyInvestigations} from '@/lib/textbook-investigations';
export type PackId='g7-chem'|'g8-chem'|'g9-chem'|'g10-chem';
/** The API returns published teaching content only; credentials never enter the lab iframe. */
export async function fetchLearningContent(packId:PackId,signal:AbortSignal){
 const [pack,activities]=await Promise.all([
  supabase.from('lesson_packs').select('content').eq('id',packId).eq('is_published',true).eq('schema_version',1).abortSignal(signal).maybeSingle(),
  supabase.from('textbook_investigations').select('id,content').eq('grade',packId==='g7-chem'?7:packId==='g10-chem'?10:packId==='g9-chem'?9:8).eq('is_published',true).eq('schema_version',1).order('sort_order').abortSignal(signal),
 ]);
 if(pack.error||activities.error)throw new Error('Learning content unavailable');
 return {pack:pack.data?.content,investigations:activities.data??[]};
}
export async function loadLearningContent(packId:PackId){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
 try{const data=await fetchLearningContent(packId,controller.signal);if(data.pack)applyLessonPack(packId,data.pack);applyInvestigations(data.investigations);return data;}finally{clearTimeout(timeout);}
}

export async function syncRevision(userId:string,packId:PackId,value:import('@/lib/revision-sync').RevisionSnapshot){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
 let response;try{response=await supabase.rpc('sync_revision_progress',{p_pack:packId,p_state:value.state,p_clocks:value.clocks,p_user:userId}).abortSignal(controller.signal);}finally{clearTimeout(timeout);}
 const {data,error}=response;
 if(error)throw new Error('Revision progress could not sync');
 const {restoreSnapshot}=await import('@/lib/revision-sync');
 if(data?.state?.version!==1||!data?.clocks)throw new Error('Invalid revision progress');
 return restoreSnapshot(data);
}
