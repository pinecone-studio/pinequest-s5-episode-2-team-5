import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncInvestigation } from '@/services/learning';
import { changedAttempt, mergeAttempt, restoreAttemptSnapshot, type AttemptSnapshot } from './investigation-sync';
import { investigationById, restoreAttempt, type InvestigationAttempt } from './textbook-investigations';
const existing=new Set(['atom-builder','element-cards','nacl','metals','elephant','safety','boil','indicators','titration','precipitates','gases','flame','crystals','cuso4','color-tests','thermo','fire']);
export const validInvestigationId=(id:string)=>!!investigationById(id)||existing.has(id);
/** Typing reaches Supabase as one sync after a short pause. */
const SYNC_DELAY_MS=1500;
/** Opening a notebook waits this long for Supabase; a slower answer is stored for next time. */
const LOAD_WAIT_MS=2500;
const queues=new Map<string,Promise<unknown>>(),timers=new Map<string,ReturnType<typeof setTimeout>>();
const keyFor=(user:string,id:string)=>`chemquest.investigation.v1.${user}.${id}`;
/** Runs after earlier reads and writes of the same notebook. */
function queued<T>(key:string,task:()=>Promise<T>):Promise<T>{
  const run=(queues.get(key)??Promise.resolve()).catch(()=>undefined).then(task);
  queues.set(key,run);void run.finally(()=>{if(queues.get(key)===run)queues.delete(key);}).catch(()=>undefined);
  return run;
}
async function readLocal(key:string):Promise<AttemptSnapshot>{
  const [attempt,clocks]=await Promise.all([AsyncStorage.getItem(key),AsyncStorage.getItem(`${key}.clocks`)]);
  return restoreAttemptSnapshot({attempt:attempt?JSON.parse(attempt):null,clocks:clocks?JSON.parse(clocks):{}});
}
const writeLocal=(key:string,value:AttemptSnapshot)=>AsyncStorage.multiSet([[key,JSON.stringify(value.attempt)],[`${key}.clocks`,JSON.stringify(value.clocks)]]);
/** Sends this device's notebook and stores Supabase's merge: the newest answers and every trial. */
async function syncNotebook(user:string,id:string):Promise<InvestigationAttempt>{
  const key=keyFor(user,id),remote=await syncInvestigation(user,id,await queued(key,()=>readLocal(key)));
  return queued(key,async()=>{const merged=mergeAttempt(await readLocal(key),remote);await writeLocal(key,merged);return merged.attempt;});
}
export async function loadInvestigation(user:string,id:string):Promise<InvestigationAttempt>{
  const key=keyFor(user,id),local=(await queued(key,()=>readLocal(key))).attempt;
  if(!validInvestigationId(id))return local;
  const cloud=syncNotebook(user,id);
  return Promise.race([cloud,new Promise<InvestigationAttempt>((resolve)=>setTimeout(()=>resolve(local),LOAD_WAIT_MS))]).catch(()=>local);
}
export function saveInvestigation(user:string,id:string,raw:unknown):Promise<void>{
  if(!validInvestigationId(id))return Promise.reject(new Error('Unknown investigation'));
  const key=keyFor(user,id),attempt=restoreAttempt(raw);
  // A damaged stored copy is replaced rather than blocking every later save.
  const task=queued(key,async()=>writeLocal(key,changedAttempt(await readLocal(key).catch(()=>restoreAttemptSnapshot(null)),attempt)));
  clearTimeout(timers.get(key));
  timers.set(key,setTimeout(()=>{timers.delete(key);void syncNotebook(user,id).catch(()=>undefined);},SYNC_DELAY_MS));
  return task;
}
