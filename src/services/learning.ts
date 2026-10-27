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

/** Progress syncs give up after 6 s; callers keep the device copy and send it again later. */
async function callSync(name:string,args:Record<string,unknown>){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
 let response;try{response=await supabase.rpc(name,args).abortSignal(controller.signal);}finally{clearTimeout(timeout);}
 if(response.error)throw new Error(`${name} failed`);
 return response.data;
}

export async function syncRevision(userId:string,packId:PackId,value:import('@/lib/revision-sync').RevisionSnapshot){
 const data=await callSync('sync_revision_progress',{p_pack:packId,p_state:value.state,p_clocks:value.clocks,p_user:userId});
 const {restoreSnapshot}=await import('@/lib/revision-sync');
 if(data?.state?.version!==1||!data?.clocks)throw new Error('Invalid revision progress');
 return restoreSnapshot(data);
}

export async function syncInvestigation(userId:string,id:string,value:import('@/lib/investigation-sync').AttemptSnapshot){
 const data=await callSync('sync_investigation_attempt',{p_id:id,p_attempt:value.attempt,p_clocks:value.clocks,p_user:userId});
 const {restoreAttemptSnapshot}=await import('@/lib/investigation-sync');
 if(!data?.attempt||!data?.clocks)throw new Error('Invalid investigation notebook');
 return restoreAttemptSnapshot(data);
}

export async function syncJourney(userId:string,journeyId:'catalyst',value:import('@/lib/catalyst-sync').JourneySnapshot){
 const data=await callSync('sync_journey_progress',{p_journey:journeyId,p_state:value.state,p_clocks:value.clocks,p_user:userId});
 const {restoreJourneySnapshot}=await import('@/lib/catalyst-sync');
 if(data?.state?.version!==1||!data?.clocks)throw new Error('Invalid journey progress');
 return restoreJourneySnapshot(data);
}

/** Sends "known" flags with their times and this device's own answer counts; returns the merged flags. */
export async function syncElementMemory(userId:string,device:string,known:import('@/lib/element-sync').KnownSnapshot,attempts:import('@/lib/periodic-learning').ElementMemory['attempts']){
 const data=await callSync('sync_element_memory',{p_known:known.known,p_clocks:known.clocks,p_device:device,p_attempts:attempts,p_user:userId});
 const {restoreKnownSnapshot}=await import('@/lib/element-sync');
 if(!data?.known||!data?.clocks)throw new Error('Invalid element memory');
 return restoreKnownSnapshot(data);
}
