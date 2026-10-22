/** Educational ball-and-stick geometry (Å-like units), separate from material state.
 * Ionic solids are lattice/formula-unit diagrams, never described as isolated molecules.
 * H2O2: NIST CCCBDB experimental geometry, HOO 94.8°, HOOH 119.8°:
 * https://cccbdb.nist.gov/expgeom2x.asp?casno=7722841
 */
import { AQ, SOLIDS, HYDROXIDES, SALTS } from './species';
export type Point3 = [
    number,
    number,
    number
];
export interface ModelAtom {
    element: string;
    at: Point3;
    charge?: string;
}
export interface ModelBond {
    from: number;
    to: number;
    order: number;
}
export interface MoleculeGeometry {
    atoms: ModelAtom[];
    bonds: ModelBond[];
    note?: string;
}
export const ELEMENTS: Record<string, {
    name: string;
    color: string;
    radius: number;
}> = {
    H: { name: 'Устөрөгч', color: '#ffffff', radius: .22 },
    O: { name: 'Хүчилтөрөгч', color: '#ef3038', radius: .32 },
    C: { name: 'Нүүрстөрөгч', color: '#454b56', radius: .33 },
    N: { name: 'Азот', color: '#375eff', radius: .32 },
    S: { name: 'Хүхэр', color: '#eed23d', radius: .39 },
    P: { name: 'Фосфор', color: '#ff9b39', radius: .39 },
    Na: { name: 'Натри', color: '#ad7bff', radius: .43 },
    K: { name: 'Кали', color: '#9c4dd5', radius: .47 },
    Cl: { name: 'Хлор', color: '#45c956', radius: .43 },
    I: { name: 'Иод', color: '#9236b0', radius: .46 },
    Fe: { name: 'Төмөр', color: '#da7b33', radius: .43 },
    Cu: { name: 'Зэс', color: '#c48555', radius: .43 },
    Ag: { name: 'Мөнгө', color: '#bbc2cf', radius: .43 },
    Zn: { name: 'Цайр', color: '#909caf', radius: .43 },
    Mg: { name: 'Магни', color: '#8de24a', radius: .43 },
    Ca: { name: 'Кальци', color: '#50bc65', radius: .43 },
    Ba: { name: 'Бари', color: '#54c736', radius: .46 },
    Li: { name: 'Лити', color: '#cd70e0', radius: .40 },
    Mn: { name: 'Манган', color: '#bb77be', radius: .43 },
    Pb: { name: 'Хар тугалга', color: '#7787ac', radius: .45 },
};
const a = (element: string, at: Point3, charge?: string): ModelAtom => ({ element, at, charge });
const b = (from: number, to: number, order = 1): ModelBond => ({ from, to, order });
const rad = (deg: number) => deg * Math.PI / 180;
const bent = rad(104.5 / 2);
const water: MoleculeGeometry = { atoms: [a('O', [0, 0, 0]), a('H', [Math.sin(bent) * .958, Math.cos(bent) * .958, 0]), a('H', [-Math.sin(bent) * .958, Math.cos(bent) * .958, 0])], bonds: [b(0, 1), b(0, 2)], note: 'H–O–H = 104.5°' };
const hoo = rad(94.8), torsion = rad(119.8);
const peroxide: MoleculeGeometry = { atoms: [a('O', [-.7375, 0, 0]), a('O', [.7375, 0, 0]), a('H', [-.7375 + .95 * Math.cos(hoo), .95 * Math.sin(hoo), 0]), a('H', [.7375 - .95 * Math.cos(hoo), .95 * Math.sin(hoo) * Math.cos(torsion), .95 * Math.sin(hoo) * Math.sin(torsion)])], bonds: [b(0, 1), b(0, 2), b(1, 3)], note: 'Хавтгай бус H–O–O–H · HOO 94.8°, мушгиралт 119.8° (NIST)' };
function radial(center: string, outer: string, n: number, tetra = false): MoleculeGeometry {
    const directions: Point3[] = tetra ? [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] : Array.from({ length: n }, (_, i) => [Math.cos(i * 2 * Math.PI / n), Math.sin(i * 2 * Math.PI / n), 0]);
    return { atoms: [a(center, [0, 0, 0]), ...directions.slice(0, n).map((p) => a(outer, p.map((v) => v * (tetra ? .72 : 1.2)) as Point3))], bonds: Array.from({ length: n }, (_, i) => b(0, i + 1)), note: 'Холбооны урт, цэнэгийн тархалтыг хялбаршуулсан загвар' };
}
const lattice = (cation: string, anion: string, charge = '+'): MoleculeGeometry => ({ atoms: Array.from({ length: 8 }, (_, i) => a(((i % 2 + Math.floor(i / 2) % 2 + Math.floor(i / 4)) % 2) ? anion : cation, [(i % 2 - .5) * 1.1, (Math.floor(i / 2) % 2 - .5) * 1.1, (Math.floor(i / 4) - .5) * 1.1], ((i % 2 + Math.floor(i / 2) % 2 + Math.floor(i / 4)) % 2) ? '-' : charge)), bonds: [], note: 'Ионы талст торны хэсэг · молекул биш' });
export const MOLECULES_3D: Record<string, MoleculeGeometry> = {
    H2O: water, steam: water, H2O2: peroxide,
    O2: { atoms: [a('O', [-.6, 0, 0]), a('O', [.6, 0, 0])], bonds: [b(0, 1, 2)] },
    H2: { atoms: [a('H', [-.37, 0, 0]), a('H', [.37, 0, 0])], bonds: [b(0, 1)] },
    CO2: { atoms: [a('C', [0, 0, 0]), a('O', [-1.16, 0, 0]), a('O', [1.16, 0, 0])], bonds: [b(0, 1, 2), b(0, 2, 2)] },
    OH: { atoms: [a('O', [0, 0, 0], '-'), a('H', [.96, 0, 0])], bonds: [b(0, 1)] },
    IO: { atoms: [a('I', [-.65, 0, 0]), a('O', [.65, 0, 0], '-')], bonds: [b(0, 1)], note: 'Катализаторын түр завсрын ион IO⁻' },
    CO3: { ...radial('C', 'O', 3), note: 'Хавтгай гурвалжин CO₃²⁻ · резонанс холбоо' },
    NO3: { ...radial('N', 'O', 3), note: 'Хавтгай гурвалжин NO₃⁻ · резонанс холбоо' },
    SO4: radial('S', 'O', 4, true), MnO4: radial('Mn', 'O', 4, true), NH4: radial('N', 'H', 4, true),
    NH3: { atoms: [a('N', [0, .2, 0]), a('H', [.94, -.15, 0]), a('H', [-.47, -.15, .814]), a('H', [-.47, -.15, -.814])], bonds: [b(0, 1), b(0, 2), b(0, 3)], note: 'Гурвалжин пирамид' },
    I2: { atoms: [a('I', [-1.33, 0, 0]), a('I', [1.33, 0, 0])], bonds: [b(0, 1)] },
    SCN: { atoms: [a('S', [-1.5, 0, 0]), a('C', [0, 0, 0]), a('N', [1.16, 0, 0], '-')], bonds: [b(0, 1), b(1, 2, 3)] },
    'solid-NaCl': lattice('Na', 'Cl'), 'solid-AgCl': lattice('Ag', 'Cl'), 'solid-AgI': lattice('Ag', 'I'),
    KI: { atoms: [a('K', [-.85, 0, 0], '+'), a('I', [.85, 0, 0], '-')], bonds: [], note: 'KI усанд K⁺ ба I⁻ болж задарна; ковалент холбоо байхгүй.' },
};
MOLECULES_3D.HCO3 = { ...MOLECULES_3D.CO3, atoms: [...MOLECULES_3D.CO3.atoms, a('H', [2.1, .35, 0])], bonds: [...MOLECULES_3D.CO3.bonds, b(1, 4)] };
const acetate: MoleculeGeometry = { atoms: [a('C', [-.7, 0, 0]), a('C', [.8, 0, 0]), a('O', [1.4, 1, 0]), a('O', [1.5, -1, 0], '-'), a('H', [-1.1, 1, 0]), a('H', [-1.1, -.5, .86]), a('H', [-1.1, -.5, -.86])], bonds: [b(0, 1), b(1, 2, 2), b(1, 3), b(0, 4), b(0, 5), b(0, 6)] };
MOLECULES_3D['Ac-'] = acetate;
MOLECULES_3D.Ac = acetate;
MOLECULES_3D.HAc = { atoms: [...acetate.atoms.map((v, i) => i === 3 ? { ...v, charge: undefined } : v), a('H', [2.4, -1.1, 0])], bonds: [...acetate.bonds, b(3, 7)] };
MOLECULES_3D.ethanol = { atoms: [a('C', [-1.2, 0, 0]), a('C', [.3, 0, 0]), a('O', [1, 1.1, 0]), a('H', [1.9, 1.1, 0]), a('H', [-1.7, .9, 0]), a('H', [-1.7, -.45, .78]), a('H', [-1.7, -.45, -.78]), a('H', [.8, -.6, .8]), a('H', [.8, -.6, -.8])], bonds: [b(0, 1), b(1, 2), b(2, 3), b(0, 4), b(0, 5), b(0, 6), b(1, 7), b(1, 8)] };
/** Separate ionic constituents; retain bonds inside each polyatomic ion. */
function formulaUnit(parts: MoleculeGeometry[]): MoleculeGeometry {
  const atoms: ModelAtom[] = [], bonds: ModelBond[] = [];
  parts.forEach((part, i) => {
    const index=atoms.length, angle=i*2*Math.PI/Math.max(1,parts.length);
    const radius=parts.length===1?0:parts.length===2?1.3:2.1;
    atoms.push(...part.atoms.map((v)=>({...v,at:[v.at[0]+Math.cos(angle)*radius,v.at[1]+Math.sin(angle)*radius,v.at[2]] as Point3})));
    bonds.push(...part.bonds.map((v)=>({...v,from:v.from+index,to:v.to+index})));
  });
  return {atoms,bonds,note:'Ионы нэгдлийн томьёоны нэгж · ион хооронд ковалент холбоо байхгүй; талстын нарийн бүтцийг хялбаршуулсан.'};
}
MOLECULES_3D.FeSCN={atoms:[a('Fe',[-2.3,0,0]),a('N',[-.9,0,0]),a('C',[.3,0,0]),a('S',[1.9,0,0])],bonds:[b(0,1),b(1,2,3),b(2,3)],note:'[FeSCN]²⁺ комплексийн нэг лигандтай хялбаршуулсан загвар; бусад усан лиганд харагдахгүй.'};
const ammine: MoleculeGeometry={atoms:[a('Cu',[0,0,0],'2+')],bonds:[],note:'[Cu(NH₃)₄]²⁺ · хавтгай дөрвөлжин дөрвөн N лиганд; тэнхлэгийн усан лиганд харагдахгүй.'};
for(let i=0;i<4;i++){
  const angle=i*Math.PI/2, at=ammine.atoms.length;
  const nx=Math.cos(angle)*2,ny=Math.sin(angle)*2;
  ammine.atoms.push(a('N',[nx,ny,0]));ammine.bonds.push(b(0,at));
  for(let j=0;j<3;j++){
    const h=j*2*Math.PI/3;
    ammine.atoms.push(a('H',[nx+Math.cos(angle)*.4-Math.sin(angle)*Math.cos(h)*.85,ny+Math.sin(angle)*.4+Math.cos(angle)*Math.cos(h)*.85,Math.sin(h)*.85]));
    ammine.bonds.push(b(at,ammine.atoms.length-1));
  }
}
MOLECULES_3D.CuNH3=ammine;
/** Resolve all preset ids, including ionic formula units and honest symbolic fallbacks. */
export function moleculeGeometry(id: string, formula = id): MoleculeGeometry {
  const known=MOLECULES_3D[id];if(known)return known;
  const key=id.replace(/^(solid-|metal-)/,''),def=AQ[key as keyof typeof AQ];
  const element=key.replace(/[23]$/,'');
  if(ELEMENTS[element])return {atoms:[a(element,[0,0,0],id.startsWith('metal-')||id.startsWith('solid-')?undefined:def?.charge?`${Math.abs(def.charge)>1?Math.abs(def.charge):''}${def.charge>0?'+':'-'}`:id==='H'?'+':undefined)],bonds:[]};
  if(id.startsWith('solid-')){
    const hydroxide=HYDROXIDES.find((v)=>v.solid===key);
    if(hydroxide)return formulaUnit([moleculeGeometry(hydroxide.ion),...Array.from({length:hydroxide.n},()=>MOLECULES_3D.OH)]);
    const salt=SALTS.find((v)=>v.solid===key);
    if(salt)return formulaUnit([...Array.from({length:salt.a},()=>moleculeGeometry(salt.cation)),...Array.from({length:salt.b},()=>moleculeGeometry(salt.anion))]);
    if(key==='CuO'||key==='MnO2')return formulaUnit([{atoms:[a(key==='CuO'?'Cu':'Mn',[0,0,0],key==='CuO'?'2+':'4+')],bonds:[]},...Array.from({length:key==='CuO'?1:2},()=>({atoms:[a('O',[0,0,0],'2-')],bonds:[]}))]);
    const solid=SOLIDS[key as keyof typeof SOLIDS];
    if(solid?.dissolve){
      const parts:MoleculeGeometry[]=[];
      for(const [species,n] of Object.entries(solid.dissolve.products))for(let i=0;i<n;i++)parts.push(moleculeGeometry(key==='NH4NO3'&&species==='NH3'?'NH4':key==='NaHCO3'&&species==='CO3'?'HCO3':species));
      if(key==='NaOH')parts.push(MOLECULES_3D.OH);
      for(let i=0;i<(solid.dissolve.water??0);i++)parts.push(water);
      return formulaUnit(parts);
    }
  }
  const symbol=/^[A-Za-z][A-Za-z0-9+-]*$/.test(formula)?formula:key;
  return {atoms:[a(symbol,[0,0,0])],bonds:[],note:'Бүтэц тодорхойлоогүй бодисын тэмдэгт бөмбөлөг; бодит молекулын геометр биш.'};
}
