import AsyncStorage from '@react-native-async-storage/async-storage';
import { investigationById, newAttempt, restoreAttempt, type InvestigationAttempt } from './textbook-investigations';
const existing=new Set(['atom-builder','element-cards','nacl','metals','elephant','safety','boil','indicators','titration','precipitates','gases','flame','crystals','cuso4','color-tests','thermo','fire']);
export const validInvestigationId=(id:string)=>!!investigationById(id)||existing.has(id);
const queues=new Map<string,Promise<void>>();
const keyFor=(user:string,id:string)=>`chemquest.investigation.v1.${user}.${id}`;
export async function loadInvestigation(user:string,id:string):Promise<InvestigationAttempt>{
  const key=keyFor(user,id);await queues.get(key)?.catch(()=>undefined);
  const raw=await AsyncStorage.getItem(key);return raw?restoreAttempt(JSON.parse(raw)):newAttempt();
}
export function saveInvestigation(user:string,id:string,raw:unknown):Promise<void>{
  if(!validInvestigationId(id))return Promise.reject(new Error('Unknown investigation'));
  const key=keyFor(user,id),attempt=restoreAttempt(raw);
  const task=(queues.get(key)??Promise.resolve()).catch(()=>undefined).then(()=>AsyncStorage.setItem(key,JSON.stringify(attempt)));
  queues.set(key,task);void task.finally(()=>{if(queues.get(key)===task)queues.delete(key);}).catch(()=>undefined);
  return task;
}
