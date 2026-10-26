export type RegionType = 'ulaanbaatar' | 'rural';
export interface Aimag { id: string; name: string }
export interface Soum { id: string; aimag_id: string; name: string }
export interface School { id: string; name: string; region_type: RegionType; aimag_id: string | null; soum_id: string | null; is_sample: boolean }
export interface LocationProfile { region_type: RegionType; aimag_id: string | null; soum_id: string | null; school_id: string | null; school_other: string | null }
export interface LocationOptions { aimags: Aimag[]; soums: Soum[]; schools: School[] }
export interface LocationDraft extends LocationProfile { school_other: string | null }
export function dependentSoums(soums: Soum[], aimagId: string | null) { return aimagId ? soums.filter((s) => s.aimag_id === aimagId) : []; }
export function dependentSchools(schools: School[], region: RegionType, aimagId: string | null, soumId: string | null) {
  if (region === 'ulaanbaatar') return schools.filter((s) => s.region_type === region);
  if (!aimagId || !soumId) return [];
  return schools.filter((s) => s.region_type === region && s.aimag_id === aimagId && s.soum_id === soumId);
}
export function validateLocation(draft: LocationDraft) {
  if (!draft.region_type) return 'Байршлын төрлөө сонгоно уу.';
  if (draft.region_type === 'rural' && !draft.aimag_id) return 'Аймгаа сонгоно уу.';
  if (draft.region_type === 'rural' && !draft.soum_id) return 'Сумаа сонгоно уу.';
  if (!draft.school_id && !draft.school_other?.trim()) return 'Сургуулиа сонгоно уу эсвэл нэрийг бичнэ үү.';
  return null;
}
