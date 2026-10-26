/** Reject malformed database content before replacing working bundled lessons. */
export function matchesContentShape(value: unknown, example: unknown, depth=0): boolean {
  if(depth>24)return false;
  if(example===null)return value===null||typeof value==='string';
  if(Array.isArray(example))return Array.isArray(value)&&value.length<=3000&&value.every(item=>example.length===0||example.some(pattern=>matchesContentShape(item,pattern,depth+1)));
  if(typeof example==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))return false;
    const row=value as Record<string,unknown>,pattern=example as Record<string,unknown>;
    if(typeof pattern.t==='string'&&row.t!==pattern.t)return false;
    return Object.entries(pattern).every(([key,item])=>key in row&&matchesContentShape(row[key],item,depth+1));
  }
  return typeof value===typeof example&&(typeof value!=='number'||Number.isFinite(value));
}
