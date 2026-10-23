import data from '../data/textbook-investigations.json';
export interface InvestigationControl { id: string; label: string; min?: number; max?: number; step?: number; value?: number; options?: { value: number; label: string }[] }
export interface InvestigationDefinition { id: string; title: string; bookPages: string; mode: 'model' | 'bench'; model: string; practicalIds: string[]; prompt: string; variables: string; controls: InvestigationControl[]; supplies: string[]; safety: string }
export interface Trial { parameters: Record<string, number>; readings: { label: string; value: number; unit: string }[]; observation: string; source: 'model' | 'bench' | 'manual'; at: number }
export interface InvestigationAttempt { prediction: string; observation: string; conclusion: string; trials: Trial[]; revealed: boolean }
export const INVESTIGATIONS = data as InvestigationDefinition[];
export const newAttempt = (): InvestigationAttempt => ({ prediction: '', observation: '', conclusion: '', trials: [], revealed: false });
export const investigationById = (id: string) => INVESTIGATIONS.find((x) => x.id === id);
export function parameterValues(definition: InvestigationDefinition, input: Record<string, number> = {}) {
  return Object.fromEntries(definition.controls.map((c) => {
    const value = input[c.id];
    if (c.options) return [c.id, c.options.some((o) => o.value === value) ? value : c.value ?? c.options[0].value];
    const raw = Number.isFinite(value) ? value : c.value ?? c.min ?? 0;
    const step=c.step??1,min=c.min??0;
    return [c.id, Math.max(min, Math.min(c.max??100, Number((min+Math.round((raw-min)/step)*step).toFixed(8))))];
  }));
}
/** Deliberately simplified teaching models, NOT empirical readings or safety predictions.
 * Rate trials use bounded first-order extent; calorimetry uses Q=mcΔT with explicit losses.
 * Environmental outputs are illustrative sample scenarios, never actual local pollution data. */
export function runModel(definition: InvestigationDefinition, input: Record<string, number>, at = Date.now()): Trial {
  if (definition.mode !== 'model') throw new Error('Bench experiments must use observed measurements');
  const p = parameterValues(definition, input), readings: Trial['readings'] = [];
  const add = (label: string, value: number, unit: string) => readings.push({ label, value: Math.round(value * 1000) / 1000, unit });
  let observation = '';
  switch (definition.model) {
    case 'atom': {
      add('Атомын дугаар',p.protons,'');add('Массын тоо',p.protons+p.neutrons,'');add('Цэнэг',p.protons-p.electrons,'e');
      observation = `Протоны тоо элементийг тогтооно. Электрон өөрчлөгдвөл ион, нейтрон өөрчлөгдвөл изотоп. Нийт ${p.electrons} электронтой Борыг дуурайсан загвар; орбиталь биш.`;break;
    }
    case 'cards': {
      add('Таамагласан бүлэг',p.group,'');
      observation = ['A: Na — 1-р бүлэг.','B: Mg — 2-р бүлэг.','C: Cl — 17-р бүлэг.'][p.card]+' Түүхэн ангилалд масс ба шинжийг харьцуулсан; орчин үеийн хүснэгт атомын дугаараар эрэмбэлэгдэнэ.';break;
    }
    case 'rate': {
      const limit = p.concentration * 120;
      const extent = 1 - Math.exp(-.015 * (p.concentration / .5) * 2 ** ((p.temperature - 25) / 10) * p.surface * p.time);
      const gas = limit * extent;
      add('CO₂',gas,'мл');add('Үлдсэн нийт масс',12 - gas / 24000 * 44.01,'г');
      observation = 'Карбонат + хүчил. Гадагшилсан CO₂-ийн молийн тоо нь хүчил болон эх бодисоор хязгаарлагдана. Загварын хугацаа бодит урвалын баталгаат хугацаа биш.'; break;
    }
    case 'melting': {
      const melting = p.salt ? -3 : 0;
      const temperature = p.time < 40 ? -10 + (melting + 10) * p.time / 40 : p.time < 180 ? melting : melting + (p.time - 180) * .2;
      add('Температур',temperature,'°C');add('Хайлсан хэсэг',Math.max(0,Math.min(100,(p.time-40)/140*100)),'%');
      observation = 'Мөсний масс ба халаалтын чадал ижил. Давстай мөсний −3°C нь хольцын нөлөөг харуулах жишээ утга; бүх давстай усны тогтмол хайлах цэг биш.'; break;
    }
    case 'group2': {
      const k = p.medium ? (p.metal ? .09 : .035) : (p.metal ? .035 : .0002);
      add('H₂',24 * (1-Math.exp(-k*p.time)),'мл');
      observation = 'Ижил 1 ммоль металлтай, урвалжийн илүүдэлтэй харьцуулсан загвар. Өрөөний температурт Mg устай маш удаан урвалдана.';break;
    }
    case 'halogens': {
      const displaced = p.halogen < p.halide;
      add('Халах урвал',displaced?1:0,'0=үгүй, 1=тийм');
      observation = displaced ? `${['Cl₂','Br₂','I₂'][p.halogen]} нь ${['Cl⁻','Br⁻','I⁻'][p.halide]}-ийг исэлдүүлж ${['Cl₂','Br₂','I₂'][p.halide]} үүсгэнэ.` : 'Энэ хосод галоген халах урвал явагдахгүй. Нэмсэн галогений өөрийн өнгө нь урвалын нотолгоо дангаараа биш.';break;
    }
    case 'changes': {
      add('Шинэ бодис',p.process>=2?1:0,'0=үгүй, 1=тийм');
      observation = ['Мөс хайлахад усны молекул хэвээр, төлөв өөрчлөгдөнө.','Давс уусахад ионууд усанд тархана; усыг ууршуулж давсаа буцаан авч болно.','Карбонат ба хүчил харилцан үйлчлэхэд CO₂, ус, давс үүснэ.','Лааны нүүрсустөрөгч хүчилтөрөгчтэй урвалд орж ус ба CO₂ үүсгэнэ.'][p.process];break;
    }
    case 'candle': {
      const burn = Math.min(p.time, p.oxygen < .5 ? 15 : 60);
      add('Шатсан хугацаа',burn,'с');add('Усны сорил',burn>0?1:0,'0/1');add('Шохойн усны сорил',burn>0?1:0,'0/1');
      observation = p.time===0 ? 'Эхний хяналтын ажиглалт.' : p.oxygen<.5 ? 'Хүчилтөрөгч багасахад дөл унтарч болно; дутуу шаталтад тортог, CO үүсэх боломжтой. Эдгээрийг өнгөөр нь бүрэн тогтоохгүй.' : 'Хүйтэн шил дээр усны дусал; CO₂-ийг шохойн ус булингартах сорилоор шалгана.';break;
    }
    case 'calorimetry': {
      const q = p.fuel*26800*p.efficiency/100;
      add('Усны эхний температур',20,'°C');add('Усны эцсийн температур',Math.min(100,20+q/(p.water*4.18)),'°C');add('Усанд дамжсан дулаан',q,'Ж');
      observation = 'Этанолын жишиг шаталтын дулаан 26.8 кЖ/г; Q=mcΔT. Ус 100°C хүрвэл илүү дулаан нь температур өсгөхөөс гадна ууршилтад зарцуулагдана. Алдагдлыг хувьсагчаар өгсөн.';break;
    }
    case 'photosynthesis': {
      add('Цуглуулсан O₂',p.time*.8*p.light/(p.light+30),'мл');
      observation = 'Ижил ургамал, тогтмол температуртай гэрэлд хамаарах жишээ загвар. Харанхуйд хэмжигдэх O₂ цугларахгүй; ургамлын амьсгал зогссон гэсэн үг биш.';break;
    }
    case 'air': add('Цуглуулсан тоосонцор',([2,12,22][p.site])*p.time,'тоо / ижил талбай');observation='Байршлуудын зохиомол харьцуулсан дээж. Энэ нь бодит агаарын чанарын хэмжилт биш.';break;
    case 'water': add('pH',[7,7,7,11][p.sample],'');add('Булингар',[0,80,0,10][p.sample],'жишиг нэгж');add('Ууссан бодис',[20,60,500,200][p.sample],'жишиг нэгж');observation='Тунгалаг байдал, pH, ууссан бодис нь өөр хэмжигдэхүүн. Эдгээрийн аль нэгээр ундны усны аюулгүй байдлыг тогтоохгүй.';break;
    case 'growth': add('Ургамлын өндөр',2+p.days*[.55,.2,.08][p.sample],'см');observation='Ижил эхний өндөртэй ургамлын өсөлтийн хялбаршуулсан жишээ. Төрөл, гэрэл, усны хэмжээ, давталтыг тогтмол байлга.';break;
    case 'treatment': add('Булингар',[80,35,5,0][p.method],'жишиг нэгж');add('Ууссан давс',[500,500,500,5][p.method],'жишиг нэгж');observation='Тунгаах, энгийн шүүлтүүр нь ууссан давсыг арилгахгүй. Нэрэх нь дэгдэмхий бохирдуулагчийг бүрэн арилгана гэсэн баталгаа биш. Дээж ундны ус гэж баталгаажаагүй.';break;
    case 'tobacco': add('Шүүлтүүрийн будалт',p.sample?8:0,'жишиг нэгж');add('pH',p.sample?5.5:7,'');observation='Утаанд өртсөн шүүлтүүрийн зохиомол дээж. Үлдэгдэл нь хольц; энэ сорилоор никотин, CO эсвэл бүх хорт бодисыг тус тусад нь хэмжээгүй.';break;
    default: throw new Error('Unknown investigation model');
  }
  return { parameters:p, readings, observation,source:'model',at };
}
export const EXISTING_PRACTICAL_LABS: Record<string,string> = { '1.2-prac1':'nacl','3.1-prac1':'metals','3.2-prac3':'elephant' };
export function labForPractical(id: string): string | null {
  return EXISTING_PRACTICAL_LABS[id] ?? INVESTIGATIONS.find((x)=>x.practicalIds.includes(id))?.id ?? null;
}
export function restoreAttempt(raw: unknown): InvestigationAttempt {
  if (!raw || typeof raw!=='object') return newAttempt();
  const x=raw as Partial<InvestigationAttempt>;
  const str=(v:unknown)=>typeof v==='string'?v.slice(0,3000):'';
  const trials=(Array.isArray(x.trials)?x.trials:[]).slice(-30).filter((r)=>r && ['model','bench','manual'].includes(r.source) && Number.isFinite(r.at) && Array.isArray(r.readings) && r.readings.length<=12 && r.readings.every((v)=>v && typeof v.label==='string' && typeof v.unit==='string' && Number.isFinite(v.value)) && r.parameters && Object.values(r.parameters).every(Number.isFinite));
  return {prediction:str(x.prediction),observation:str(x.observation),conclusion:str(x.conclusion),trials,revealed:x.revealed===true && str(x.observation).trim().length>0};
}

/** Compare one physical quantity at a time, preserving original trial numbers. */
export function measurementSeries(trials:Trial[],key?:string){
  const options=[...new Map(trials.flatMap((t)=>t.readings.map((r)=>[`${r.label}|${r.unit}`,{label:r.label,unit:r.unit} ] as const))).entries()];
  const selected=options.some(([id])=>id===key)?key:options[0]?.[0];
  const points=trials.flatMap((t,i)=>{const r=t.readings.find((r)=>`${r.label}|${r.unit}`===selected);return r?[{trial:i+1,value:r.value}]:[];});
  return {options,selected,points};
}
