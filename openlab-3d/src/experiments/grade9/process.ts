/** Dedicated apparatus simulation. Inputs are transferred portions of actual stock;
 * no outcomes are chosen by notebook sliders. SI/stoichiometric bounds are enforced,
 * while transport rates and the accelerated corrosion clock are teaching approximations. */
import { emptyMixture, liquidMl, solidMassG, heatCapacity, contentMassG, type Mixture } from '../../chemistry/mixture';
import { equilibrateHeat } from '../../chemistry/mix';
import { acidState, acidityToNeutral, equilibrate, phOf } from '../../chemistry/equilibrium';
import { step, DEFAULT_ENV } from '../../chemistry/kinetics';
import type { SolidId } from '../../chemistry/species';
import type { RigKind } from './kinds';
export interface RigState {
 experiment:string;kind:RigKind;port:number;chambers:Mixture[];running:boolean;connected:boolean;elapsed:number;heating:boolean;cooling:boolean;
 temperature:number;initialAir:number;closed:boolean;scratched:boolean;hotAbove:boolean;
 gas:number;escaped:number;initialMass:number;extent:number;bands:number[];rust:number[];color:string;message:string;
}
export const createRig=(experiment:string,kind:RigKind):RigState=>({experiment,kind,port:0,chambers:Array.from({length:kind==='corrosionRack'?7:kind==='reactionTile'?6:3},()=>emptyMixture()),running:false,connected:false,elapsed:0,heating:false,cooling:false,temperature:22,initialAir:0,closed:true,scratched:false,hotAbove:false,gas:0,escaped:0,initialMass:0,extent:0,bands:[],rust:Array(7).fill(0),color:'#c5eaff',message:'Бодисоо өмнөхтэй адил авч, сонгосон тасалгаанд хий. Дараа нь багажийг ажиллуул.'});
const mass=contentMassG;
const copy=(r:RigState):RigState=>({...r,chambers:r.chambers.map(m=>structuredClone(m)),rust:[...r.rust],bands:[...r.bands]});
export function loadRig(r:RigState,portion:Mixture):RigState {
 const next=copy(r);next.chambers[r.port]=equilibrateHeat(next.chambers[r.port],portion,20).m;
 next.message=`${r.port+1}-р тасалгаанд нэмлээ: ${liquidMl(portion).toFixed(1)} мл / ${solidMassG(portion).toFixed(2)} г.`;
 return next;
}
export function startRig(r:RigState):RigState {
 const n=copy(r),[a,b,c]=n.chambers;
 let error='';
 switch(n.kind){
 case 'convectionCell':if(liquidMl(a)<1||liquidMl(b)<1)error='Хоёр саванд тус тус халуун ба хүйтэн ус хий.';break;
 case 'heatingBath':if(!solidMassG(a)&&liquidMl(a)<1)error='Мөс эсвэл ус эхлээд хий.';break;
 case 'gasSyringe':if(!n.initialAir)error='Эхлээд тариурт агаар соруулаарай.';else if(n.experiment==='g9-air-oxygen'&&!(a.s.Cu))error='Халаах хэсэгт зэс хий.';break;
 case 'diffusionTube':if(!(a.aq.NH3)&&!(b.aq.NH3))error='Нэг төгсгөлд аммиакийн уусмал хэрэгтэй.';else if(!((a.aq.NH3&&acidityToNeutral(b)>1e-7)||(b.aq.NH3&&acidityToNeutral(a)>1e-7)))error='Хоёр тусдаа төгсгөлд NH₃ ба HCl хийн эх үүсвэрийг байрлуул.';break;
 case 'diffusionCell':if(liquidMl(a)<1)error='Үндсэн саванд ус хий.';else if(!n.connected&&!solidMassG(b)&&!Object.keys(b.aq).length)error='Хоёр дахь тасалгаанд тархах бодис хий.';break;
 case 'chromatographyTank':if(!c.s.paper)error='Цаасыг гурав дахь үүрэнд байрлуул.';else if(liquidMl(a)<=0)error='Камерт ус хий.';else if(liquidMl(a)>=60)error='Усны түвшин эхлэх толбыг дарсан байна. Усны хэмжээг багасга (60 мл-ээс бага).';else if(!b.from.some(x=>x==='inkA'||x==='inkB'))error='Цаасны эхлэлд бэхний дээж нэм.';break;
 case 'conductivityTester':if(!solidMassG(a)&&liquidMl(a)<=0)error='Электродын хооронд шалгах дээжээ байрлуул.';break;
 case 'gasTrain':if(n.experiment==='g9-citric-endotherm'&&a.water+b.water<=0)error='① Урвалын саванд ус нэм. Хуурай хүчил ба содыг дангаар нь холихгүй.';else if(n.experiment==='g9-citric-endotherm'&&(a.s.citric??0)+(b.s.citric??0)<=0)error='① Урвалын саванд нимбэгний хүчил нэм.';else if(n.experiment==='g9-citric-endotherm'&&(a.s.NaHCO3??0)+(b.s.NaHCO3??0)<=0)error='② Нэмэх саванд сод (NaHCO₃) хий; дараа нь холих товч дар.';else if(!solidMassG(a)&&liquidMl(a)<=0)error='Урвалын үндсэн саванд эх бодис хий.';else if(n.experiment==='g9-reaction-types'&&a.s.graphite&&!n.initialAir)error='Нүүрстөрөгчийг шатаахаас өмнө хийн хэсэгт агаар соруул.';break;
 case 'calorimeter':if(a.water<1||b.ethanol<=0)error='Дээд саванд ус, тусдаа дэнгийн саванд этанол хий.';break;
 case 'corrosionRack':if(!n.chambers.some(x=>x.s.Fe&&x.water>0))error='Харьцуулах үүрнүүдэд төмөр ба ус хий.';break;
 case 'fractionatingColumn':if(!n.initialAir)error='Эхлээд агаарыг соруулах товч дар.';break;
 case 'reactionTile':if(!n.chambers.some(x=>liquidMl(x)>0))error='Нэг үүрэнд сорих уусмал нэм.';break;
 }
 if(error)return {...n,message:error,running:false};
 if(n.kind==='gasTrain'||n.kind==='diffusionCell'&&!n.connected){n.chambers[0]=equilibrateHeat(a,b,40).m;n.chambers[1]=emptyMixture();n.connected=true;}
 if(n.kind==='conductivityTester'&&!n.connected&&liquidMl(b)>0){n.chambers[0]=equilibrateHeat(a,b,20).m;n.chambers[1]=emptyMixture();n.connected=true;}
 n.initialMass=n.initialMass||n.chambers.reduce((s,m)=>s+mass(m),0);n.running=true;n.message='Ажиллаж байна. Бодит нэмсэн хэмжээ, хугацаагаа хэмжиж харьцуул.';return n;
}
export function tickRig(r:RigState,dt:number):RigState {
 if(!r.running||dt<=0||!Number.isFinite(dt))return r;
 const n=copy(r);n.elapsed+=dt;const a=n.chambers[0],b=n.chambers[1];
 switch(n.kind){
 case 'convectionCell': {const delta=Math.abs(a.temp-b.temp);const hotBelow=n.hotAbove?a.temp<b.temp:a.temp>b.temp;const rate=hotBelow?.015+.002*delta:.001; n.extent+=(1-n.extent)*(1-Math.exp(-rate*dt));const ca=heatCapacity(a)+20,cb=heatCapacity(b)+20;const heat=(a.temp-b.temp)*dt*(hotBelow?.08:.003)*ca*cb/(ca+cb);a.temp-=heat/ca;b.temp+=heat/cb;n.message=hotBelow?'Халуун, нягт багатай ус дээш хөөрч эргэлт үүсэв.':'Халуун ус дээр: нягтын тогтвортой үе, холилдолт удаан.';break;}
 case 'heatingBath': {const result=step(a,dt,{...DEFAULT_ENV,heatW:n.heating?150:0,glassJK:20,lossWK:.05});n.chambers[0]=result.m;n.temperature=result.m.temp;n.message=(result.m.s.ice??0)>1e-10?'Мөс: 0°C-д хайлах үед дулаан төлөв шилжихэд зарцуулагдана.':result.boiling?'Буцлах: усны уур үүсч байна.':'Шингэн усны температур өөрчлөгдөж байна.';break;}
 case 'gasSyringe': {n.temperature+=(n.heating?1:n.cooling?-1:(22-n.temperature)*.08)*dt;n.temperature=Math.max(0,Math.min(80,n.temperature));if(n.experiment==='g9-air-oxygen'&&n.heating&&(a.s.Cu??0)>0){const available=Math.max(0,n.initialAir*.21-n.extent)/24000;const dn=Math.min(a.s.Cu??0,available*2)*(1-Math.exp(-.12*dt));a.s.Cu=(a.s.Cu??0)-dn;a.s.CuO=(a.s.CuO??0)+dn;n.extent+=dn/2*24000;}n.gas=(n.initialAir-n.extent)*(n.temperature+273.15)/295.15;n.message=n.experiment==='g9-air-oxygen'?'2Cu + O₂ → 2CuO. Эхний температур хүртэл хөргөж унш.':'Чөлөөт бүлүүр: V/T тогтмол. Температур Кельвинээр.';break;}
 case 'diffusionTube': {const leftAmmonia=(a.aq.NH3??0)*acidState(a).nh3Fraction;const rightAmmonia=(b.aq.NH3??0)*acidState(b).nh3Fraction;const ammonia=leftAmmonia>rightAmmonia?a:b,acid=leftAmmonia>rightAmmonia?b:a;const limit=Math.min(Math.max(leftAmmonia,rightAmmonia),Math.max(0,acidityToNeutral(acid)));const dn=limit*(1-Math.exp(-dt/15));ammonia.aq.NH3=Math.max(0,(ammonia.aq.NH3??0)-dn);acid.aq.Cl=Math.max(0,(acid.aq.Cl??0)-dn);n.chambers[2].s.NH4Cl=(n.chambers[2].s.NH4Cl??0)+dn;n.extent+=dn;n.color='#f8fafc';n.message='NH₃ + HCl → NH₄Cl(s). Цагаан цагираг HCl төгсгөлд ойр үүснэ. Хий өнгөгүй.';break;}
 case 'diffusionCell': {const factor=a.fine?3:1;const medium=n.chambers[2].s.paper?'paper':n.chambers[2].s.gelatin?'gelatin':'water';const D=.006*factor*2**((a.temp-22)/25)*(medium==='gelatin'?.1:medium==='paper'?.5:1);n.extent+=(1-n.extent)*(1-Math.exp(-D*dt));n.chambers[0]=step(a,dt,{...DEFAULT_ENV,lossWK:0,stir:0}).m;n.color=a.aq.MnO4||a.s.KMnO4?'#9848ba':'#358bdf';n.message=medium==='paper'?'Цаасанд капиллярын урсгал мөн оролцоно.':a.fine?'Нунтагласан гадаргуу их: уусалт хурдан.':'Тархалт: өндөр концентрациас бага концентраци руу нийт шилжилт.';break;}
 case 'chromatographyTank': {const front=Math.min(16,Math.sqrt(n.elapsed)*1.2);n.extent=front;const ratios=b.from.includes('inkB')?[.3,.65]:[.2,.55,.85];n.bands=ratios.map(x=>x*front);n.message='Бэхний бүрэлдэхүүнүүд өөр зайд явж байна. Rf = толбоны зай / уусгагчийн фронтын зай.';break;}
 case 'conductivityTester': {const keys=Object.entries(a.s).filter(([,v])=>(v??0)>1e-10).map(([k])=>k);n.extent=keys.some(k=>['Al','Mg','Cu','Zn','Fe','graphite'].includes(k))?1:keys.includes('Si')?.15:liquidMl(a)>0&&Object.values(a.aq).some(v=>(v??0)>1e-6)?.7:0;const result=step(a,dt,{...DEFAULT_ENV,lossWK:0});n.chambers[0]=result.m;n.gas+=result.gas.H2*dt*24000; n.message=keys.includes('graphite')?'Графит металл биш ч хөдөлгөөнт электронтой учир дамжуулна.':n.extent>.5?'Гүйдэл дамжиж, гэрэл асав.':'Гүйдэл маш бага; гэрэл асахгүй эсвэл бүдэг.';break;}
 case 'reactionTile': {for(let i=0;i<n.chambers.length;i++){const m=n.chambers[i];const result=step(m,dt,{...DEFAULT_ENV,lossWK:0});n.chambers[i]=result.m;}const m=n.chambers[n.port],p=phOf(m);n.color=m.s.litmus_red||m.s.litmus_blue?(p!==null&&p<6?'#dd5470':p!==null&&p>8?'#5566d9':m.s.litmus_red?'#dd5470':'#5566d9'):m.aq.I2?'#a96a32':m.aq.Br2?'#c68d43':'#c5eaff';n.message=m.s.litmus_red||m.s.litmus_blue?'Лакмусын өнгийг эхний өнгөтэй нь харьцуул.':'Галоген халах үед шинэ галоген үүснэ; нэмсэн уусмалын өөрийн өнгөтэй харьцуул.';break;}
 case 'calorimeter': {if(n.heating&&b.ethanol>0){const ml=Math.min(b.ethanol,.025*dt);b.ethanol-=ml;const q=ml*.789*26800*.4;a.temp=Math.min(100,a.temp+q/(4.18*a.water+40));n.extent+=ml*.789;}else a.temp+=(22-a.temp)*.002*dt;n.temperature=a.temp;n.message='Этанол тусдаа дэнгэнд шатна. Усанд дамжих дулааныг Q=mcΔT-ээр үнэл. Сав ба орчинд алдагдал бий.';break;}
 case 'corrosionRack': {n.chambers.forEach((m,i)=>{if(!(m.s.Fe&&m.water>0))return;const barrier=m.from.some(x=>['paint','oil','plastic'].includes(x));const rate=barrier&&!n.scratched?.001:m.s.Zn?.003:m.s.Cu?.1:.06;const before=n.rust[i];n.rust[i]=Math.min(1,before+(1-before)*rate*dt);const iron=Math.min(m.s.Fe??0,(m.s.Fe??0)*(n.rust[i]-before));m.s.Fe=(m.s.Fe??0)-iron;m.s.FeOH3=(m.s.FeOH3??0)+iron;m.water=Math.max(0,m.water-iron*27.02);if((m.s.Zn??0)>0)m.s.Zn=Math.max(0,(m.s.Zn??0)-.00002*dt);});n.message='Харьцуулах түргэвчилсэн цаг: 1 секунд = 1 цаг. Тос/будаг тусгаарлана; Cu зэврэлтийг түргэсгэж, Zn өөрөө исэлдэн хамгаална.';break;}
 case 'fractionatingColumn': {n.temperature=Math.max(-200,Math.min(22,n.temperature+(n.cooling?-10:n.heating?1:0)*dt));if(n.cooling&&n.temperature<=-200)n.extent=1;if(n.extent===1&&n.heating){n.gas=n.temperature>=-183?n.initialAir:n.temperature>=-186?n.initialAir*.79:n.temperature>=-196?n.initialAir*.78:0;}n.message=n.extent<1?'Агаарыг цэвэрлэж, хөргөх циклээр шингэрүүлнэ. Шахалт дангаараа хөргөхгүй.':n.temperature>=-183?'O₂ фракцын буцлах муж.':n.temperature>=-196?'N₂ түрүүлж ууршина; бодит баганад давтан конденсаци хэрэгтэй.':'Шингэн агаар. Аажмаар бүлээсгэж фракцуудыг салга.';break;}
 case 'gasTrain': {
  const env={...DEFAULT_ENV,heatW:n.heating?300:0,glassJK:30,lossWK:.3};
  // Citric acid is kept distinct from acetate; the limiting bicarbonate fixes gas yield.
  if(n.experiment==='g9-citric-endotherm'){
    if(a.water>0&&(a.s.citric??0)>0&&(a.s.NaHCO3??0)>0){const dn=Math.min(a.s.citric??0,(a.s.NaHCO3??0)/3)*(1-Math.exp(-.5*dt));a.s.citric=(a.s.citric??0)-dn;a.s.NaHCO3=(a.s.NaHCO3??0)-3*dn;a.aq.Na=(a.aq.Na??0)+3*dn;a.aq.Cit=(a.aq.Cit??0)+dn;n.gas+=dn*3*24000;n.escaped+=dn*3*44.01;a.water+=dn*3*18.015;a.temp-=dn*36000/(heatCapacity(a)+30);n.extent+=dn;}
    n.temperature=a.temp;n.message='Цитрийн хүчил + NaHCO₃ → цитрат + CO₂ + H₂O. Хязгаарлагч бодис дуусахад хий зогсоно; орчноос дулаан авна.';break;
  }
  if(n.experiment==='g9-ammonia-preparation'&&n.heating){const dn=Math.min((a.s.NH4Cl??0)/2,a.s.CaOH2??0)*(1-Math.exp(-.08*dt));a.s.NH4Cl=(a.s.NH4Cl??0)-2*dn;a.s.CaOH2=(a.s.CaOH2??0)-dn;a.aq.Ca=(a.aq.Ca??0)+dn;a.aq.Cl=(a.aq.Cl??0)+2*dn;a.water+=36.03*dn;n.gas+=2*dn*24000;n.escaped+=2*dn*17.03;}
  if(n.experiment==='g9-reaction-types'&&n.heating&&(a.s.graphite??0)>0){const dn=Math.min(a.s.graphite??0,Math.max(0,n.initialAir*.21/24000-n.extent))*(1-Math.exp(-.08*dt));a.s.graphite=(a.s.graphite??0)-dn;n.extent+=dn;n.gas+=dn*24000;n.escaped+=dn*44.01;}
  const res=step(a,dt,env);n.chambers[0]=res.m;const mol=(res.gas.CO2+res.gas.H2+res.gas.O2+res.gas.NH3)*dt;n.gas+=mol*24000;n.escaped+=(res.gas.CO2*44.01+res.gas.H2*2.016+res.gas.O2*32+res.gas.NH3*17.03)*dt;
  if(res.gas.CO2>0&&n.chambers[2].water>0){n.chambers[2].aq.CO3=(n.chambers[2].aq.CO3??0)+res.gas.CO2*dt;n.chambers[2]=equilibrate(n.chambers[2]).m;}
  n.temperature=res.m.temp;n.color=(n.chambers[2].s.CaCO3??0)>0?'#e5edf0':'#c5eaff';n.message=n.gas>0?'Хий хоолойгоор цугларч байна. Хий, тунадас, температур ба масс өөрчлөлтийг харьцуул.':'Эх бодис ба халаалтын нөхцөлөө шалга. Бодис нэмээгүй бол хий зохиомлоор үүсэхгүй.';break;
 }
 }
 return n;
}
export function rigReadings(r:RigState){
 const out:{label:string;value:number;unit:string}[]=[{label:'Хугацаа',value:r.elapsed,unit:r.kind==='corrosionRack'?'цаг (түргэвчилсэн)':'с'}];
 const add=(label:string,value:number,unit:string)=>out.push({label,value,unit});
 if(['gasTrain','gasSyringe','fractionatingColumn'].includes(r.kind))add('Хийн эзлэхүүн',r.gas,'мл');
 if(r.kind==='gasTrain'&&r.experiment==='g9-mass-conservation')add('Системийн масс өөрчлөлт',r.closed?0:-r.escaped,'г');
 if(['heatingBath','gasSyringe','calorimeter','fractionatingColumn','gasTrain'].includes(r.kind))add('Температур',r.temperature,'°C');
 if(r.kind==='chromatographyTank'){add('Уусгагчийн фронт',r.extent,'см');r.bands.forEach((v,i)=>add(`Толбо ${i+1}`,v,'см'));}
 if(r.kind==='diffusionTube')add('Цагираг HCl талаас',30/(1+Math.sqrt(36.46/17.03)),'см');
 if(r.kind==='conductivityTester'&&r.gas>0)add('H₂',r.gas,'мл');
 if(r.kind==='conductivityTester')add('Дамжуулалтын харьцангуй заалт',r.extent,'0–1');
 if(r.kind==='calorimeter')add('Шатсан түлшний масс',r.extent,'г');
 if(r.kind==='corrosionRack')r.rust.forEach((v,i)=>add(`Үүр ${i+1}: зэврэлтийн индекс`,v*100,'% (харьцуулалт)'));
 if(['diffusionCell','convectionCell'].includes(r.kind))add('Холилдолтын харьцангуй индекс',r.extent*100,'%');
 if(r.kind==='reactionTile'){const ph=phOf(r.chambers[r.port]);if(ph!==null)add('Сонгосон үүрийн pH',ph,'');}
 return out;
}
export const rigSolid=(r:RigState,id:SolidId)=>r.chambers.reduce((sum,m)=>sum+(m.s[id]??0),0);
