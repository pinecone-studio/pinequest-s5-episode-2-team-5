import { AQ, SOLIDS, type AqId, type SolidId } from '../../chemistry/species';
import { emptyMixture, merge, liquidMl, solidMassG, contentMassG, gasMl, takeSolid, type Mixture } from '../../chemistry/mixture';
import { acidityToNeutral, equilibrate, phOf } from '../../chemistry/equilibrium';
import { step, DEFAULT_ENV } from '../../chemistry/kinetics';
import type { RigState } from '../grade9/process';
import { isCurriculumRig } from './kinds';
import { aq,sol,gaseous,putA,putS,putG,reactCurriculum,MATERIAL_PROPERTIES } from './reactions';
import { GASES, type GasId } from './materials';
const EPS=1e-12;
const has=(m:Mixture)=>liquidMl(m)>EPS||solidMassG(m)>EPS||gasMl(m)>EPS;
const mixedKinds=['magneticReactor','combustionFurnace','opticalBench','equilibriumCell','pressureCell','refluxReactor','gasWashTrain'];
function mixInlets(r:RigState){r.chambers[0]=merge(r.chambers[0],r.chambers[1]);r.chambers[1]=emptyMixture();r.connected=true;}
function reaction(r:RigState,equation:string,dn:number){if(dn>EPS){r.equation=equation;r.extent+=dn;r.data.reactionRate=dn/Math.max(.001,r.data.dt??1);}}
export function startCurriculum(r:RigState):RigState {
 if(!r.chambers.some(has))return {...r,running:false,message:'Эхлээд шаардлагатай дээж, шингэн эсвэл хийг хэмжиж багажид хий. Хоосон багаж бүтээгдэхүүн үүсгэхгүй.'};
 if(r.kind==='electrolysisCell'){
  // A solid charge of PbBr₂ is the electrolyte once the cell melts it.
  if((liquidMl(r.chambers[0])<1&&!(sol(r.chambers[0],'PbBr2')>0))||!Object.keys(r.chambers[1].s).length||!Object.keys(r.chambers[2].s).length)return {...r,running:false,message:'① Электролит, ② катодын металл/графит, ③ анодын металл/графитыг тус тус хий. Дараа нь DC хэлхээг залга.'};
 }
 if(r.kind==='galvanicCell'&&(!(sol(r.chambers[0],'Zn')>0)||!(sol(r.chambers[1],'Cu')>0)||aq(r.chambers[0],'Zn')<=0||aq(r.chambers[1],'Cu')<=0||liquidMl(r.chambers[2])<1))return {...r,running:false,message:'Zn/ZnSO₄, Cu/CuSO₄ хагас хэлхээ болон NaCl давсан гүүрийг тусдаа тасалгаанд бэлтгэ.'};
 if(r.kind==='migrationTube'&&(aq(r.chambers[0],'Cu')<=0||aq(r.chambers[0],'CrO4')<=0))return {...r,running:false,message:'U хоолойд CuCrO₄-ийн өнгөт уусмал хий. Хүчдэлгүй үед чиглэсэн шилжилт явагдахгүй.'};
 if(r.kind==='fallingBallViscometer'&&(liquidMl(r.chambers[0])<=0||sol(r.chambers[0],'glassBead')<=0))return {...r,running:false,message:'Эхлээд цилиндрт шинжлэх шингэн, дараа нь ижил хэмжээтэй шилэн бөмбөлөг хий.'};
 if(r.kind==='interfacialBath'&&(aq(r.chambers[0],'diamine')<=0||aq(r.chambers[1],'sebacoyl')<=0))return {...r,running:false,message:'① Усан гексаметилендиамин, ② циклогексан дахь себакоилхлоридыг тус тус нэм. Хоёр фазын зааг хэрэгтэй.'};
 if(mixedKinds.includes(r.kind))mixInlets(r);
 if(r.kind==='electrolysisCell')r.connected=true;
 r.running=true;r.data.started=1;r.data.initialVolume??=liquidMl(r.chambers[0]);r.initialMass=r.chambers.reduce((s,m)=>s+contentMassG(m),0);
 r.message='Багаж ажиллаж байна. Нэмсэн бодис, цахилгаан/дулаан, хугацаа ба хэмжилтээс үр дүн хамаарна.';
 return r;
}
function soilMass(m:Mixture){return (sol(m,'sand')*60.08)+sol(m,'silt')+sol(m,'clay')+sol(m,'humus');}
/** Metals below hydrogen plate out of solution; above it, water or acid gives H₂ instead. */
const PLATING=[['Ni',2],['Cu',2],['Ag',1],['Pb',2]] as const;
/** At an inert anode a halide is oxidised before water. */
const HALIDES=[['Cl','Cl2','2Cl⁻ → Cl₂ + 2e⁻'],['Br','Br2','2Br⁻ → Br₂ + 2e⁻'],['I','I2','2I⁻ → I₂ + 2e⁻']] as const;
function plate(r:RigState,dt:number){
 const [e,cathode,anode]=r.chambers;
 // Lead(II) bromide conducts once molten (373 °C): Pb at the cathode, Br₂ at the anode.
 const melt=e.temp>=373&&sol(e,'PbBr2')>EPS;
 const plated=melt?null:PLATING.find(([id])=>aq(e,id)>0)??null;
 // Pure water or sugar solution has no ions to carry the current.
 const ionic=e.water>EPS&&(Object.entries(e.aq) as [AqId,number][]).some(([id,n])=>AQ[id].charge!==0&&n>1e-7)||acidityToNeutral(e)>EPS;
 if((!melt&&!plated&&!ionic)||r.current<=0||r.voltage<=0||!r.connected){r.message='Ион агуулсан электролит (уусмал эсвэл хайлмал) эсвэл гүйдэл байхгүй. Электролиз явагдахгүй.';return;}
 const electrons=r.current*dt/96485.33212;
 if(melt){
  const dn=Math.min(electrons/2,sol(e,'PbBr2'));if(dn<=0)return;
  putS(e,'PbBr2',-dn);putS(cathode,'Pb',dn);putA(anode,'Br2',dn);
  r.data.deposited=(r.data.deposited??0)+dn;r.data.halogen=(r.data.halogen??0)+dn;r.data.charge=(r.data.charge??0)+2*dn*96485.33212;
  reaction(r,'Pb²⁺ + 2e⁻ → Pb; 2Br⁻ → Br₂ + 2e⁻',dn);
  r.message='Хайлмал PbBr₂: катодод хар тугалга, анодод хүрэн бром ялгарна.';return;
 }
 if(plated){
  const [metal,z]=plated,halide=HALIDES.find(([x])=>aq(e,x)>0);
  let dn=Math.min(electrons/z,aq(e,metal));
  const soluble=sol(anode,metal)>EPS;
  if(soluble)dn=Math.min(electrons/z,sol(anode,metal));
  if(dn<=0)return;
  putS(cathode,metal,dn);
  // Soluble anodes replenish exactly the ions consumed at the cathode.
  let anodeText:string=`${metal} → ${metal}${z===2?'²⁺':'⁺'} + ${z}e⁻`;
  if(soluble)putS(anode,metal,-dn);
  else if(halide){const [x,x2,text]=halide,n=Math.min(z*dn/2,aq(e,x)/2);putA(e,metal,-dn);putA(e,x,-2*n);putA(e,x2,n);r.data.halogen=(r.data.halogen??0)+n;anodeText=text;}
  else {putA(e,metal,-dn);e.water=Math.max(0,e.water-z*dn/2*18.015);putG(anode,'O2',z*dn/4);anodeText='2H₂O → O₂ + 4H⁺ + 4e⁻';}
  r.data.deposited=(r.data.deposited??0)+dn;r.data.charge=(r.data.charge??0)+z*dn*96485.33212;
  reaction(r,`${metal}${z===2?'²⁺':'⁺'} + ${z}e⁻ → ${metal}; ${anodeText}`,dn);
  r.message='100% металлын гүйдлийн гарцын сургалтын хэлхээ. Ионы нөөц, гүйдэл ба анодын материал хэмжилтэд нөлөөлнө.';return;
 }
 // No plating metal: hydrogen at the cathode (from acid, or water leaving OH⁻ behind).
 const acidic=acidityToNeutral(e)>EPS,halide=HALIDES.find(([x])=>aq(e,x)>0);
 const h2=electrons/2;
 putG(cathode,'H2',h2);if(!acidic)e.water=Math.max(0,e.water-electrons*18.015);
 let anodeText='2H₂O → O₂ + 4H⁺ + 4e⁻';
 if(halide){const [x,x2,text]=halide,n=Math.min(h2,aq(e,x)/2);putA(e,x,-2*n);putA(e,x2,n);r.data.halogen=(r.data.halogen??0)+n;anodeText=text;if(n<h2){putG(anode,'O2',(h2-n)/2);e.water=Math.max(0,e.water-(h2-n)*18.015);}}
 else {putG(anode,'O2',h2/2);e.water=Math.max(0,e.water-h2*18.015);}
 r.data.hydrogen=(r.data.hydrogen??0)+h2;r.data.charge=(r.data.charge??0)+electrons*96485.33212;
 reaction(r,`${acidic?'2H⁺ + 2e⁻ → H₂':'2H₂O + 2e⁻ → H₂ + 2OH⁻'}; ${anodeText}`,h2);
 r.message=halide?'Катодод устөрөгч, анодод галоген ялгарна. Хлор лакмусын цаасыг цайруулна.':'Катодод устөрөгч, анодод хүчилтөрөгч ялгарна.';
}
function gasEquilibrium(r:RigState,dt:number){
 const m=r.chambers[0],v=r.volumeMl/1000,t=r.temperature+273.15;
 if(!(v>0&&t>0))return;
 if(gaseous(m,'NO2')+gaseous(m,'N2O4')>0){
  const total=gaseous(m,'N2O4')+gaseous(m,'NO2')/2,k=.010*Math.exp(-57000/8.314*(1/t-1/298.15));
  let lo=0,hi=total;for(let i=0;i<55;i++){const x=(lo+hi)/2;if(4*x*x<k*(total-x)*v)lo=x;else hi=x;}
  const target=(lo+hi)/2,old=gaseous(m,'NO2')/2,x=old+(target-old)*(-Math.expm1(-dt*.1));
  m.g={...m.g,N2O4:Math.max(0,total-x),NO2:2*x};r.data.opticalConcentration=2*x/v;
  reaction(r,'N₂O₄ ⇌ 2NO₂',Math.abs(x-old));
 }else if(gaseous(m,'N2')>0||gaseous(m,'NH3')>0){
  const n=gaseous(m,'N2'),h=gaseous(m,'H2'),a=gaseous(m,'NH3'),factor=.0831446*t/v,k=1e-4*Math.exp(92400/8.314*(1/t-1/700));
  let lo=-a/2,hi=Math.min(n,h/3);for(let i=0;i<65;i++){const x=(lo+hi)/2;const q=(a+2*x)**2/Math.max(1e-30,(n-x)*(h-3*x)**3*factor**2);if(q<k)lo=x;else hi=x;}
  const catalyst=sol(m,'Fe')>0?1:.02,dn=(lo+hi)/2*(-Math.expm1(-.03*catalyst*dt));
  putG(m,'N2',-dn);putG(m,'H2',-3*dn);putG(m,'NH3',2*dn);reaction(r,'N₂ + 3H₂ ⇌ 2NH₃',Math.abs(dn));
 }
 r.pressure=Object.values(m.g??{}).reduce<number>((sum,n)=>sum+(n??0),0)*.0831446*t/v;
 r.message='Битүү поршент реактор: хийн нөөц, эзлэхүүн ба температурын тэнцвэр. K ба хурд нь сургалтын ойролцоо; үйлдвэрийн бодит гарцын таамаглал биш.';
}
function phases(r:RigState,dt:number){
 for(let i=0;i<2;i++){
  const m=r.chambers[i];if(!has(m))continue;
  const sand=sol(m,'sand')*60.08,benzoic=(sol(m,'benzoic')+aq(m,'benzoic'))*122.123;
  const meltPoint=benzoic?122.4-Math.min(4.4,sand/Math.max(.001,benzoic)*40):60;
  const melt=(solid:SolidId,liquid:AqId,temperature:number)=>{
   if(m.temp>temperature){const dn=sol(m,solid)*(-Math.expm1(-dt*.2));putS(m,solid,-dn);putA(m,liquid,dn);if(dn>EPS)r.equation=`${SOLIDS[solid].formula}(хат) ⇌ ${AQ[liquid].formula}(ш)`;}
   else if(m.temp<temperature-2){const dn=aq(m,liquid)*(-Math.expm1(-dt*.1));putA(m,liquid,-dn);putS(m,solid,dn);}
  };
  melt('wax','waxLiquid',60);melt('benzoic','benzoic',meltPoint);
  if(sol(m,'ice')>0&&m.temp>0){const dn=Math.min(sol(m,'ice'),dt*Math.max(1,m.temp)/100/18.015);putS(m,'ice',-dn);m.water+=dn*18.015;m.temp=0;}
  if(m.water>0){const freezing=-2*1.86*Math.min(aq(m,'Na'),aq(m,'Cl'))/(m.water/1000);if(m.temp<freezing){const g=Math.min(m.water,dt*(freezing-m.temp)*.02);m.water-=g;putS(m,'ice',g/18.015);}}
  r.data[`meltPoint${i}`]=meltPoint;
 }
}
function distil(r:RigState,dt:number){
 const m=r.chambers[0];
 const candidates: {id:AqId|'ethanol'|'water';bp:number;mass:number;density:number}[]=[];
 if(m.ethanol>EPS)candidates.push({id:'ethanol',bp:78.3,mass:46.069,density:.789});
 if(m.water>EPS)candidates.push({id:'water',bp:100,mass:18.015,density:1});
 for(const [id,n] of Object.entries(m.aq) as [AqId,number][])if(n>EPS&&AQ[id].density&&AQ[id].boiling)candidates.push({id,bp:AQ[id].boiling!,mass:AQ[id].molarMass,density:AQ[id].density!});
 candidates.sort((a,b)=>a.bp-b.bp);
 const c=candidates[0];if(!c||!r.heating||m.temp<c.bp)return;
 const ml=Math.min(dt*.15,c.id==='water'?m.water:c.id==='ethanol'?m.ethanol:aq(m,c.id)*c.mass/c.density);
 const receiver=r.kind==='oilColumn'?(c.bp<100?1:c.bp<150?2:c.bp<220?3:4):1;
 const dst=r.chambers[receiver];
 if(c.id==='water'){m.water-=ml;dst.water+=ml;}else if(c.id==='ethanol'){m.ethanol-=ml;dst.ethanol+=ml;}else {putA(m,c.id,-ml*c.density/c.mass);putA(dst,c.id,ml*c.density/c.mass);}
 m.temp=c.bp;dst.temp=22;r.temperature=c.bp;r.data.distilled=(r.data.distilled??0)+ml;r.equation='Ууршилт → хөргөгч → конденсац';
 r.message='Хөргөгч бодит шилжсэн хэсгийг хүлээн авагчид цуглуулна. Энэ нь тусгаарлах сургалтын нэрлэг; бүх фракц цэвэр нэг бодис болохгүй.';
}
function expose(r:RigState,dt:number){
 r.chambers.forEach((m,i)=>{
  const metal=(['Fe','Zn','Cu','Al','Ag'] as const).find(id=>sol(m,id)>EPS);if(!metal||m.water<=0)return;
  const barrier=aq(m,'oilFluid')>EPS||aq(m,'dyeB')>EPS||sol(m,'plastic')>EPS;
  const blocked=(barrier&&!r.scratched)||r.covers[i];
  const rate=({Fe:.000002,Zn:.0000008,Cu:.0000003,Al:.0000001,Ag:.00000002})[metal];
  const salinity=aq(m,'Na')+aq(m,'Cl')>1e-8?1.8:1;
  const oxygen=(aq(m,'dissolvedO2')+gaseous(m,'O2'));
  const external=blocked?0:1;
  const desired=sol(m,metal)*(-Math.expm1(-rate*salinity*dt));
  if(metal==='Fe'){
   const dn=Math.min(desired,external?desired:oxygen/0.75,m.water/18.015/1.5);
   putS(m,'Fe',-dn);putS(m,'FeOH3',dn);m.water-=dn*1.5*18.015;
   const use=Math.min(aq(m,'dissolvedO2'),dn*.75);putA(m,'dissolvedO2',-use);if(!external)putG(m,'O2',-(dn*.75-use));
   r.rust[i]=(r.rust[i]??0)+dn*55.85;r.equation='4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃ (зэвний схем)';
  }else {r.data[`surface${i}`]=Math.min(100,(r.data[`surface${i}`]??0)+desired/Math.max(EPS,sol(m,metal))*100);}
 });
 r.message='Шууд төмрийн зарцуулалт ба зэвний бүтээгдэхүүнийг бүртгэнэ. Бусад металлын гадаргын индекс нь пассивацийн сургалтын ойролцоо, төмрийн зэв биш. Нээлттэй үүр O₂-ийг орчноос авна.';
}
function soil(r:RigState,dt:number){
 const m=r.chambers[r.port===2?0:r.port],mass=soilMass(m),water=m.water;
 if(!(mass>EPS)){r.message='Тунгаалт, шүүлт эсвэл үрийн сорилд хөрсний дээж эхлээд нэм.';return;}
 r.data.soilMass=mass;
 if(r.operation==='filter'){
  const clay=sol(m,'clay')/mass,capacity=mass*(.3+clay*2.4),vol=liquidMl(m);
  const movable=Math.max(0,vol-capacity)*(-Math.expm1(-dt/(8+clay*50)));
  // Transfer only fluids; all soil remains in the fitted filter bed.
  const f=movable/Math.max(EPS,vol),part=emptyMixture(m.temp);part.water=m.water*f;part.ethanol=m.ethanol*f;m.water-=part.water;m.ethanol-=part.ethanol;
  for(const [id,n] of Object.entries(m.aq) as [AqId,number][]){part.aq[id]=n*f;m.aq[id]=n*(1-f);}
  r.chambers[2]=merge(r.chambers[2],part);r.data.filtered=(r.data.filtered??0)+movable;
 }
 const sand=sol(m,'sand')*60.08,clay=sol(m,'clay'),silt=sol(m,'silt');
 [sand,silt,clay].forEach((g,i)=>r.data[`settled${i}`]=g*(-Math.expm1(-r.elapsed/[30,300,1800][i])));
 const seeds=sol(m,'seed')/.2;
 const ph=phOf(m)??7;
 if(seeds>0&&water>0){
  const response=Math.exp(-(((ph-6.5)/2.5)**2))*r.light*Math.max(0,1-Math.abs(m.temp-24)/30);
  r.data.height=(r.data.height??0)+dt/86400*.25*response;
  r.data.germinated=Math.min(Math.floor(seeds),Math.floor(seeds*.9*response*(-Math.expm1(-r.elapsed/86400))));
 }
 r.message='Гурван төрлийн хөрсний бодит нэмсэн хэсгийг хэмжинэ. Туналт ба ургамлын өсөлт нь жишээ кинетик; pH дангаар бохирдолгүйг батлахгүй. Шүүгдэс тусдаа саванд хуримтлагдана.';
}
function biology(r:RigState,dt:number){
 const indices=r.kind==='enzymeRack'?r.chambers.map((_,i)=>i):[0];
 for(const i of indices){
  const m=r.chambers[i];
  if(m.temp>=60){r.inactive[i]=true;const yeast=sol(m,'yeast'),enzyme=sol(m,'amylase');putS(m,'yeast',-yeast);putS(m,'deadYeast',yeast);putS(m,'amylase',-enzyme);putS(m,'inactiveAmylase',enzyme);}
  if(r.kind==='fermenter'){
   if(sol(m,'yeast')<=0||m.water<=0)continue;
   if(aq(m,'sucrose')>0){const dn=Math.min(aq(m,'sucrose'),m.water/18.015)*(-Math.expm1(-dt*.0001));putA(m,'sucrose',-dn);m.water-=dn*18.015;putA(m,'glucose',2*dn);}
   const oxygen=r.closed?0:1,activity=oxygen?.15:1;
   const dn=aq(m,'glucose')*(-Math.expm1(-dt*.00003*activity*Math.exp(-(((m.temp-32)/18)**2))));
   putA(m,'glucose',-dn);m.ethanol+=2*dn*46.069/.789;putG(r.chambers[2],'CO2',2*dn);r.gas+=2*dn*24000;
   reaction(r,'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂',dn);
  }else if(m.water>0&&aq(m,'starch')>0){
   const ph=phOf(m)??7,enzyme=sol(m,'amylase')>0&&m.temp<60&&ph>4&&ph<9;
   const k=ph<3?.0002*2**((m.temp-25)/10):enzyme?.002*Math.exp(-(((m.temp-37)/20)**2)):0;
   const dn=Math.min(aq(m,'starch')*(-Math.expm1(-dt*k)),m.water/18.015*(enzyme?2:1));
   putA(m,'starch',-dn);if(enzyme){putA(m,'maltose',dn/2);m.water-=dn/2*18.015;}else{putA(m,'glucose',dn);m.water-=dn*18.015;}
   reaction(r,enzyme?'2(C₆H₁₀O₅) + H₂O → C₁₂H₂₂O₁₁ (амилаза)':'(C₆H₁₀O₅) + H₂O → C₆H₁₂O₆ (хүчил)',dn);
  }
 }
 if(r.kind==='fermenter'){for(const c of reactCurriculum(r.chambers[2],dt))reaction(r,c.equation,c.extent);r.chambers[2]=equilibrate(r.chambers[2]).m;}
}
function polymer(r:RigState,dt:number){
 const [a,b,p]=r.chambers;
 const dn=Math.min(aq(a,'diamine'),aq(b,'sebacoyl'))*(-Math.expm1(-dt*.08));
 putA(a,'diamine',-dn);putA(b,'sebacoyl',-dn);putS(p,'nylon610',dn);putS(p,'nylonEnds',dn);putA(a,'Cl',dn);
 const bonds=sol(p,'nylonEnds')/2*(-Math.expm1(-dt*.02));putS(p,'nylonEnds',-bonds);putA(a,'Cl',bonds);
 r.data.hcl=(r.data.hcl??0)+dn+bonds;
 reaction(r,'Диамин + себакоилхлорид → полиамидын холбоо + HCl',dn+bonds);
 if(r.operation==='draw'&&sol(p,'nylon610')>EPS){const {taken,rest}=takeSolid(p,Math.min(.02,solidMassG(p)));r.chambers[2]=rest;r.chambers[3]=merge(r.chambers[3],taken);r.operation='observe';}
 r.message='Усан ба органик үеийн заагт найлон-6,10 үүснэ. Төгсгөлийн бүлгүүд ба HCl-ийг тусад нь тоолж масс хадгална. Ороох үйлдэл үүссэн утсыг тусдаа үүрэнд шилжүүлнэ.';
}
function molecular(r:RigState){
 const carbon=sol(r.chambers[0],'modelC'),hydrogen=sol(r.chambers[1],'modelH');
 const graph=Array.from({length:6},()=>[] as number[]);
 for(const [a,b] of r.bonds){graph[a]?.push(b);graph[b]?.push(a);}
 const visited=new Set<number>();const walk=(i:number,parent=-1):string=>{if(visited.has(i))return '!';visited.add(i);return '('+graph[i].filter(j=>j!==parent).map(j=>walk(j,i)).sort().join('')+')';};
 const canonical=(g:number[][])=>g.map((_,root)=>{const seen=new Set<number>();const visit=(i:number,p=-1):string=>{if(seen.has(i))return '!';seen.add(i);return '('+g[i].filter(j=>j!==p).map(j=>visit(j,i)).sort().join('')+')';};return visit(root);}).sort()[0];
 const valid=carbon>=6-1e-9&&hydrogen>=14-1e-9&&r.bonds.length===5&&graph.every(edges=>edges.length<=4);
 walk(0);
 r.data.kitComplete=valid&&visited.size===6?1:0;
 if(r.data.kitComplete){
  const patterns=[[[0,1],[1,2],[2,3],[3,4],[4,5]],[[0,1],[1,2],[2,3],[3,4],[1,5]],[[0,1],[1,2],[2,3],[3,4],[2,5]],[[0,1],[1,2],[2,3],[1,4],[1,5]],[[0,1],[1,2],[2,3],[1,4],[2,5]]];
  const index=patterns.findIndex(edges=>{const g=Array.from({length:6},()=>[] as number[]);for(const [a,b] of edges){g[a].push(b);g[b].push(a);}return canonical(g)===canonical(graph);});
  r.data.isomer=index;r.data.boiling=[68.7,60.3,63.3,49.7,58][index];r.message=['Гексан','2-метилпентан','3-метилпентан','2,2-диметилбутан','2,3-диметилбутан'][index]+' · C₆H₁₄. Буцлах цэг нь лавлах утга, загварын бөмбөлгийг халаасан хэмжилт биш.';
 }else r.message='6 C ба 14 H загварын хэсэг хийж, C зангилааг таван холбоосоор циклгүй холбо. Нэг C дөрвөөс олон холбоо үүсгэхгүй.';
}
function measure(r:RigState){
 const out:RigState['results']=[];
 const add=(label:string,value:number,unit:string)=>{if(Number.isFinite(value))out.push({label,value,unit});};
 const m=['phaseBath','materialsBench','densityBench','multiReactionRack'].includes(r.kind)?r.chambers[r.port]:r.chambers[0];add('Хугацаа',r.elapsed,'с');add('Температур',r.temperature,'°C');
 switch(r.kind){
 case 'balanceBench':case 'volumetricStation':case 'materialsBench':case 'densityBench':{
  add('Дээжийн масс',contentMassG(m),'г');add('Шингэний эзлэхүүн',liquidMl(m),'мл');
  const solid=(Object.keys(m.s) as SolidId[]).find(id=>sol(m,id)>EPS),material=solid?MATERIAL_PROPERTIES[solid]:undefined;
  if(material&&solid){add('Дээжийн хатуу масс',sol(m,solid)*SOLIDS[solid].molarMass,'г');add('Усны түрэлт',sol(m,solid)*SOLIDS[solid].molarMass/material.density,'мл');add('Нягт',material.density,'г/мл');add('Дамжуулах сорил',material.conducts?1:0,'0/1');if(r.operation==='magnet')add('Соронз татах',material.magnetic?1:0,'0/1');}
  const entries=[...Object.entries(m.s),...Object.entries(m.aq)];const first=entries.find(([,n])=>(n??0)>EPS);
  if(first){const n=first[1]??0;add('Сонгосон бодисын тоо хэмжээ',n,'моль');if(r.kind==='volumetricStation'&&liquidMl(m)>0)add('Концентрац',n/(liquidMl(m)/1000),'моль/л');else add('Жижиг хэсгийн тоо',n*6.02214076e23,'ширхэг');}
  if(r.experiment==='g10-plastic-audit'){add('Ангилсан нийт масс',r.chambers.reduce((s,m)=>s+solidMassG(m),0),'г');add('Дахин ашиглах үүрийн масс',solidMassG(r.chambers[2]),'г');}break;
 }
 case 'electrolysisCell':add('Гүйдэл',r.current,'A');add('Дамжуулсан цэнэг',r.data.charge??0,'Кл');add('Катодод ялгарсан металл',r.data.deposited??0,'моль');add('Катодын хатуу масс',solidMassG(r.chambers[1]),'г');add('Анодын хатуу масс',solidMassG(r.chambers[2]),'г');add('Анодын O₂',gaseous(r.chambers[2],'O2')*24000,'мл');add('Катодын H₂',gaseous(r.chambers[1],'H2')*24000,'мл');add('Анодын галоген',r.data.halogen??0,'моль');break;
 case 'galvanicCell':add('Нээлттэй хэлхээний хүчдэл',r.data.cellVoltage??0,'В');add('Ачааллын гүйдэл',r.data.cellCurrent??0,'A');break;
 case 'pressureCell':add('Поршений эзлэхүүн',r.volumeMl,'мл');add('Даралт',r.pressure,'бар');for(const [id,n] of Object.entries(m.g??{}))add(GASES[id as GasId].formula,n??0,'моль');break;
 case 'migrationTube':add('Cu²⁺-ийн шилжилтийн индекс',r.data.migration??0,'0–1');add('Хүчдэл',r.voltage,'В');break;
 case 'diffusionChamber':add('Хийн тархалтын индекс',(r.data.dispersion??0)*100,'% (схем)');add('Шингэний тархалтын индекс',(r.data.liquidDispersion??0)*100,'% (схем)');break;
 case 'multiReactionRack':r.chambers.forEach((_,i)=>add(`Үүр ${i+1}: H₂`,r.data[`hydrogen${i}`]??0,'мл'));break;
 case 'equilibriumCell':add('FeSCN²⁺',aq(m,'FeSCN'),'моль');add('Fe³⁺',aq(m,'Fe3'),'моль');add('SCN⁻',aq(m,'SCN'),'моль');break;
 case 'interfacialBath':add('Найлоны масс',solidMassG(r.chambers[2])+solidMassG(r.chambers[3]),'г');add('Татсан утас',solidMassG(r.chambers[3]),'г');add('HCl үүссэн',r.data.hcl??0,'моль');if(sol(r.chambers[2],'nylonEnds')>EPS)add('Дундаж гинжийн урт',sol(r.chambers[2],'nylon610')/sol(r.chambers[2],'nylonEnds'),'давтагдах нэгж');break;
 case 'fallingBallViscometer':add('Бөмбөлгийн явсан зай',r.data.distance??0,'м');add('Унасан хугацаа',r.data.fallTime??0,'с');add('Re',r.data.reynolds??0,'');break;
 case 'opticalBench':add('Хүхрийн тунадас',sol(m,'S')*32.06,'г');add('Хэрээс харагдах',r.data.crossVisible??1,'0/1');if(r.data.crossTime!==undefined)add('Хэрээс далдрах хугацаа',r.data.crossTime,'с');break;
 case 'exposureRack':r.chambers.forEach((m,i)=>{const iron=sol(m,'Fe')+sol(m,'FeOH3')>EPS;add(`Үүр ${i+1}: ${iron?'зэврэлт':'гадарга'}`,iron?r.rust[i]??0:r.data[`surface${i}`]??0,iron?'г':'% (индекс)');});break;
 case 'enzymeRack':r.chambers.forEach((m,i)=>add(`Үүр ${i+1}: үлдсэн цардуул`,aq(m,'starch'),'моль (нэгж)'));break;
 case 'soilBench':{const sample=r.chambers[r.port];add('Хөрсний масс',soilMass(sample),'г');add('Шүүгдэс',liquidMl(r.chambers[2]),'мл');for(let i=0;i<3;i++)add(['Тунасан элс','Тунасан лаг','Тунасан шавар'][i],r.data[`settled${i}`]??0,'г');add('Өндөр',r.data.height??0,'см (өсөлтийн загвар)');add('Соёолсон үр',r.data.germinated??0,'ш');if(phOf(sample)!==null)add('pH',phOf(sample)!,'');break;}
 case 'oilColumn':r.chambers.slice(1).forEach((m,i)=>add(`Фракц ${i+1}`,liquidMl(m),'мл'));add('Колбоны үлдэгдэл',liquidMl(m),'мл');break;
 case 'molecularKit':add('C загварын хэсэг',sol(r.chambers[0],'modelC'),'ш');add('H загварын хэсэг',sol(r.chambers[1],'modelH'),'ш');add('Холбоос',r.bonds.length,'ш');add('Бүтэц гүйцсэн',r.data.kitComplete??0,'0/1');if(r.data.kitComplete)add('Лавлах буцлах цэг',r.data.boiling??0,'°C');break;
 default:
  add('Шингэн',liquidMl(m),'мл');add('Хатуу бодис',solidMassG(m),'г');add('Хийн нөөц',gasMl(m),'мл');
  if(aq(m,'ethylAcetate')>EPS)add('Этил этаноат',aq(m,'ethylAcetate'),'моль');
  if(sol(m,'FeS')>EPS)add('FeS',sol(m,'FeS')*87.91,'г');
  if(r.kind==='phaseBath'){add('Мөс',sol(m,'ice')*18.015,'г');add('Шингэн парафин',aq(m,'waxLiquid')*352.691,'г');add('Хайлсан бензойны хүчил',aq(m,'benzoic')*122.123,'г');}
  if(r.kind==='refluxBath')add('Цугласан конденсат',liquidMl(r.chambers[1]),'мл');
  if(r.kind==='fermenter'){add('Этанол',m.ethanol,'мл');add('CO₂',gaseous(r.chambers[2],'CO2')*24000,'мл');}
 }
 r.results=out.slice(0,12);
}
export function tickCurriculum(r:RigState,rawDt:number):RigState {
 if(!isCurriculumRig(r.kind)||!r.running||rawDt<=0)return r;
 const dt=Math.min(.5,rawDt)*r.timeScale;r.elapsed+=dt;r.data.dt=dt;r.data.reactionRate=0;
 const isRack=['enzymeRack','multiReactionRack','exposureRack'].includes(r.kind);
 r.chambers.forEach((m,i)=>{
  const target=r.heating||r.cooling?(isRack?r.targets[i]??22:r.targetTemperature):22;
  m.temp+=(target-m.temp)*(-Math.expm1(-Math.min(dt,10)*.08));
 });
 r.temperature=r.chambers[r.port].temp;
 const m=r.chambers[0];
 switch(r.kind){
 case 'balanceBench':case 'volumetricStation':case 'materialsBench':case 'densityBench':
  r.chambers[0]=step(m,Math.min(.3,dt),{...DEFAULT_ENV,lossWK:0}).m;
  if(r.kind==='volumetricStation')r.chambers[0]=step(r.chambers[0],.3,{...DEFAULT_ENV,stir:1,lossWK:0}).m;
  r.message='Тавцангийн бодит агууламжаас масс, эзлэхүүн ба тоо хэмжээг уншина. Нягт/материалын шинж нь ойролцоо лавлах өгөгдөлтэй соригчийн загвар.';break;
 case 'phaseBath':phases(r,dt);r.message='Дээжийн бодит ус, мөс, давс, парафин эсвэл бензойны хүчил температурт хариу өөрчлөгдөнө. Бохирдол хайлах мужид нөлөөлнө.';break;
 case 'refluxBath':case 'oilColumn':distil(r,dt);break;
 case 'separatingColumn':{
  const syrup=aq(m,'sucrose');r.data.mixing=(r.data.mixing??0)+(1-(r.data.mixing??0))*(-Math.expm1(-dt/90));
  r.data.oil=aq(m,'oilFluid')*885.45/.91;r.data.syrup=syrup*342.3;
  r.message='Тос тусдаа хөвөх үе үүсгэнэ. Сироп усанд уусч холилдоно; дүрсний үе бүр нэмсэн бодисын хэмжээнээс хамаарна.';break;
 }
 case 'diffusionChamber':{const marker=(m.g?.tracer??0)>0;const wet=r.chambers[1];const dye=aq(wet,'dyeB')+aq(wet,'dyeR')>0&&wet.water>0;if(marker)r.data.dispersion=(r.data.dispersion??0)+(1-(r.data.dispersion??0))*(-Math.expm1(-dt*.02*(r.light?3:1)));if(dye)r.data.liquidDispersion=(r.data.liquidDispersion??0)+(1-(r.data.liquidDispersion??0))*(-Math.expm1(-dt*.003));r.message='Тэмдэгт хий эсвэл усан будагны бодит нэмсэн эх үүсвэр тархана. Сэнс бол бүхэл урсгал; цэвэр диффузийн коэффициент хэмжээгүй.';break;}
 case 'electrolysisCell':plate(r,dt);break;
 case 'galvanicCell':{
  const [a,b]=r.chambers,ca=aq(a,'Zn')/Math.max(EPS,liquidMl(a)/1000),cb=aq(b,'Cu')/Math.max(EPS,liquidMl(b)/1000);
  const e=ca>0&&cb>0?1.10-.05916/2*Math.log10(ca/cb):0;r.data.cellVoltage=e;
  const current=r.connected?Math.max(0,e)/Math.max(1,r.resistance):0;r.data.cellCurrent=current;
  const dn=Math.min(sol(a,'Zn'),aq(b,'Cu'),current*dt/96485.33212/2);putS(a,'Zn',-dn);putA(a,'Zn',dn);putA(b,'Cu',-dn);putS(b,'Cu',dn);reaction(r,'Zn + Cu²⁺ → Zn²⁺ + Cu',dn);
  r.message='Вольтметр нээлттэй хэлхээнд хүчдэл заана. Гүүр ба ачааллыг холбоход бодит Zn зарцуулагдаж Cu ялгарна; идеал Нернстийн хэлхээ.';break;
 }
 case 'migrationTube':if(aq(m,'Cu')>0&&aq(m,'CrO4')>0)r.data.migration=Math.min(1,(r.data.migration??0)+r.voltage*dt*.001);r.message='Cu²⁺ катодын зүг, CrO₄²⁻ анодын зүг шилжинэ. Электродын туйл ба хүчдэл хөдөлгөөнийг удирдана.';break;
 case 'pressureCell':gasEquilibrium(r,dt);break;
 case 'exposureRack':expose(r,dt);break;
 case 'soilBench':soil(r,dt);break;
 case 'fermenter':case 'enzymeRack':biology(r,dt);break;
 case 'interfacialBath':polymer(r,dt);break;
 case 'molecularKit':molecular(r);break;
 case 'fallingBallViscometer':{
  const oil=aq(m,'oilFluid')>0,sugar=aq(m,'sucrose')*342.3,sugarFraction=sugar/Math.max(1e-9,m.water+sugar),mu=(oil?.06:.001*Math.exp(12*sugarFraction))*Math.exp(-.025*(m.temp-22)),density=oil?910:1000,radius=.0005;
  const force=4/3*Math.PI*radius**3*(2500-density)*9.80665;let lo=0,hi=10;for(let i=0;i<60;i++){const v=(lo+hi)/2,re=density*v*2*radius/mu,cd=re<1000?24/Math.max(1e-12,re)*(1+.15*re**.687):.44;const drag=.5*density*cd*Math.PI*radius**2*v*v;if(drag<force)lo=v;else hi=v;}const speed=(lo+hi)/2,re=density*speed*2*radius/mu;r.data.reynolds=re;
  if((r.data.distance??0)<.1){const moved=Math.min(.1-(r.data.distance??0),speed*dt);r.data.distance=(r.data.distance??0)+moved;r.data.fallTime=(r.data.fallTime??0)+moved/speed;}
  r.message=re<1?'Бөмбөлөг 10 см хоолойд унаж байна. Температур ба бодит шингэн зууралдлагад нөлөөлнө; Стоксын ойролцоо.':'Re≥1: инерцийн эсэргүүцлийн ойролцоо Cd-ээр унах хурдыг бодов; Стоксын энгийн тооцоо хэрэглээгүй.';break;
 }
 default:{
  if(r.operation==='ignite')m.burning=true;
  if(r.kind==='magneticReactor'&&r.operation==='magnet'){const dn=sol(m,'Fe');putS(m,'Fe',-dn);putS(r.chambers[2],'Fe',dn);r.operation='observe';}
  if(r.kind==='dryingOven'){
   if(m.temp>100&&sol(m,'CuSO4_5')>0){const dn=sol(m,'CuSO4_5')*(-Math.expm1(-dt*.06));putS(m,'CuSO4_5',-dn);putS(m,'CuSO4',dn);r.chambers[2].water+=dn*5*18.015;reaction(r,'CuSO₄·5H₂O → CuSO₄ + 5H₂O',dn);}
   else if(m.water>0&&sol(m,'CuSO4')>0){const dn=Math.min(sol(m,'CuSO4'),m.water/18.015/5)*(-Math.expm1(-dt*.2));putS(m,'CuSO4',-dn);putS(m,'CuSO4_5',dn);m.water-=5*dn*18.015;reaction(r,'CuSO₄ + 5H₂O → CuSO₄·5H₂O',dn);}
  }
  if(r.kind==='multiReactionRack'){
   r.chambers=r.chambers.map((c,i)=>{const duration=Math.min(.3,dt),res=step(c,duration,{...DEFAULT_ENV,lossWK:0});r.gas+=(res.gas.H2+res.gas.CO2+res.gas.O2)*duration*24000;r.data[`hydrogen${i}`]=(r.data[`hydrogen${i}`]??0)+res.gas.H2*duration*24000;if(res.gas.H2>EPS)reaction(r,'Металл + 2H⁺ → металл²⁺ + H₂',res.gas.H2*duration);return res.m;});
  }else{
   for(const change of reactCurriculum(m,dt))reaction(r,change.equation,change.extent);
   if(r.kind==='equilibriumCell'){const old=aq(m,'FeSCN');r.chambers[0]=equilibrate(m).m;reaction(r,'Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺',Math.abs(aq(r.chambers[0],'FeSCN')-old));}
   if(['crackingTube','dehydrationFlask'].includes(r.kind)){
    const gas=m.g??{};m.g={};for(const [id,n] of Object.entries(gas))putG(r.chambers[1],id as GasId,n??0);
    if(aq(r.chambers[2],'Br2')>0&&gaseous(r.chambers[1],'C2H4')>0){const n=gaseous(r.chambers[1],'C2H4');putG(r.chambers[1],'C2H4',-n);putG(r.chambers[2],'C2H4',n);for(const change of reactCurriculum(r.chambers[2],dt))reaction(r,change.equation,change.extent);}
   }
  }
  if(r.kind==='opticalBench'){const hidden=sol(m,'S')*32.06/Math.max(1,m.water)>.0001;r.data.crossVisible=hidden?0:1;if(hidden&&r.data.crossTime===undefined)r.data.crossTime=r.elapsed;}
  r.message=r.equation||'Бодис, температур ба шаардлагатай нөхцөлийг шалга. Халаалтгүй, гүйдэлгүй эсвэл эх бодисгүй үед бүтээгдэхүүн зохиомлоор үүсэхгүй.';
 }
 }
 r.temperature=r.chambers[r.port].temp;
 measure(r);return r;
}
