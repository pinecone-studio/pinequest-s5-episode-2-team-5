/**
 * The textbook procedure of every experiment without a guided demonstration, done the way a
 * student does it at the worktop: with the stock the bench was given, through the game's own
 * transfer, heating and apparatus controls, while the live simulation runs. Each step checks
 * what the book says should be seen.
 */
import { storedIn, useInventoryStore } from '../../src/store/useInventoryStore';
import { mixtureOf, useChemStore } from '../../src/store/useChemStore';
import { useExperimentStore } from '../../src/store/useExperimentStore';
import { useLabStore } from '../../src/store/useLabStore';
import { transfer, heldHeat, stirUntil, emptyVessel, resolveTarget, underFunnel } from '../../src/interaction/actions';
import { bodies, livePose, supportSpots } from '../../src/interaction/bodies';
import { collectSupply, onWorkbench, useWorkbench } from '../../src/experiments/workbench/session';
import { useGrade9Apparatus } from '../../src/experiments/grade9/store';
import type { RigState } from '../../src/experiments/grade9/process';
import type { RigKind } from '../../src/experiments/grade9/kinds';
import { setProtocolClock, clearProtocolClock } from '../../src/experiments/workbench/guidance/clock';
import { CATALOG, heaterWatts, type EquipmentKind } from '../../src/equipment/equipmentCatalog';
import { phOf } from '../../src/chemistry/equilibrium';
import { liquidMl, solidMassG, type Mixture } from '../../src/chemistry/mixture';
import type { ItemVariant } from '../../src/world/itemsLayout';

export interface Ctx { say: (m: string) => void; check: (ok: boolean, why: string) => void; wait: (ms: number) => Promise<unknown> }
interface Vessel { id: string; kind: EquipmentKind; variant?: ItemVariant }

const spawnNo = (id: string) => Number(/^spawn-(\d+)-/.exec(id)?.[1] ?? -1);
/** The newest item on the worktop matching `ref` (an equipment kind, or `r:<reagent>`). */
function find(ref: string): Vessel {
  const reagent = ref.startsWith('r:') ? ref.slice(2) : undefined;
  const list = useInventoryStore.getState().worldItems.filter((w) => onWorkbench(livePose(w)) && (reagent ? w.variant?.reagent === reagent : w.kind === ref && !w.variant?.reagent));
  const w = list.sort((a, b) => spawnNo(b.id) - spawnNo(a.id))[0];
  if (!w) throw Error(`ширээнд ${ref} алга (бэлтгэлд гараагүй)`);
  return { id: w.id, kind: w.kind, variant: w.variant };
}
let extras = 0;
/** Another piece from the Tools drawer, put on a free spot of the worktop. */
function extra(kind: EquipmentKind): Vessel {
  const key = `play-extra-${++extras}-${kind}`;
  const before = new Set(Object.values(useWorkbench.getState().loose));
  if (!collectSupply({ key, kind, name: CATALOG[kind].name, use: '' }, false, true)) throw Error(`${kind}: ширээнд зай алга`);
  const id = Object.values(useWorkbench.getState().loose).find((x) => !before.has(x));
  if (!id) throw Error(`${kind}: шургуулгаас шинээр гарсангүй`);
  return { id, kind };
}
/** `n` clean test tubes standing in the bench's racks (a fresh rack holds 4); another rack from the drawer if short. */
function tubes(n: number): Vessel[] {
  const used = new Set<string>(), out: Vessel[] = [];
  for (let tries = 0; out.length < n && tries < 4; tries++) {
    const inv = useInventoryStore.getState();
    for (const rack of inv.worldItems.filter((w) => w.kind === 'testTubeRack' && onWorkbench(livePose(w)))) {
      for (const t of storedIn(inv.storage, rack.id)) {
        if (out.length >= n || used.has(t.id) || liquidMl(mixtureOf(t.id, t.variant)) > 0 || solidMassG(mixtureOf(t.id, t.variant)) > 0) continue;
        used.add(t.id); out.push({ id: t.id, kind: 'testTube', variant: t.variant });
      }
    }
    if (out.length < n) extra('testTubeRack');
  }
  if (out.length < n) throw Error(`тавиурт ${n} хоосон хуруу шил алга`);
  return out;
}
const m = (v: Vessel): Mixture => useGrade9Apparatus.getState().rigs[v.id]?.chambers[useGrade9Apparatus.getState().rigs[v.id].port] ?? mixtureOf(v.id, v.variant);

function pour(c: Ctx, from: string | Vessel, to: Vessel, amount: number, via?: Vessel): void {
  const src = typeof from === 'string' ? find(from) : from;
  const { moved } = transfer(src, to, amount, via?.id);
  c.check(Math.abs(moved - amount) < 1e-6 * Math.max(1, amount) || amount === Infinity, `${src.variant?.reagent ?? src.kind} → ${to.kind}: ${moved.toFixed(3)} / ${amount} шилжлээ`);
}
/** Pour everything (liquid and suspended solid) from one vessel to another, optionally through a funnel. */
function pourAll(c: Ctx, from: Vessel, to: Vessel, via?: Vessel): void {
  const amount = liquidMl(m(from)) || solidMassG(m(from));
  pour(c, from, to, amount, via);
}
const pose = (v: Vessel) => livePose(useInventoryStore.getState().worldItems.find((w) => w.id === v.id)!);
/** Put an item where a player would: on the support spot `held` is offered on/under `support`. */
function placeOn(item: Vessel, support: Vessel, which = 0) {
  const spots = supportSpots(useInventoryStore.getState().worldItems, item.kind).filter((sp) => sp.id === `support-${support.id}` || sp.id.startsWith(`support-${support.id}-`));
  const at = spots[which] ?? spots[0];
  if (!at) throw Error(`${support.kind} дээр ${item.kind} тавих байр алга`);
  const body = bodies.get(item.id);
  body?.setTranslation({ x: at.point.x, y: at.point.y + 0.002, z: at.point.z }, true); body?.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  body?.setLinvel({ x: 0, y: 0, z: 0 }, true); body?.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
/** Build a filter: the funnel in the stand's ring over `receiver` on its base, or on the receiver's mouth. */
async function filterSetup(c: Ctx, funnel: Vessel, receiver: Vessel, stand?: Vessel) {
  if (stand) { placeOn(receiver, stand); await c.wait(600); placeOn(funnel, stand); } else placeOn(funnel, receiver);
  await c.wait(2500);
  const w = (v: Vessel) => useInventoryStore.getState().worldItems.find((x) => x.id === v.id)!;
  c.check(pose(funnel).upY > 0.95 && pose(receiver).upY > 0.95, `шүүлтүүрийн угсралт унав (юүлүүр ${pose(funnel).upY.toFixed(2)}, сав ${pose(receiver).upY.toFixed(2)})`);
  c.check(underFunnel(w(receiver), w(funnel)), `${receiver.kind} юүлүүрийн доор биш (өндөр ${(pose(funnel).y - pose(receiver).y).toFixed(3)} м)`);
  const target = resolveTarget({ type: 'item', id: funnel.id, kind: 'funnel' });
  c.check(target?.type === 'item' && target.id === receiver.id, 'юүлүүр рүү асгахад доорх саванд орохгүй');
}
const stir = (v: Vessel, seconds = 20) => stirUntil.set(v.id, performance.now() + seconds * 1000);

/** Carry the vessel to the tripod, set the bench's heater under it, and light it. */
async function heatOnTripod(c: Ctx, v: Vessel): Promise<string> {
  const heater = (() => { try { return find('bunsenBurner'); } catch { return find('alcoholLamp'); } })();
  const tripod = find('tripod'), t = livePose(useInventoryStore.getState().worldItems.find((w) => w.id === tripod.id)!);
  bodies.get(heater.id)?.setTranslation({ x: t.x, y: t.y, z: t.z }, true);
  placeOn(v, tripod);
  await c.wait(800);
  c.check(pose(v).upY > 0.95, `${v.kind} гурван хөлт тавиур дээр тогтсонгүй`);
  if (!useExperimentStore.getState().toggles[heater.id]) useExperimentStore.getState().toggle(heater.id);
  return heater.id;
}
function heaterOff(id: string) { if (useExperimentStore.getState().toggles[id]) useExperimentStore.getState().toggle(id); }
/** Hold a vessel (gripped in its holder) in the flame of the bench's heater. */
function holdInFlame(v: Vessel, seconds: number) {
  const heater = (() => { try { return find('bunsenBurner'); } catch { return find('alcoholLamp'); } })();
  if (!useExperimentStore.getState().toggles[heater.id]) useExperimentStore.getState().toggle(heater.id);
  heldHeat.id = v.id; heldHeat.watts = (v.kind === 'testTube' ? 420 : 800) * heaterWatts(heater.kind) / heaterWatts('bunsenBurner'); heldHeat.until = performance.now() + seconds * 1000;
  return heater.id;
}
/** Let `ids` run for `seconds` of lab time (the lab clock runs `speed`× faster for them). */
async function run(c: Ctx, ids: string[], seconds: number, speed = 8, until?: () => boolean) {
  setProtocolClock(ids, speed);
  const end = performance.now() + (seconds / speed) * 1000;
  try { while (performance.now() < end && !(until?.())) await c.wait(250); } finally { clearProtocolClock(); }
}

/** An apparatus on the bench, readied for this experiment. */
function rig(kind: RigKind): Vessel & { get: () => RigState; set: (x: Partial<RigState>) => void; port: (i: number) => Mixture } {
  const v = find(kind);
  useGrade9Apparatus.getState().ensure(v.id, useLabStore.getState().active ?? '', kind);
  return { ...v, get: () => useGrade9Apparatus.getState().rigs[v.id], set: (x) => useGrade9Apparatus.getState().change(v.id, x), port: (i) => useGrade9Apparatus.getState().rigs[v.id].chambers[i] };
}
function load(c: Ctx, r: ReturnType<typeof rig>, port: number, from: string | Vessel, amount: number) {
  r.set({ port });
  pour(c, from, r, amount);
}
function start(c: Ctx, r: ReturnType<typeof rig>, change: Partial<RigState> = {}) {
  useGrade9Apparatus.getState().start(r.id);
  c.check(r.get().running, `${r.kind} ажилласангүй: ${r.get().message}`);
  if (Object.keys(change).length) r.set(change);
}
const empty = (v: Vessel) => emptyVessel(v.id, v.variant, CATALOG[v.kind].name, 'waste');
const ph = (v: Vessel) => phOf(m(v)) ?? 7;
const s = (v: Vessel, id: string) => (m(v).s as Record<string, number>)[id] ?? 0;
const aq = (v: Vessel, id: string) => (m(v).aq as Record<string, number>)[id] ?? 0;
const gas = (v: Vessel, id: string) => (m(v).g as Record<string, number> | undefined)?.[id] ?? 0;

type Script = (c: Ctx) => Promise<string | void>;
export const MANUAL: Record<string, Script> = {
  '7-12': async (c) => {
    const [up, down] = tubes(2);
    pour(c, 'r:gas_co2', up, 15); pour(c, 'r:gas_h2', down, 15);
    c.check(gas(down, 'H2') > 0 && gas(up, 'CO2') > 0, 'хийнүүд хураагдсангүй');
    return 'H₂ доош харуулсан, CO₂ дээш харуулсан хуруу шилэнд хураагдав';
  },
  '7-13': async (c) => {
    const r = rig('electrolysisCell');
    load(c, r, 0, 'r:cucl2', 50); load(c, r, 1, 'r:s_graphite', 1); load(c, r, 2, 'r:s_graphite', 1);
    start(c, r, { current: 0.5 }); await run(c, [r.id], 120);
    c.check(r.port(1).s.Cu! > 0, 'катодод зэс ялгарсангүй'); c.check((r.port(0).aq.Cl2 ?? 0) > 0, 'анодод хлор ялгарсангүй');
    return `катодод Cu ${(r.port(1).s.Cu! * 63.55 * 1000).toFixed(1)} мг`;
  },
  '7-14': async (c) => {
    const r = rig('electrolysisCell');
    load(c, r, 0, 'r:nacl', 50); load(c, r, 1, 'r:s_iron_nails', 2); load(c, r, 2, 'r:s_graphite', 1);
    start(c, r, { current: 0.5 }); await run(c, [r.id], 120);
    c.check((r.port(1).g?.H2 ?? 0) > 0, 'катодод H₂ алга'); c.check((r.port(0).aq.Cl2 ?? 0) > 0, 'анодод Cl₂ алга');
    c.check((phOf(r.port(0)) ?? 7) > 8, 'уусмал шүлтлэг болсонгүй');
  },
  '7-18': async (c) => {
    const beaker = find('beaker'), dish = find('evaporatingDish'), funnel = find('funnel');
    pour(c, 'r:water', beaker, 30); pour(c, 'r:s_sand', beaker, 3); pour(c, 'r:s_nacl', beaker, 2);
    stir(beaker, 60); await run(c, [beaker.id], 60, 4, () => s(beaker, 'NaCl') < 1e-6);
    c.check(s(beaker, 'NaCl') < 1e-6 && s(beaker, 'sand') > 0, 'давс уусаагүй эсвэл элс алга');
    // Book: «Штатив; Юүлүүр; Шүүлтүүрийн цаас» — the funnel in the stand's ring, the dish on its base.
    await filterSetup(c, funnel, dish, find('retortStand'));
    pourAll(c, beaker, dish, funnel);
    c.check(s(funnel, 'sand') > 0 && !(s(dish, 'sand') > 0), 'элс шүүлтүүр дээр үлдсэнгүй');
    const heater = await heatOnTripod(c, dish);
    await run(c, [dish.id], 900, 12, () => liquidMl(m(dish)) < 0.02);
    heaterOff(heater);
    c.check(s(dish, 'NaCl') > 0.02, `ууршуулсан аяганд давс алга (${liquidMl(m(dish)).toFixed(1)} мл үлдсэн)`);
    return `шүүгдэс ууршиж ${(s(dish, 'NaCl') * 58.44).toFixed(2)} г давс`;
  },
  '7-22': async (c) => {
    const tube = find('testTube');
    // A delivery tube bubbles CO₂ into the limewater; 10 mL fills the space above it.
    pour(c, 'r:limewater', tube, 10); pour(c, 'r:gas_co2', tube, 10);
    await run(c, [tube.id], 30, 4, () => s(tube, 'CaCO3') > 0);
    c.check(s(tube, 'CaCO3') > 0, 'шохойн ус булингартсангүй');
  },
  '7-30': async (c) => {
    const r = rig('exposureRack');
    for (const port of [0, 1, 2, 3]) load(c, r, port, 'r:s_iron_nails', 2);
    load(c, r, 0, 'r:water', 10); load(c, r, 1, 'r:water', 10); load(c, r, 1, 'r:s_nacl', 1); load(c, r, 2, 'r:hcl', 10); load(c, r, 3, 'r:water', 10);
    start(c, r, { heating: true, targets: [22, 22, 22, 70, 22, 22, 22, 22, 22] }); await run(c, [r.id], 1200, 16);
    const rust = r.get().rust;
    c.check(rust[1] > rust[0], `давстай ус ${rust[1]} ≤ ус ${rust[0]}`); c.check(rust[3] > rust[0], `халуун ус ${rust[3]} ≤ ус ${rust[0]}`);
    c.check((r.port(2).aq.Fe2 ?? 0) > 0, 'хүчил төмрийг уусгасангүй');
    return `зэв: ус ${rust[0].toFixed(3)}, давс ${rust[1].toFixed(3)}, халуун ${rust[3].toFixed(3)}`;
  },
  '7-33': async (c) => {
    const r = rig('heatingBath');
    const boil = async (atm: number) => {
      r.set({ chambers: r.get().chambers.map((x, i) => (i === 0 ? { ...x, water: 0, aq: {}, s: {} } : x)), running: false, heating: false });
      load(c, r, 0, 'r:water', 50); start(c, r, { heating: true, pressure: atm, port: 0 });
      await run(c, [r.id], 900, 16, () => r.port(0).water < 45);
      return r.port(0).temp;
    };
    const sea = await boil(1), ub = await boil(86.1 / 101.325);
    c.check(Math.abs(sea - 100) < 0.7, `далайн түвшинд ${sea.toFixed(1)} °C`); c.check(ub < sea - 3, `Улаанбаатарт ${ub.toFixed(1)} °C`);
    return `буцлах цэг: 0 м ${sea.toFixed(1)} °C, 1350 м ${ub.toFixed(1)} °C`;
  },
  '7-34': async (c) => {
    const can = find('aluminumCan');
    pour(c, 'r:water', can, 100); pour(c, 'r:s_ice', can, 50);
    await run(c, [can.id], 120, 4, () => (m(can).dew ?? 0) > 0.05);
    c.check((m(can).dew ?? 0) > 0, `лаазны гадна дусал үүссэнгүй (${m(can).temp.toFixed(1)} °C)`);
    return `лааз ${m(can).temp.toFixed(1)} °C, гадна ${(m(can).dew ?? 0).toFixed(2)} мл дусал`;
  },
  '7-35': async (c) => {
    const r = rig('phaseBath'), beaker = find('beaker');
    const results: string[] = [];
    for (const id of ['water', 'milk', 'apple_juice', 'orange_juice']) {
      empty(beaker); pour(c, `r:${id}`, beaker, 30);
      const heater = await heatOnTripod(c, beaker); await run(c, [beaker.id], 300, 8, () => m(beaker).temp >= 90); heaterOff(heater);
      c.check(m(beaker).temp >= 85, `${id} халсангүй (${m(beaker).temp.toFixed(0)} °C)`);
      r.set({ chambers: r.get().chambers.map(() => ({ water: 0, ethanol: 0, aq: {}, s: {}, temp: 22, cloud: 0, fine: false, burning: false, foam: 0, from: [] })), running: false, cooling: false });
      load(c, r, 0, `r:${id}`, 10); load(c, r, 1, beaker, 10);
      start(c, r, { cooling: true, targetTemperature: -18 });
      let t = 0, room = 0, hot = 0;
      setProtocolClock([r.id], 16);
      while (t < 600 && !(room && hot)) { await c.wait(250); t += 4; if (!room && (r.port(0).s.ice ?? 0) > 0) room = t; if (!hot && (r.port(1).s.ice ?? 0) > 0) hot = t; }
      clearProtocolClock();
      c.check(room > 0 && hot > 0, `${id} хөлдсөнгүй`); c.check(hot >= room, `${id}: халуун нь түрүүлж хөлдөв`);
      results.push(`${id} ${room}/${hot} с`);
    }
    return `хөлдөх (тасалгааны/90°C): ${results.join(', ')}`;
  },
  '8-03': async (c) => {
    const beaker = find('beaker'), dish = find('evaporatingDish'), funnel = find('funnel');
    pour(c, 'r:na2co3', beaker, 20); pour(c, 'r:hcl', beaker, 20); stir(beaker);
    await run(c, [beaker.id], 60, 4, () => aq(beaker, 'CO3') < 1e-5);
    c.check(aq(beaker, 'CO3') < 1e-4, 'карбонат дуусаагүй');
    await filterSetup(c, funnel, dish);
    pourAll(c, beaker, dish, funnel);
    const heater = await heatOnTripod(c, dish); await run(c, [dish.id], 600, 12, () => liquidMl(m(dish)) < 0.02); heaterOff(heater);
    c.check(s(dish, 'NaCl') > 0.005, `NaCl талст алга (${liquidMl(m(dish)).toFixed(1)} мл)`);
    return `${(s(dish, 'NaCl') * 58.44).toFixed(2)} г NaCl`;
  },
  '8-24': async (c) => {
    const r = rig('soilBench');
    load(c, r, 0, 'r:water', 50); load(c, r, 0, 'r:s_pondweed', 5);
    start(c, r, { light: 1, port: 0 }); await run(c, [r.id], 1200, 16);
    c.check((r.port(0).g?.O2 ?? 0) > 0, 'хүчилтөрөгч хураагдсангүй');
    const lit = (r.port(0).g?.O2 ?? 0) * 24000;
    r.set({ light: 0, chambers: r.get().chambers.map((x, i) => (i === 0 ? { ...x, g: {} } : x)) }); await run(c, [r.id], 600, 16);
    c.check(!((r.port(0).g?.O2 ?? 0) > 0), 'харанхуйд ч O₂ ялгарав');
    return `гэрэлд ${lit.toFixed(1)} мл O₂, харанхуйд 0`;
  },
  '8-25': async (c) => {
    const r = rig('exposureRack');
    load(c, r, 0, 'r:s_vaseline', 1); load(c, r, 1, 'r:s_vaseline', 1);
    start(c, r, { covers: [false, true, false, false, false, false, false, false, false] }); await run(c, [r.id], 1200, 16);
    c.check(s(r, 'dust') >= 0 && (r.port(0).s.dust ?? 0) > 0, 'ил вазелинд тоос наалдсангүй'); c.check(!((r.port(1).s.dust ?? 0) > 0), 'хучсан тавганд тоос наалдав');
  },
  '8-26': async (c) => {
    const jars = tubes(5);
    for (const t of jars) { pour(c, 'r:water', t, 10); pour(c, 'r:ui', t, 0.1); }
    c.check(Math.abs(ph(jars[0]) - 7) < 0.5, 'усны орчин саармаг биш');
    pour(c, 'r:soil_sandy', jars[1], 1); pour(c, 'r:motor_oil', jars[2], 2); pour(c, 'r:s_citric', jars[3], 0.3); pour(c, 'r:s_detergent', jars[4], 0.3);
    for (const t of jars) stir(t, 30);
    await run(c, jars.map((t) => t.id), 60, 4);
    c.check(ph(jars[3]) < 4, `нимбэгний хүчил pH ${ph(jars[3]).toFixed(1)}`); c.check(ph(jars[4]) > 8, `угаагч нунтаг pH ${ph(jars[4]).toFixed(1)}`);
    c.check(Math.abs(ph(jars[2]) - 7) < 0.6 && aq(jars[2], 'hexadecane') > 0, 'тос усанд уусав');
    c.check(solidMassG(m(jars[1])) > 0.5, 'хөрс алга');
    const [filtrate] = tubes(1); pourAll(c, jars[1], filtrate, find('funnel'));
    c.check(solidMassG(m(filtrate)) < 0.01, 'шүүгдэс булингартай');
    return `pH: ус ${ph(jars[0]).toFixed(1)}, хөрс ${ph(jars[1]).toFixed(1)}, тос ${ph(jars[2]).toFixed(1)}, нимбэг ${ph(jars[3]).toFixed(1)}, угаагч ${ph(jars[4]).toFixed(1)}`;
  },
  '8-27': async (c) => {
    const r = rig('soilBench');
    const grow = async (water: string) => {
      r.set({ chambers: r.get().chambers.map(() => ({ water: 0, ethanol: 0, aq: {}, s: {}, temp: 22, cloud: 0, fine: false, burning: false, foam: 0, from: [] })), running: false, data: {} });
      load(c, r, 0, `r:${water}`, 30); load(c, r, 0, 'r:s_barley', 2);
      start(c, r, { light: 1, port: 0, timeScale: 50 }); await run(c, [r.id], 4000, 16);
      return r.get().data.height ?? 0;
    };
    const tap = await grow('tap_water'), river = await grow('river_water'), dirty = await grow('dirty_water');
    c.check(tap > 0, 'цэвэр усаар соёолсонгүй'); c.check(dirty < tap, `бохир ус ${dirty} ≥ цэвэр ${tap}`);
    return `ургалт: крантны ${tap.toFixed(3)}, голын ${river.toFixed(3)}, бохир ${dirty.toFixed(3)}`;
  },
  '8-28': async (c) => {
    const r = rig('soilBench');
    load(c, r, 0, 'r:s_pebbles', 10); load(c, r, 0, 'r:s_gravel', 10); load(c, r, 0, 'r:s_sand', 10); load(c, r, 0, 'r:s_activated_carbon', 5); load(c, r, 0, 'r:dirty_water', 50);
    start(c, r, { operation: 'filter', port: 0 }); await run(c, [r.id], 600, 16);
    const out = r.port(2);
    c.check(liquidMl(out) > 5, 'шүүгдэс цугларсангүй'); c.check(solidMassG(out) < 0.05, 'шүүгдэс тунгалаг биш');
    c.check((out.aq.soap ?? 0) / (liquidMl(out) / 1000) < 0.005, 'нүүрс савангийн бохирдлыг шингээсэнгүй');
    return `${liquidMl(out).toFixed(0)} мл тунгалаг шүүгдэс`;
  },
  '8-30': async (c) => {
    const r = rig('gasTrain');
    load(c, r, 0, 'r:s_tobacco', 1); load(c, r, 2, 'r:water', 50);
    start(c, r, { heating: true }); await run(c, [r.id], 600, 8);
    c.check((r.port(2).s.tar ?? 0) > 0, 'усанд давирхай үлдсэнгүй'); c.check((phOf(r.port(2)) ?? 7) < 6.5, `утаа шингээсэн усны pH ${(phOf(r.port(2)) ?? 7).toFixed(1)}`);
    return `ус pH ${(phOf(r.port(2)) ?? 7).toFixed(1)}, давирхай ${((r.port(2).s.tar ?? 0) * 1000).toFixed(1)} мг`;
  },
  '9-21': async (c) => {
    const tube = find('testTube');
    pour(c, 'r:cuso4', tube, 5); pour(c, 'r:s_iron_nails', tube, 1);
    await run(c, [tube.id], 120, 4, () => s(tube, 'Cu') > 1e-4);
    c.check(s(tube, 'Cu') > 0 && aq(tube, 'Fe2') > 0, 'хадаас зэсээр бүрхэгдсэнгүй');
  },
  '10-05': async (c) => {
    const beaker = find('beaker');
    pour(c, 'r:water', beaker, 20); pour(c, 'r:s_kno3', beaker, 15); stir(beaker, 120);
    const heater = await heatOnTripod(c, beaker);
    await run(c, [beaker.id], 400, 8, () => m(beaker).temp >= 80 && s(beaker, 'KNO3') < 0.01);
    heaterOff(heater);
    c.check(s(beaker, 'KNO3') < 0.01, `халуун усанд KNO₃ бүрэн уусаагүй (${m(beaker).temp.toFixed(0)} °C)`);
    await run(c, [beaker.id], 900, 16, () => m(beaker).temp < 25);
    c.check(s(beaker, 'KNO3') > 0.05, `хөргөхөд талст үүссэнгүй (${m(beaker).temp.toFixed(0)} °C)`);
    return `${(s(beaker, 'KNO3') * 101.1).toFixed(1)} г KNO₃ талст`;
  },
  '10-09': async (c) => {
    const [a, b, d] = tubes(3);
    for (const t of [a, b, d]) pour(c, 'r:unknown_salt', t, 2);
    pour(c, 'r:naoh', a, 2); pour(c, 'r:bacl2', b, 2); pour(c, 'r:agno3', d, 1);
    await run(c, [a.id, b.id, d.id], 10, 2);
    c.check(s(a, 'FeOH2') + s(a, 'FeOH3') > 0, 'NaOH: тунадас алга'); c.check(s(b, 'BaSO4') > 0, 'BaCl₂: тунадас алга'); c.check(!(s(d, 'AgCl') > 0), 'AgNO₃: хлорид илэрлээ');
    return 'Fe²⁺ (ногоон тунадас) ба SO₄²⁻ (цагаан BaSO₄) илэрлээ';
  },
  '10-10': async (c) => {
    const [h2, o2, nh3] = tubes(3);
    pour(c, 'r:hcl', h2, 10); pour(c, 'r:s_mg', h2, 0.1);
    await run(c, [h2.id], 30, 2, () => s(h2, 'Mg') < 1e-6);
    c.check(aq(h2, 'Mg') > 0.003, 'Mg + HCl: устөрөгч ялгарсангүй');
    pour(c, 'r:h2o2', o2, 10); pour(c, 'r:s_mno2', o2, 0.1);
    await run(c, [o2.id], 30, 2); c.check(aq(o2, 'H2O2') < 0.005, 'H₂O₂ задарч O₂ ялгарсангүй');
    // Marble and acid in the flask, the delivery tube bubbling into limewater: milky first.
    const r = rig('gasTrain'); load(c, r, 0, 'r:s_caco3', 0.5); load(c, r, 1, 'r:hcl', 10); load(c, r, 2, 'r:limewater', 20);
    let milky = 0;
    start(c, r); await run(c, [r.id], 120, 2, () => { milky = Math.max(milky, r.port(2).s.CaCO3 ?? 0); return false; });
    c.check(milky > 0, 'CO₂ шохойн усыг булингартуулсангүй');
    pour(c, 'r:nh3', nh3, 2); pour(c, 'r:s_litmus_red', nh3, 0.01);
    c.check(ph(nh3) > 9, 'NH₃ улаан лакмусыг хөх болгосонгүй');
    return `шохойн усанд CaCO₃ хамгийн ихдээ ${(milky * 100.1 * 1000).toFixed(1)} мг, эцэст ${((r.port(2).s.CaCO3 ?? 0) * 100.1 * 1000).toFixed(1)} мг`;
  },
  '10-17': async (c) => {
    const r = rig('conductivityTester');
    const reading = async (from: string) => {
      r.set({ chambers: r.get().chambers.map(() => ({ water: 0, ethanol: 0, aq: {}, s: {}, temp: 22, cloud: 0, fine: false, burning: false, foam: 0, from: [] })), running: false, extent: 0 });
      load(c, r, 0, from, 20); start(c, r); await run(c, [r.id], 4, 1);
      return r.get().extent;
    };
    const nacl = await reading('r:nacl'), acid = await reading('r:h2so4'), water = await reading('r:water'), sugar = await reading('r:sugar_solution');
    c.check(nacl > 0.5 && acid > 0.5, `давс ${nacl}, хүчил ${acid} дамжуулсангүй`); c.check(water === 0 && sugar === 0, `нэрмэл ус ${water}, сахар ${sugar} дамжуулав`);
    return `чийдэн: NaCl ✓, H₂SO₄ ✓, нэрмэл ус ✗, сахар ✗`;
  },
  '10-20': async (c) => {
    const r = rig('electrolysisCell');
    load(c, r, 0, 'r:s_pbbr2', 3); load(c, r, 1, 'r:s_graphite', 1); load(c, r, 2, 'r:s_graphite', 1);
    start(c, r, { current: 0.5, heating: true, targetTemperature: 390 }); await run(c, [r.id], 300);
    c.check((r.port(1).s.Pb ?? 0) > 0 && (r.port(2).aq.Br2 ?? 0) > 0, 'хайлмалаас Pb, Br₂ ялгарсангүй');
  },
  '10-21': async (c) => {
    const r = rig('electrolysisCell');
    load(c, r, 0, 'r:hcl', 50); load(c, r, 1, 'r:s_graphite', 1); load(c, r, 2, 'r:s_graphite', 1);
    start(c, r, { current: 0.5 }); await run(c, [r.id], 120);
    c.check((r.port(1).g?.H2 ?? 0) > 0 && (r.port(0).aq.Cl2 ?? 0) > 0, 'H₂, Cl₂ ялгарсангүй');
  },
  '10-23': async (c) => {
    const [cold, steam] = tubes(2); pour(c, 'r:water', cold, 15); pour(c, 'r:s_mg', cold, 0.1);
    await run(c, [cold.id], 60, 4);
    pour(c, 'r:water', steam, 2); pour(c, 'r:s_mineral_wool', steam, 0.5); pour(c, 'r:s_mg', steam, 0.1);
    const heater = holdInFlame(steam, 120); await run(c, [steam.id], 240, 4, () => s(steam, 'MgO') > 5e-4); heaterOff(heater); heldHeat.id = null;
    c.check(s(steam, 'MgO') > 0, `уурт MgO үүссэнгүй (${m(steam).temp.toFixed(0)} °C, ус ${m(steam).water.toFixed(2)} мл)`);
    c.check(s(steam, 'MgO') > 10 * (aq(cold, 'Mg')), 'хүйтэн ус ууртай адил хурдан');
    return `хүйтэн усанд Mg²⁺ ${(aq(cold, 'Mg') * 1e6).toFixed(1)} мкмоль, уурт MgO ${(s(steam, 'MgO') * 1e6).toFixed(0)} мкмоль`;
  },
  '10-24': async (c) => {
    const r = rig('combustionFurnace');
    load(c, r, 0, 'r:s_cuo', 1); load(c, r, 1, 'r:gas_h2', 500);
    start(c, r, { heating: true, targetTemperature: 300 }); await run(c, [r.id], 300);
    c.check((r.port(0).s.Cu ?? 0) > 0, 'зэс ангижирсангүй');
  },
  '10-27': async (c) => {
    const sets = tubes(3), salts = ['cuso4', 'cdso4', 'pbno3'], sulfides = ['CuS', 'CdS', 'PbS'];
    sets.forEach((t, i) => { pour(c, 'r:hcl', t, 10); pour(c, `r:${salts[i]}`, t, 5); pour(c, 'r:s_fes', t, 0.5); });
    await run(c, sets.map((t) => t.id), 60, 4);
    sets.forEach((t, i) => c.check(s(t, sulfides[i]) > 0, `${sulfides[i]} тунадас алга`));
  },
  '10-29': async (c) => {
    const beaker = find('beaker'); pour(c, 'r:s_sugar', beaker, 5); pour(c, 'r:h2so4_conc', beaker, 10);
    await run(c, [beaker.id], 60, 4, () => s(beaker, 'C') > 0.05);
    c.check(s(beaker, 'C') > 0, 'сахар нүүрсжсэнгүй');
  },
  '10-35': async (c) => {
    const r = rig('crackingTube');
    load(c, r, 0, 'r:s_wax', 2); load(c, r, 0, 'r:s_mineral_wool', 0.5); load(c, r, 0, 'r:s_alumina', 1); load(c, r, 2, 'r:bromine', 10);
    const before = r.port(2).aq.Br2 ?? 0;
    start(c, r, { heating: true, targetTemperature: 550 }); await run(c, [r.id], 600);
    c.check((r.port(2).aq.Br2 ?? 0) < before * 0.5, 'бромын ус өнгөө алдсангүй');
  },
  '10-40': async (c) => {
    const [a, b] = tubes(2);
    pour(c, 'r:hcl', a, 10); pour(c, 'r:acetic', b, 10); pour(c, 'r:s_mg', a, 0.05); pour(c, 'r:s_mg', b, 0.05);
    await run(c, [a.id, b.id], 10, 1);
    const ra = aq(a, 'Mg'), rb = aq(b, 'Mg');
    c.check(rb > 0 && ra > 2 * rb, `HCl ${ra} ба цууны хүчил ${rb}`);
    return `10 с-д ууссан Mg: HCl ${(ra * 1e3).toFixed(2)} ммоль, CH₃COOH ${(rb * 1e3).toFixed(2)} ммоль`;
  },
  '10-42': async (c) => {
    const tube = find('testTube'); pour(c, 'r:h2so4', tube, 5); pour(c, 'r:kmno4', tube, 5); pour(c, 'r:ethanol', tube, 1);
    const before = aq(tube, 'MnO4');
    // Warm it gently (in and out of the flame, 60–75 °C) — boiling it dry would drive everything off.
    let heater = '';
    await run(c, [tube.id], 180, 4, () => { const t = m(tube).temp; if (t < 60) heater = holdInFlame(tube, 2); else if (t > 75) heldHeat.id = null; return aq(tube, 'MnO4') < before * 0.2; });
    heldHeat.id = null; if (heater) heaterOff(heater);
    c.check(aq(tube, 'Ac') > 0 && aq(tube, 'MnO4') < before, `этаны хүчил үүссэнгүй (${m(tube).temp.toFixed(0)} °C, MnO₄⁻ ${aq(tube, 'MnO4').toExponential(2)}/${before.toExponential(2)}, этанол ${m(tube).ethanol.toFixed(2)} мл, ${liquidMl(m(tube)).toFixed(1)} мл)`); c.check(!m(tube).burning, 'хуруу шил дэх шингэн шатав');
  },
};
