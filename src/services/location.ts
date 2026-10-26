import { supabase } from '@/lib/supabase';
import type { LocationDraft, LocationOptions, LocationProfile, RegionType } from '@/data/location';
let optionsCache: LocationOptions | null = null;
export async function fetchLocationOptions(): Promise<LocationOptions> {
  if (optionsCache) return optionsCache;
  const [a,s,h] = await Promise.all([
    supabase.from('aimags').select('id,name').order('name'),
    supabase.from('soums').select('id,aimag_id,name').order('name'),
    supabase.from('schools').select('id,name,region_type,aimag_id,soum_id,is_sample').order('name'),
  ]);
  if (a.error || s.error || h.error) throw new Error('Байршлын жагсаалтыг ачаалж чадсангүй. Дахин оролдоно уу.');
  optionsCache={aimags:a.data,soums:s.data,schools:h.data as LocationOptions['schools']};return optionsCache;
}
export async function fetchLocationProfile(userId:string):Promise<LocationProfile|null>{
 const {data,error}=await supabase.from('student_profiles').select('region_type,aimag_id,soum_id,school_id,school_other').eq('user_id',userId).maybeSingle();
 if(error) throw new Error('Байршлын мэдээллийг ачаалж чадсангүй.');return data as LocationProfile|null;
}
export async function saveLocationProfile(userId:string,draft:LocationDraft):Promise<LocationProfile>{
 const {data,error}=await supabase.from('student_profiles').upsert({user_id:userId,...draft,school_other:draft.school_other?.trim()||null},{onConflict:'user_id'}).select('region_type,aimag_id,soum_id,school_id,school_other').single();
 if(error) throw new Error('Мэдээллийг хадгалж чадсангүй. Оруулсан утгуудаа шалгана уу.');return data as LocationProfile;
}
export async function getProfileLocationLabel(profile:LocationProfile|null):Promise<string>{
 if(!profile)return 'Байршил, сургууль тохируулаагүй';
 try{const o=await fetchLocationOptions();const school=o.schools.find(x=>x.id===profile.school_id)?.name??profile.school_other??'';const aimag=o.aimags.find(x=>x.id===profile.aimag_id)?.name;const soum=o.soums.find(x=>x.id===profile.soum_id)?.name;return [profile.region_type==='ulaanbaatar'?'Улаанбаатар хот':aimag,soum,school].filter(Boolean).join(' · ')}catch{return 'Байршил, сургууль тохируулаагүй'}
}
export function regionLabel(region:RegionType){return region==='ulaanbaatar'?'Улаанбаатар хот':'Орон нутаг'}
