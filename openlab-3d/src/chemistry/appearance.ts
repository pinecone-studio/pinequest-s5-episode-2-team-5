import {AQ,HYDROXIDES,SALTS,SOLIDS,type AqId,type SolidId} from './species';
import {grade8Chemistry} from './grade8';
import {liquidMl,type Mixture} from './mixture';
/** Observable phases only. No reaction, matter creation or completion is performed here. */
const IMMISCIBLE:AqId[]=['oilFluid','cyclohexane','hexane','octane','decane','hexadecane','waxLiquid'];
const PRECIPITATES:SolidId[]=['CuOH2','FeOH3','FeOH2','AgCl','BaSO4','CaCO3','AlOH3','NiOH2'];
// Grade 8: every solid the equilibrium model can precipitate from solution (Ksp tables).
const GRADE8_PRECIPITATES:SolidId[]=[...new Set<SolidId>([...HYDROXIDES.map(h=>h.solid),...SALTS.map(s=>s.solid)])];
export function appearanceOf(m:Mixture){
 const organicMl=IMMISCIBLE.reduce((sum,id)=>{const d=AQ[id];return sum+(m.aq[id]??0)*d.molarMass/(d.density??1);},0);
 const total=liquidMl(m),aqueousMl=Math.max(0,total-organicMl);
 let precipitateGrams=0,precipitate:SolidId|undefined;
 for(const id of grade8Chemistry.active?GRADE8_PRECIPITATES:PRECIPITATES){const grams=(m.s[id]??0)*(SOLIDS[id]?.molarMass??0);precipitateGrams+=grams;if(grams>1e-8&&(!precipitate||grams>(m.s[precipitate]??0)*SOLIDS[precipitate].molarMass))precipitate=id;}
 const colored=Object.entries(m.aq).some(([id,n])=>(n??0)>1e-10&&!!AQ[id as AqId].color);
 const visiblePrecipitate=precipitateGrams>.0005&&(m.cloud>.05||precipitateGrams>.002);
 return {visiblePrecipitate,colored,organicMl,aqueousMl,layered:organicMl>.001&&aqueousMl>.001,organicColor:(m.aq.oilFluid??0)>0?'#e8cf83':'#eff2e9',precipitateGrams,precipitateColor:precipitate?SOLIDS[precipitate].color:null,suspension:precipitateGrams>1e-8?Math.max(0,Math.min(1,m.cloud)):0};
}
