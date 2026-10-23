/**
 * NaCl bench experiment (textbook Туршилт 1): carbonate + HCl → NaCl, filter, evaporate,
 * crystallise, dry, examine. One imperative three.js scene built in "station units"
 * (1 unit = 10 cm; the root group is scaled by STATION_SCALE), plus the step logic.
 *
 * The engine owns its meshes, particles and tween clock. It writes UI state to
 * `useNaClUI`; the DOM overlay (NaClHUD) calls back into it for buttons and holds.
 * Nothing here talks to the inventory, physics or other OpenLab stores.
 */
import {
  AdditiveBlending,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type Object3D,
  type PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { CHEM, LABEL_KEYS, NAMES, STEPS, type PartKey, type SubstanceId } from './data';
import { initialUI, useNaClUI, type NoteTone } from './store';

export const STATION_SCALE = 0.1;
export interface BenchVisual { volume: number; crystals: number; solid: number; color?: string | null }

type Ticker = (dt: number) => boolean;
type AskResult = { type: 'click'; key: PartKey; skipped?: boolean } | { type: 'button'; i: number } | { type: 'spit' } | { type: 'done' };
interface Waiter {
  keys: Set<PartKey>;
  res: (v: AskResult) => void;
  my: number;
}
interface CamPose {
  p: [number, number, number];
  t: [number, number, number];
}
export interface OrbitLike {
  target: Vector3;
  enabled: boolean;
}

const V3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const V2 = (x: number, y: number) => new Vector2(x, y);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const lin = (k: number) => k;
const FONT = 'Inter, system-ui, sans-serif';

/** A liquid whose height comes from a true volume (cm³) through the vessel's radius profile. */
class Liquid {
  readonly mesh: Mesh;
  readonly mat: MeshPhysicalMaterial;
  vol = 0;
  h = 0;
  private built = -1;
  private hide = false;
  private readonly tab: number[] = [0];
  private readonly k: number;
  private readonly dy: number;
  private readonly N = 260;
  constructor(
    private readonly rFn: (y: number) => number,
    private readonly hMax: number,
    readonly cap: number,
    readonly y0 = 0.012,
    private readonly seg = 2,
    color = 0xcfe6ff,
    opacity = 0.5,
  ) {
    this.dy = hMax / this.N;
    let v = 0;
    for (let i = 1; i <= this.N; i++) {
      const r = rFn((i - 0.5) * this.dy);
      v += Math.PI * r * r * this.dy;
      this.tab.push(v);
    }
    this.k = cap / v;
    this.mat = new MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.08, metalness: 0, depthWrite: false, envMapIntensity: 1.2 });
    this.mesh = new Mesh(new BufferGeometry(), this.mat);
    this.mesh.renderOrder = 1;
    this.mesh.position.y = y0;
    this.set(0, true);
  }
  heightFor(vol: number): number {
    const u = vol / this.k;
    const t = this.tab;
    if (u <= 0) return 0;
    if (u >= t[this.N]) return this.hMax;
    let lo = 0;
    let hi = this.N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (t[m] < u) lo = m;
      else hi = m;
    }
    return (lo + (u - t[lo]) / (t[hi] - t[lo])) * this.dy;
  }
  set(vol: number, force = false): void {
    vol = Math.max(0, vol);
    this.vol = vol;
    if (!force && Math.abs(vol - this.built) < this.cap * 0.0008) return;
    this.built = vol;
    const h = this.heightFor(vol);
    this.h = h;
    this.mesh.visible = !this.hide && h > 0.002;
    if (h <= 0.002) return;
    const pts = [V2(0, 0)];
    for (let i = 0; i <= this.seg; i++) {
      const y = (h * i) / this.seg;
      pts.push(V2(Math.max(0.002, this.rFn(y)), y));
    }
    pts.push(V2(0, h));
    this.mesh.geometry.dispose();
    this.mesh.geometry = new LatheGeometry(pts, 44);
  }
  setHidden(b: boolean): void {
    this.hide = b;
    this.mesh.visible = !b && this.h > 0.002;
  }
  get top(): number {
    return this.y0 + this.h;
  }
}

interface Pourable {
  holder: Group;
  body: Group;
  rest: Vector3;
  base: Vector3;
  liq: Liquid;
  lipY: number;
}

export function createNaClEngine() {
  const root = new Group();
  root.name = 'nacl-station';
  root.scale.setScalar(STATION_SCALE);

  /* ================= materials ================= */
  const M = {
    glass: new MeshPhysicalMaterial({ color: 0xf2fbff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.03, side: DoubleSide, depthWrite: false, envMapIntensity: 1.6 }),
    rim: new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 1.5 }),
    steel: new MeshStandardMaterial({ color: 0xc2c8cc, metalness: 0.9, roughness: 0.28 }),
    dark: new MeshStandardMaterial({ color: 0x2b3134, metalness: 0.5, roughness: 0.45 }),
    enamel: new MeshStandardMaterial({ color: 0xecebe6, metalness: 0.05, roughness: 0.38 }),
    porcelain: new MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.3, side: DoubleSide }),
    paper: new MeshStandardMaterial({ color: 0xf0efe6, roughness: 0.95, side: DoubleSide }),
    powder: new MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    crystal: new MeshPhysicalMaterial({ color: 0xeef6fa, roughness: 0.1, transparent: true, opacity: 0.9, clearcoat: 1, envMapIntensity: 1.6 }),
    crystalP: new MeshPhysicalMaterial({ color: 0xdde9f0, roughness: 0.05, transparent: true, opacity: 0.78, clearcoat: 1, envMapIntensity: 1.6 }),
    wick: new MeshStandardMaterial({ color: 0xf2efe6, roughness: 1 }),
    proxy: new MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 }),
  };
  const COL = { acid: 0xcfe6ff, milky: 0xe9eef1, salt: 0xd6ebff };

  function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): CanvasTexture {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (g) draw(g, w, h);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  function lathe(points: [number, number][], mat: Material, seg = 56): Mesh {
    return new Mesh(new LatheGeometry(points.map((p) => V2(p[0], p[1])), seg), mat);
  }
  /** Glass vessel from a profile; a flat base disc replaces the lathe's axis fan (which shades as a star). */
  function glassMesh(points: [number, number][]): Object3D {
    if (points[0][0] !== 0 || points.length < 3) {
      const m = lathe(points, M.glass);
      m.renderOrder = 3;
      return m;
    }
    const g = new Group();
    const wall = lathe(points.slice(1), M.glass);
    wall.renderOrder = 3;
    const base = new Mesh(new CircleGeometry(points[1][0], 48), M.glass);
    base.rotation.x = -Math.PI / 2;
    base.position.y = points[0][1] + 0.001;
    base.renderOrder = 3;
    g.add(wall, base);
    return g;
  }
  function rimRing(r: number, y: number, t = 0.009): Mesh {
    const m = new Mesh(new TorusGeometry(r, t, 8, 56), M.rim);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    m.renderOrder = 4;
    return m;
  }
  const box = (w: number, h: number, d: number, mat: Material) => new Mesh(new BoxGeometry(w, h, d), mat);
  const cyl = (rt: number, rb: number, h: number, mat: Material, seg = 24) => new Mesh(new CylinderGeometry(rt, rb, h, seg), mat);

  /** A printed graduation band on the outside of a lathe vessel. Y(y) maps a height to a canvas row. */
  function gradStrip(parent: Object3D, rFn: (y: number) => number, yA: number, yB: number, phiLen: number, W: number, H: number, draw: (g: CanvasRenderingContext2D, Y: (y: number) => number) => void): void {
    const pts: Vector2[] = [];
    for (let i = 0; i <= 48; i++) {
      const y = yA + ((yB - yA) * i) / 48;
      pts.push(V2(rFn(y) + 0.0028, y));
    }
    const geo = new LatheGeometry(pts, 32, -phiLen / 2, phiLen);
    const tex = canvasTex(W, H, (g) => draw(g, (y) => (1 - (y - yA) / (yB - yA)) * H));
    const m = new Mesh(geo, new MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, depthWrite: false, toneMapped: false }));
    m.userData.noOutline = true;
    m.renderOrder = 4;
    parent.add(m);
  }
  const INK = '#173a86';
  function tick(g: CanvasRenderingContext2D, x: number, y: number, len: number, lw: number): void {
    g.lineCap = 'butt';
    g.strokeStyle = 'rgba(255,255,255,.75)';
    g.lineWidth = lw + 5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
  }
  function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, align: CanvasTextAlign = 'left', weight = 700): void {
    g.font = `${weight} ${size}px ${FONT}`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = Math.max(5, size * 0.16);
    g.strokeText(s, x, y);
    g.fillStyle = INK;
    g.fillText(s, x, y);
  }
  function labelTex(main: string, sub: string, hazard: string): CanvasTexture {
    return canvasTex(512, 300, (g, w) => {
      g.fillStyle = '#fbfaf4';
      g.fillRect(0, 0, w, 300);
      g.fillStyle = '#1e4db5';
      g.fillRect(0, 0, w, 26);
      g.fillStyle = '#15212a';
      g.textAlign = 'center';
      g.font = `700 88px ${FONT}`;
      g.fillText(main, w / 2, 140);
      g.font = `500 40px ${FONT}`;
      g.fillStyle = '#566570';
      g.fillText(sub, w / 2, 214);
      if (hazard) {
        g.fillStyle = '#c9661a';
        g.font = `700 32px ${FONT}`;
        g.fillText(hazard, w / 2, 272);
      }
    });
  }
  function pourable(body: Group, lip: [number, number], base: [number, number, number], liq: Liquid): Pourable {
    const holder = new Group();
    body.position.set(-lip[0], -lip[1], 0);
    holder.add(body);
    const rest = V3(base[0] + lip[0], base[1] + lip[1], base[2]);
    holder.position.copy(rest);
    root.add(holder);
    return { holder, body, rest, base: V3(...base), liq, lipY: lip[1] };
  }

  const BZ = 0.2;
  const BX = -3.0;
  const CX = -3.9;
  const FX = -0.8;
  const DX = 1.6;
  const PX = 3.35;
  const MX = 4.55;

  /* ---- measuring cylinder (100 cm³, 1 cm³ divisions) ---- */
  const cylBody = new Group();
  {
    const foot = cyl(0.21, 0.23, 0.04, M.glass, 6);
    foot.position.y = 0.02;
    foot.renderOrder = 3;
    cylBody.add(foot);
    cylBody.add(glassMesh([[0, 0.04], [0.1, 0.04], [0.11, 0.06], [0.11, 1.42], [0.128, 1.445]]));
    cylBody.add(rimRing(0.112, 1.43, 0.007));
    gradStrip(cylBody, () => 0.11, 0.035, 1.415, 1.7, 512, 4096, (g, Y) => {
      for (let v = 0; v <= 100; v++) {
        const y = Y(0.05 + (1.3 * v) / 100);
        tick(g, 110, y, v % 10 === 0 ? 200 : v % 5 === 0 ? 140 : 90, v % 10 === 0 ? 6 : 4);
        if (v % 10 === 0 && v > 0) txt(g, String(v), 330, y - 2, 66);
      }
      g.save();
      g.translate(60, Y(0.36));
      g.rotate(-Math.PI / 2);
      txt(g, '100 см³ · 20 °C · ±0.5', 0, 0, 40, 'center', 600);
      g.restore();
      txt(g, 'см³', 330, Y(1.395), 44, 'left', 600);
    });
  }
  const cylLiq = new Liquid(() => 0.103, 1.3, 100, 0.05, 2, COL.acid);
  cylBody.add(cylLiq.mesh);
  const CYL = pourable(cylBody, [0.128, 1.445], [CX, 0, BZ], cylLiq);

  /* ---- beaker 150 cm³ with a foam layer for the fizzing ---- */
  const beakBody = new Group();
  beakBody.add(glassMesh([[0, 0], [0.3, 0], [0.32, 0.02], [0.32, 0.85], [0.336, 0.87]]));
  beakBody.add(rimRing(0.326, 0.858));
  gradStrip(beakBody, () => 0.32, 0.02, 0.865, 1.05, 768, 2048, (g, Y) => {
    for (let v = 25; v <= 150; v += 25) {
      const y = Y(0.012 + (0.84 * v) / 150);
      const big = v % 50 === 0;
      tick(g, 230, y, big ? 230 : 140, big ? 7 : 5);
      if (big) txt(g, String(v), 490, y - 2, 74);
    }
    txt(g, '150 мл', 230, Y(0.14), 70);
    txt(g, 'ойролцоо ±5%', 230, Y(0.085), 40, 'left', 600);
  });
  const beakLiq = new Liquid(() => 0.31, 0.84, 150, 0.012, 2, COL.acid);
  beakBody.add(beakLiq.mesh);
  const foamMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.7, depthWrite: false });
  const foam = new Mesh(new CylinderGeometry(0.305, 0.305, 1, 40), foamMat);
  foam.geometry.translate(0, 0.5, 0);
  foam.visible = false;
  foam.renderOrder = 2;
  beakBody.add(foam);
  const beakResidue = new Group();
  beakBody.add(beakResidue);
  for (let i = 0; i < 34; i++) {
    const s = rnd(0.008, 0.018);
    const m = new Mesh(new BoxGeometry(s, s * 0.7, s), M.powder);
    const a = rnd(0, 6.28);
    const r = Math.sqrt(Math.random()) * 0.2;
    m.position.set(Math.cos(a) * r, 0.016 + s * 0.3, Math.sin(a) * r);
    m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    beakResidue.add(m);
  }
  const BEAK = pourable(beakBody, [0.336, 0.87], [BX, 0, BZ], beakLiq);

  /* ---- acid bottle and carbonate jar ---- */
  const botBody = new Group();
  botBody.add(glassMesh([[0, 0], [0.17, 0], [0.18, 0.02], [0.18, 0.5], [0.08, 0.62], [0.07, 0.7]]));
  const botLiq = new Liquid(() => 0.17, 0.42, 1, 0.012, 2, COL.acid, 0.45);
  botLiq.set(1, true);
  botBody.add(botLiq.mesh);
  const stopper = cyl(0.075, 0.065, 0.08, M.dark);
  stopper.position.y = 0.73;
  botBody.add(stopper);
  {
    const lb = new Mesh(new PlaneGeometry(0.22, 0.13), new MeshStandardMaterial({ map: labelTex('HCl (у)', '1.0 моль/дм³', '⚠ ЦОЧРООГЧ'), roughness: 0.8 }));
    lb.position.set(0, 0.27, 0.183);
    botBody.add(lb);
  }
  const BOT = pourable(botBody, [-0.07, 0.7], [-3.6, 0, -0.75], botLiq);
  const jar = new Group();
  jar.position.set(-2.5, 0, -0.6);
  root.add(jar);
  jar.add(glassMesh([[0, 0], [0.18, 0], [0.19, 0.02], [0.19, 0.38], [0.15, 0.42], [0.15, 0.47]]));
  jar.add(rimRing(0.152, 0.465, 0.008));
  const jarPowder = cyl(0.178, 0.178, 1, M.powder, 32);
  jarPowder.geometry.translate(0, 0.5, 0);
  jarPowder.position.y = 0.01;
  jar.add(jarPowder);
  {
    const lb = new Mesh(new PlaneGeometry(0.22, 0.13), new MeshStandardMaterial({ map: labelTex('Na₂CO₃', 'натрийн карбонат', '⚠ НҮД ЦОЧРООГЧ'), roughness: 0.8 }));
    lb.position.set(0, 0.25, 0.193);
    jar.add(lb);
  }

  /* ---- spatula and glass rod ---- */
  const spat = new Group();
  root.add(spat);
  {
    const h = box(0.55, 0.012, 0.04, M.steel);
    h.position.x = 0.31;
    spat.add(h);
    const sc = new Mesh(new SphereGeometry(0.045, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel);
    sc.scale.set(1.2, 0.45, 0.9);
    sc.position.y = 0.006;
    spat.add(sc);
  }
  const spatLoad = new Mesh(new SphereGeometry(0.04, 12, 8), M.powder);
  spatLoad.scale.set(1.1, 0.45, 0.8);
  spatLoad.position.y = 0.012;
  spat.add(spatLoad);
  const SPAT_REST = V3(-2.3, 0.02, 0.62);
  const rod = new Group();
  root.add(rod);
  {
    const m = new Mesh(new CylinderGeometry(0.012, 0.012, 0.95, 10), new MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }));
    m.position.y = 0.475;
    m.renderOrder = 5;
    rod.add(m);
  }
  const ROD_REST = { p: V3(-3.65, 0.013, 1.0), ry: 0.1, rz: -Math.PI / 2 };

  /* ---- retort stand, funnel, flask, filter papers, waste ---- */
  const retortStand = new Group();
  root.add(retortStand);
  {
    const b = box(0.85, 0.04, 0.6, M.dark);
    b.position.set(FX - 0.25, 0.02, -0.15);
    retortStand.add(b);
    const r = cyl(0.02, 0.02, 2.0, M.steel, 12);
    r.position.set(FX - 0.5, 1.0, -0.32);
    retortStand.add(r);
    const ring = new Mesh(new TorusGeometry(0.28, 0.014, 8, 40), M.steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(FX, 1.58, BZ);
    retortStand.add(ring);
    const arm = box(0.035, 0.035, 0.54, M.steel);
    arm.position.set(FX - 0.5, 1.58, (BZ - 0.32) / 2);
    retortStand.add(arm);
    const arm2 = box(0.23, 0.03, 0.03, M.steel);
    arm2.position.set(FX - 0.39, 1.58, BZ);
    retortStand.add(arm2);
    const boss = box(0.07, 0.07, 0.07, M.dark);
    boss.position.set(FX - 0.5, 1.58, -0.32);
    retortStand.add(boss);
  }
  const funnel = new Group();
  funnel.position.set(FX, 0.78, BZ);
  root.add(funnel);
  funnel.add(glassMesh([[0.028, 0], [0.03, 0.5], [0.36, 0.92], [0.378, 0.94]]));
  funnel.add(rimRing(0.368, 0.93, 0.008));
  const funLiq = new Liquid((y) => Math.max(0.002, y * 0.8), 0.36, 40, 0.525, 6, COL.milky, 0.6);
  funnel.add(funLiq.mesh);
  const flaskR = (y: number) => (y < 0.6 ? 0.36 - 0.25 * (y / 0.6) : 0.11);
  const flaskBody = new Group();
  flaskBody.add(glassMesh([[0, 0], [0.34, 0], [0.36, 0.03], [0.11, 0.62], [0.11, 0.86], [0.126, 0.88]]));
  flaskBody.add(rimRing(0.116, 0.872, 0.008));
  const flaskLiq = new Liquid((y) => flaskR(y) * 0.95, 0.84, 260, 0.012, 8, COL.salt);
  flaskBody.add(flaskLiq.mesh);
  // Match the outer glass wall rather than the inner liquid profile.
  const flaskOuterR = (y: number) => y <= 0.03 ? 0.36 : 0.36 - 0.25 * (y - 0.03) / 0.59;
  gradStrip(flaskBody, flaskOuterR, 0.03, 0.58, 0.95, 512, 1024, (g, Y) => {
    for (const v of [50, 100, 150, 200]) {
      const y = 0.012 + flaskLiq.heightFor(v);
      if (y > 0.57) continue;
      tick(g, 150, Y(y), 150, 6);
      txt(g, String(v), 320, Y(y) - 2, 58);
    }
    txt(g, '250 мл', 256, Y(0.05), 50, 'center');
  });
  const FLASK = pourable(flaskBody, [0.126, 0.88], [FX, 0, BZ], flaskLiq);
  const STACK = V3(-1.65, 0, 1.15);
  const stackG = new Group();
  stackG.position.copy(STACK);
  root.add(stackG);
  for (let i = 0; i < 5; i++) {
    const d = cyl(0.5, 0.5, 0.004, M.paper, 48);
    d.position.y = 0.003 + i * 0.005;
    stackG.add(d);
  }
  const WASTE = V3(0.3, 0, -0.75);
  const wasteBody = new Group();
  wasteBody.position.copy(WASTE);
  root.add(wasteBody);
  wasteBody.add(glassMesh([[0, 0], [0.26, 0], [0.28, 0.02], [0.28, 0.6], [0.295, 0.62]]));
  wasteBody.add(rimRing(0.286, 0.61));
  {
    const lb = new Mesh(new PlaneGeometry(0.24, 0.11), new MeshStandardMaterial({ map: labelTex('ХАЯГДАЛ', 'хэрэглэсэн цаас', ''), roughness: 0.8 }));
    lb.position.set(0, 0.3, 0.283);
    wasteBody.add(lb);
  }

  /* ---- tripod, gauze, spirit lamp, evaporating dish ---- */
  const tripodG = new Group();
  root.add(tripodG);
  {
    const ring = new Mesh(new TorusGeometry(0.4, 0.018, 8, 40), M.dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(DX, 0.95, BZ);
    tripodG.add(ring);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      const top = V3(DX + 0.4 * Math.cos(a), 0.95, BZ + 0.4 * Math.sin(a));
      const bot = V3(DX + 0.56 * Math.cos(a), 0, BZ + 0.56 * Math.sin(a));
      const leg = cyl(0.017, 0.017, top.distanceTo(bot), M.dark, 8);
      leg.position.copy(top).add(bot).multiplyScalar(0.5);
      leg.lookAt(top);
      leg.rotateX(Math.PI / 2);
      tripodG.add(leg);
    }
    const gtex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#4a5257';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#9aa3a8';
      g.lineWidth = 1.2;
      for (let i = 0; i < w; i += 6) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i, h);
        g.stroke();
        g.beginPath();
        g.moveTo(0, i);
        g.lineTo(w, i);
        g.stroke();
      }
      const gr = g.createRadialGradient(128, 128, 10, 128, 128, 70);
      gr.addColorStop(0, '#f1eee8');
      gr.addColorStop(0.85, '#e2ddd3');
      gr.addColorStop(1, 'rgba(226,221,211,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(128, 128, 72, 0, 7);
      g.fill();
    });
    const gauze = new Mesh(new BoxGeometry(0.95, 0.01, 0.95), [M.dark, M.dark, new MeshStandardMaterial({ map: gtex, roughness: 0.8, metalness: 0.2 }), M.dark, M.dark, M.dark]);
    gauze.position.set(DX, 0.966, BZ);
    tripodG.add(gauze);
  }
  const lamp = new Group();
  lamp.position.set(DX, 0, BZ);
  root.add(lamp);
  lamp.add(glassMesh([[0, 0], [0.19, 0], [0.23, 0.1], [0.21, 0.26], [0.09, 0.38], [0.07, 0.43]]));
  {
    const l = new Liquid((y) => (y < 0.1 ? 0.19 + 0.4 * y : 0.22 - 0.1 * (y - 0.1)), 0.2, 1, 0.012, 2, 0xf3f0ff, 0.35);
    l.set(1, true);
    lamp.add(l.mesh);
    const c = cyl(0.075, 0.075, 0.05, M.steel, 20);
    c.position.y = 0.455;
    lamp.add(c);
    const w = cyl(0.018, 0.02, 0.05, M.wick, 10);
    w.position.y = 0.505;
    lamp.add(w);
  }
  const flame = new Group();
  flame.position.y = 0.53;
  lamp.add(flame);
  const flOuter = new Mesh(new ConeGeometry(0.065, 0.36, 20, 1, true), new MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
  flOuter.geometry.translate(0, 0.18, 0);
  flame.add(flOuter);
  const flInner = new Mesh(new ConeGeometry(0.035, 0.12, 16, 1, true), new MeshBasicMaterial({ color: 0x5b8cff, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }));
  flInner.geometry.translate(0, 0.06, 0);
  flame.add(flInner);
  // A real point light at 1/10 scale: distance is in world meters after scaling.
  const flLight = new PointLight(0xff9a40, 0, 0.35, 2);
  flLight.position.y = 0.2;
  flame.add(flLight);
  let flameLevel = 0;
  const RS = 0.45;
  const DISH_D = 0.2;
  const dishR = (y: number) => Math.sqrt(Math.max(0, RS * RS - (RS - y) * (RS - y)));
  const dishBody = new Group();
  {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 18; i++) {
      const y = (DISH_D * i) / 18;
      pts.push([dishR(y), y]);
    }
    pts.push([dishR(DISH_D) + 0.035, DISH_D + 0.006]);
    dishBody.add(lathe(pts, M.porcelain, 56));
  }
  const dishLiq = new Liquid((y) => dishR(y) * 0.985, 0.19, 90, 0.004, 10, COL.salt, 0.55);
  dishBody.add(dishLiq.mesh);
  const rimCrys = new Group();
  const botCrys = new Group();
  dishBody.add(rimCrys, botCrys);
  const DISH = pourable(dishBody, [-(dishR(DISH_D) + 0.03), DISH_D + 0.006], [DX, 0.972, BZ], dishLiq);

  /* ---- crystals ---- */
  const cubeG = new BoxGeometry(1, 1, 1);
  function crys(group: Group, mat: Material, x: number, y: number, z: number, s: number): Mesh {
    const m = new Mesh(cubeG, mat);
    m.position.set(x, y + s * 0.45, z);
    m.rotation.set(rnd(-0.25, 0.25), rnd(0, 1.57), rnd(-0.25, 0.25));
    m.userData.s = s;
    m.scale.setScalar(s);
    group.add(m);
    return m;
  }
  {
    const h9 = dishLiq.heightFor(9);
    const rr = dishR(h9);
    for (let i = 0; i < 30; i++) {
      const a = rnd(0, 6.28);
      crys(rimCrys, M.crystal, Math.cos(a) * rr * 0.95, 0.004 + h9 - 0.01, Math.sin(a) * rr * 0.95, rnd(0.012, 0.024));
    }
    for (let i = 0; i < 46; i++) {
      const a = rnd(0, 6.28);
      const r = Math.sqrt(Math.random()) * rr * 0.8;
      crys(botCrys, M.crystal, Math.cos(a) * r, RS - Math.sqrt(RS * RS - r * r) + 0.002, Math.sin(a) * r, rnd(0.016, 0.036));
    }
  }

  /* ---- the working filter paper: folds into the funnel, unfolds on the watch glass, carrying its contents ---- */
  const paperG = new Group();
  root.add(paperG);
  const paperMesh = new Mesh(new BufferGeometry(), M.paper);
  paperG.add(paperMesh);
  const paperCrys = new Group();
  const paperRes = new Group();
  paperG.add(paperCrys, paperRes);
  for (let i = 0; i < 52; i++) {
    const s = rnd(0.018, 0.036);
    const m = new Mesh(cubeG, M.crystalP);
    m.userData = { s, t: rnd(0.07, 0.42), a: rnd(0, 6.28) };
    m.rotation.set(rnd(-0.3, 0.3), rnd(0, 1.57), rnd(-0.3, 0.3));
    m.scale.setScalar(s);
    paperCrys.add(m);
  }
  for (let i = 0; i < 30; i++) {
    const sz = rnd(0.008, 0.016);
    const m = new Mesh(new BoxGeometry(sz, sz * 0.7, sz), M.powder);
    m.userData = { s: 1, sz, t: rnd(0.05, 0.22), a: rnd(0, 6.28) };
    m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    paperRes.add(m);
  }
  let paperU = -1;
  function setPaperU(u: number, force = false): void {
    if (!force && Math.abs(u - paperU) < 0.002) return;
    paperU = u;
    const pts: Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const cr = 0.33 * t;
      const cy = 0.52 + 0.38 * t;
      const fr = 0.5 * t;
      pts.push(V2(cr + (fr - cr) * u, cy + (0.52 - cy) * u));
    }
    paperMesh.geometry.dispose();
    paperMesh.geometry = new LatheGeometry(pts, 44);
    const place = (m: Object3D, size: number) => {
      const d = m.userData as { t: number; a: number };
      const cr = 0.33 * d.t * 0.94;
      const cy = 0.52 + 0.38 * d.t + size * 0.55;
      const fr = 0.5 * d.t;
      const fy = 0.52 + size * 0.5;
      const r = cr + (fr - cr) * u;
      m.position.set(Math.cos(d.a) * r, cy + (fy - cy) * u, Math.sin(d.a) * r);
    };
    paperCrys.children.forEach((m) => place(m, m.userData.s as number));
    paperRes.children.forEach((m) => place(m, m.userData.sz as number));
  }
  const PAPER_AT = { stack: V3(STACK.x, 0.028 - 0.52, STACK.z), funnel: V3(FX, 0.78, BZ), glass: V3(PX, 0.05 - 0.52, 0.45) };

  /* ---- watch glass, slide, microscope ---- */
  const watch = new Group();
  watch.position.set(PX, 0, 0.45);
  root.add(watch);
  {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const r = (0.56 * i) / 10;
      pts.push([r, 0.008 + 0.045 * (r / 0.56) * (r / 0.56)]);
    }
    watch.add(glassMesh(pts));
  }
  const slide = new Group();
  const watchCrystals = new InstancedMesh(cubeG, M.crystal, 32);
  const crystalMatrix = new Matrix4();
  for (let i = 0; i < 32; i++) {
    const angle = i * 2.39996, radius = .42 * Math.sqrt((i + .5) / 32), size = .025 + (i % 3) * .006;
    crystalMatrix.makeScale(size, size, size).setPosition(Math.cos(angle) * radius, .025, Math.sin(angle) * radius);
    watchCrystals.setMatrixAt(i, crystalMatrix);
  }
  watchCrystals.count = 0; watchCrystals.frustumCulled = false;
  watch.add(watchCrystals);
  root.add(slide);
  {
    const g = new Mesh(new BoxGeometry(0.34, 0.008, 0.12), M.glass);
    g.renderOrder = 3;
    slide.add(g);
  }
  const slideCrys = new Group();
  slide.add(slideCrys);
  for (let i = 0; i < 7; i++) crys(slideCrys, M.crystal, rnd(-0.08, 0.08), 0.004, rnd(-0.03, 0.03), rnd(0.014, 0.022));
  const SLIDE_REST = V3(MX - 0.1, 0.008, 0.75);
  const scopeG = new Group();
  scopeG.position.set(MX, 0, -0.15);
  root.add(scopeG);
  const stageLight = new Mesh(new CircleGeometry(0.035, 24), new MeshBasicMaterial({ color: 0x777777 }));
  {
    const parts: [Mesh, [number, number, number], number?][] = [
      [box(0.46, 0.06, 0.6, M.enamel), [0, 0.03, 0]],
      [box(0.1, 0.66, 0.12, M.enamel), [0, 0.39, -0.22]],
      [box(0.085, 0.36, 0.09, M.enamel), [0, 0.83, -0.15], -0.45],
      [box(0.42, 0.03, 0.36, M.dark), [0, 0.46, 0.03]],
      [cyl(0.075, 0.075, 0.04, M.steel), [0, 0.68, 0.05]],
      [cyl(0.055, 0.055, 0.36, M.enamel), [0, 0.86, 0], -0.35],
      [cyl(0.035, 0.04, 0.12, M.dark), [0, 1.07, -0.08], -0.35],
    ];
    for (const [m, p, rx] of parts) {
      m.position.set(...p);
      if (rx) m.rotation.x = rx;
      scopeG.add(m);
    }
    for (let i = 0; i < 3; i++) {
      const o = cyl(0.022, 0.028, 0.11, M.steel, 12);
      o.position.set(Math.cos(i * 2.1) * 0.04, 0.61, 0.05 + Math.sin(i * 2.1) * 0.04);
      scopeG.add(o);
    }
    for (const s of [-1, 1]) {
      const k = cyl(0.06, 0.06, 0.04, M.dark);
      k.rotation.z = Math.PI / 2;
      k.position.set(s * 0.075, 0.56, -0.22);
      scopeG.add(k);
    }
    stageLight.rotation.x = -Math.PI / 2;
    stageLight.position.set(0, 0.4755, 0.05);
    scopeG.add(stageLight);
  }
  const STAGE_POS = V3(MX, 0.484, -0.1);

  /* ================= pick proxies and guide arrows ================= */
  const PROX: Mesh[] = [];
  const PKEY = {} as Record<PartKey, Mesh>;
  function proxy(key: PartKey, parent: Object3D, geo: BufferGeometry, pos: Vector3, top: number, when?: () => boolean): void {
    const m = new Mesh(geo, M.proxy);
    m.position.copy(pos);
    m.userData = { key, top, when };
    m.renderOrder = -1;
    parent.add(m);
    PROX.push(m);
    PKEY[key] = m;
  }
  const cG = (r: number, h: number) => new CylinderGeometry(r, r, h, 12);
  proxy('bottle', botBody, cG(0.21, 0.8), V3(0, 0.4, 0), 0.45);
  proxy('cyl', cylBody, cG(0.17, 1.5), V3(0, 0.75, 0), 0.8);
  proxy('beaker', beakBody, cG(0.36, 0.92), V3(0, 0.46, 0), 0.5);
  proxy('jar', jar, cG(0.22, 0.52), V3(0, 0.26, 0), 0.3);
  proxy('spat', spat, new BoxGeometry(0.66, 0.08, 0.12), V3(0.28, 0, 0), 0.06);
  proxy('rod', rod, cG(0.06, 0.98), V3(0, 0.49, 0), 0.52);
  proxy('stack', stackG, cG(0.52, 0.08), V3(0, 0.03, 0), 0.06);
  proxy('paper', paperG, cG(0.4, 0.45), V3(0, 0.72, 0), 0.25, () => paperU < 0.5);
  proxy('crystals', paperG, cG(0.5, 0.1), V3(0, 0.54, 0), 0.06, () => paperU > 0.5 && paperCrys.visible && paperG.position.x > 2);
  proxy('funnel', funnel, cG(0.4, 0.98), V3(0, 0.48, 0), 0.5);
  proxy('flask', flaskBody, cG(0.38, 0.9), V3(0, 0.45, 0), 0.5);
  proxy('dish', dishBody, cG(0.44, 0.26), V3(0, 0.12, 0), 0.15);
  proxy('lamp', lamp, cG(0.25, 0.6), V3(0, 0.3, 0), 0.62);
  proxy('tripod', tripodG, cG(0.5, 0.05), V3(DX, 0.94, BZ), 0.05);
  proxy('waste', wasteBody, cG(0.3, 0.64), V3(0, 0.32, 0), 0.34);
  proxy('watch', watch, cG(0.56, 0.06), V3(0, 0.03, 0), 0.05);
  proxy('slide', slide, new BoxGeometry(0.38, 0.06, 0.16), V3(0, 0.02, 0), 0.05);
  proxy('scope', scopeG, new BoxGeometry(0.5, 1.15, 0.62), V3(0, 0.57, -0.05), 0.6);

  function visibleChain(o: Object3D): boolean {
    for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  }
  function pickable(m: Mesh): boolean {
    const when = m.userData.when as (() => boolean) | undefined;
    return visibleChain(m) && (!when || when());
  }
  const arrowTex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#F5B800';
    g.strokeStyle = '#5a3a00';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(24, 30);
    g.lineTo(104, 30);
    g.lineTo(64, 104);
    g.closePath();
    g.fill();
    g.stroke();
  });
  const markers = [0, 1, 2].map(() => {
    const s = new Sprite(new SpriteMaterial({ map: arrowTex, depthTest: false, transparent: true }));
    s.renderOrder = 20;
    s.visible = false;
    root.add(s);
    return s;
  });
  let markerKeys: PartKey[] = [];
  function setMarkers(keys: PartKey[]): void {
    markerKeys = keys.slice(0, 3);
    markers.forEach((m, i) => (m.visible = !!markerKeys[i]));
  }

  /* ================= what is inside each object ================= */
  let curStep = 0;
  const S = {
    acid: 0,
    hcl: 0,
    carb: 0,
    co2: 0,
    temp: 20,
    clock: '',
    lost: 0,
    spit: false,
    overflow: false,
    extra: 0,
    early: 0,
  };
  const resetS = () => Object.assign(S, { acid: 0, hcl: 0, carb: 0, co2: 0, temp: 20, clock: '', lost: 0, spit: false, overflow: false, extra: 0, early: 0 });
  const paperHere = () => paperG.visible && paperU < 0.5 && paperG.position.x < 0;
  function contentOf(k: PartKey): SubstanceId | null {
    switch (k) {
      case 'bottle':
        return 'hcl';
      case 'cyl':
        return cylLiq.vol > 0.5 ? 'hcl' : null;
      case 'beaker':
        return beakLiq.vol > 0.5 ? (S.carb > 0 ? (S.hcl > 0.01 ? 'mixAcid' : 'mix') : 'hcl') : null;
      case 'jar':
        return 'na2co3';
      case 'spat':
        return spatLoad.visible ? (spatLoad.material === M.crystal ? 'crystals' : 'na2co3') : null;
      case 'funnel':
      case 'paper':
        if (funLiq.vol > 0.5) return curStep >= 5 ? 'liquor' : 'mix';
        if (paperHere() && paperCrys.visible) return 'crystals';
        if (paperHere() && paperRes.visible) return 'residue';
        return null;
      case 'flask':
        return flaskLiq.vol > 0.5 ? (curStep >= 5 ? 'liquor' : 'nacl') : null;
      case 'dish':
        return dishLiq.vol > 0.5 ? (rimCrys.visible || botCrys.visible ? 'naclConc' : 'nacl') : null;
      case 'watch':
      case 'crystals':
        return paperG.position.x > 2 && paperCrys.visible ? 'crystals' : null;
      case 'slide':
        return slideCrys.visible ? 'crystals' : null;
      case 'lamp':
        return 'ethanol';
      default:
        return null;
    }
  }
  const VOLOF: Partial<Record<PartKey, () => number>> = { cyl: () => cylLiq.vol, beaker: () => beakLiq.vol, funnel: () => funLiq.vol, flask: () => flaskLiq.vol, dish: () => dishLiq.vol };

  /* ================= particles ================= */
  function pool<T extends Object3D>(n: number, make: () => T): T[] {
    const arr: T[] = [];
    for (let i = 0; i < n; i++) {
      const m = make();
      m.visible = false;
      m.userData.on = false;
      root.add(m);
      arr.push(m);
    }
    return arr;
  }
  const sphG = new SphereGeometry(1, 8, 6);
  const bubbleMat = new MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0, clearcoat: 1, depthWrite: false });
  const bubbles = pool(170, () => {
    const m = new Mesh(sphG, bubbleMat);
    m.renderOrder = 2;
    return m;
  });
  const bits = pool(90, () => new Mesh<BoxGeometry, Material>(cubeG, M.powder));
  const dripMat = new MeshPhysicalMaterial({ color: COL.salt, transparent: true, opacity: 0.7, roughness: 0, depthWrite: false });
  const drips = pool(30, () => {
    const m = new Mesh(sphG, dripMat);
    m.renderOrder = 2;
    return m;
  });
  const steamTex = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
  const steams = pool(60, () => new Sprite(new SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })));
  const co2Tex = canvasTex(256, 128, (g) => {
    g.font = `700 70px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.lineWidth = 14;
    g.strokeText('CO₂↑', 128, 66);
    g.fillStyle = '#3c4a55';
    g.fillText('CO₂↑', 128, 66);
  });
  const co2s = pool(10, () => {
    const s = new Sprite(new SpriteMaterial({ map: co2Tex, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    s.renderOrder = 15;
    return s;
  });
  const streamMat = new MeshPhysicalMaterial({ color: COL.acid, transparent: true, opacity: 0.6, roughness: 0, depthWrite: false });
  const streamG = new CylinderGeometry(0.016, 0.011, 1, 10, 1, true);
  streamG.translate(0, -0.5, 0);
  const stream = new Mesh(streamG, streamMat);
  stream.visible = false;
  stream.renderOrder = 2;
  root.add(stream);
  const P = {
    fizz: 0,
    drip: 0,
    steam: 0,
    stir: 0,
    stirA: 0,
    stream: null as null | { from: () => Vector3; toY: () => number; w?: number },
    acc: { b: 0, d: 0, s: 0, c: 0 },
  };
  function grab<T extends Object3D>(arr: T[]): T | null {
    for (const m of arr)
      if (!m.userData.on) {
        m.userData.on = true;
        m.visible = true;
        return m;
      }
    return null;
  }
  function clearParticles(): void {
    for (const a of [bubbles, bits, drips, steams, co2s] as Object3D[][])
      for (const m of a) {
        m.userData.on = false;
        m.visible = false;
      }
    P.fizz = P.drip = P.steam = P.stir = 0;
    P.stream = null;
    stream.visible = false;
    foam.visible = false;
  }
  interface BitOpts {
    s0: number;
    s1: number;
    sp: number;
    vx: number;
    vy0: number;
    vy1: number;
    minY: number;
    delay?: number;
    flat?: number;
  }
  function emitBits(n: number, from: Vector3, mat: Material, o: BitOpts): void {
    for (let i = 0; i < n; i++) {
      const g = grab(bits);
      if (!g) return;
      g.material = mat;
      const s = rnd(o.s0, o.s1);
      g.scale.set(s, s * (o.flat ?? 1), s);
      g.position.set(from.x + rnd(-o.sp, o.sp), from.y, from.z + rnd(-o.sp, o.sp));
      g.userData.v = V3(rnd(-o.vx, o.vx), rnd(o.vy0, o.vy1), rnd(-o.vx, o.vx));
      g.userData.minY = o.minY;
      g.userData.delay = rnd(0, o.delay ?? 0);
      g.visible = false;
    }
  }
  const tmpA = V3(0, 0, 0);
  let freeFizz: { at: Vector3; top: number } | null = null;
  function updateParticles(dt: number): void {
    const bBase = freeFizz?.at ?? BEAK.holder.position.clone().sub(V3(0.336, 0.87, 0));
    const bTop = freeFizz?.top ?? beakLiq.top;
    P.acc.b += P.fizz * 170 * dt;
    while (P.acc.b >= 1) {
      P.acc.b -= 1;
      const m = grab(bubbles);
      if (!m) break;
      const a = rnd(0, 6.28);
      const r = Math.sqrt(Math.random()) * 0.27;
      m.position.set(bBase.x + Math.cos(a) * r, bBase.y + rnd(0.02, Math.max(0.03, bTop * 0.6)), bBase.z + Math.sin(a) * r);
      m.scale.setScalar(rnd(0.008, 0.02));
      m.userData.vy = rnd(0.2, 0.45);
    }
    for (const m of bubbles) {
      if (!m.userData.on) continue;
      m.userData.vy += dt * 0.8;
      m.position.y += m.userData.vy * dt;
      m.position.x += Math.sin(m.position.y * 40 + m.id) * 0.0015;
      if (m.position.y > bBase.y + bTop - 0.004) {
        m.userData.on = false;
        m.visible = false;
      }
    }
    foam.visible = P.fizz > 0.04 && !freeFizz;
    if (foam.visible) {
      foam.position.y = beakLiq.top - 0.004;
      foam.scale.y = 0.012 + 0.05 * P.fizz;
      foamMat.opacity = Math.min(0.85, 0.3 + P.fizz * 0.7);
    }
    P.acc.c += P.fizz * 2.6 * dt;
    while (P.acc.c >= 1) {
      P.acc.c -= 1;
      const s = grab(co2s);
      if (!s) break;
      s.position.set(bBase.x + rnd(-0.18, 0.18), bBase.y + bTop + 0.05, bBase.z + rnd(-0.1, 0.1));
      s.userData.life = 0;
      s.scale.set(0.2, 0.1, 1);
    }
    for (const s of co2s) {
      if (!s.userData.on) continue;
      s.userData.life += dt;
      const k = s.userData.life / 2.2;
      if (k >= 1) {
        s.userData.on = false;
        s.visible = false;
        continue;
      }
      s.position.y += dt * 0.32;
      s.material.opacity = Math.sin(Math.PI * k) * 0.95;
    }
    for (const g of bits) {
      if (!g.userData.on) continue;
      const u = g.userData;
      if (u.delay > 0) {
        u.delay -= dt;
        continue;
      }
      g.visible = true;
      (u.v as Vector3).y -= 6 * dt;
      g.position.addScaledVector(u.v as Vector3, dt);
      g.rotation.x += dt * 7;
      g.rotation.z += dt * 5;
      if (g.position.y < u.minY) {
        u.on = false;
        g.visible = false;
      }
    }
    P.acc.d += P.drip * 7 * dt;
    const fTop = FLASK.holder.position.y - 0.88 + flaskLiq.top;
    while (P.acc.d >= 1) {
      P.acc.d -= 1;
      const m = grab(drips);
      if (!m) break;
      m.position.set(FX, 0.77, BZ);
      m.scale.set(0.012, 0.016, 0.012);
      m.userData.vy = 0;
    }
    for (const m of drips) {
      if (!m.userData.on) continue;
      m.userData.vy -= 6 * dt;
      m.position.y += m.userData.vy * dt;
      if (m.position.y < fTop) {
        m.userData.on = false;
        m.visible = false;
      }
    }
    const surfR = dishR(dishLiq.h) * 0.8;
    const sy = DISH.holder.position.y - (DISH_D + 0.006) + dishLiq.top;
    P.acc.s += P.steam * 14 * dt;
    while (P.acc.s >= 1) {
      P.acc.s -= 1;
      const m = grab(steams);
      if (!m) break;
      const a = rnd(0, 6.28);
      const r = Math.sqrt(Math.random()) * surfR;
      const dishAt = root.worldToLocal(dishBody.getWorldPosition(new Vector3()));
      m.position.set(dishAt.x + Math.cos(a) * r, sy + 0.02, dishAt.z + Math.sin(a) * r);
      m.userData.life = 0;
      m.userData.max = rnd(2, 3.2);
      m.userData.vx = rnd(-0.05, 0.05);
    }
    for (const m of steams) {
      if (!m.userData.on) continue;
      const u = m.userData;
      u.life += dt;
      const k = u.life / u.max;
      if (k >= 1) {
        u.on = false;
        m.visible = false;
        continue;
      }
      m.position.y += dt * (0.28 + 0.15 * k);
      m.position.x += u.vx * dt;
      m.scale.setScalar(0.07 + 0.4 * k);
      m.material.opacity = 0.32 * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.3);
    }
    if (P.stir > 0) {
      P.stirA += dt * 6;
      rod.position.set(BX + 0.1 * Math.cos(P.stirA), 0.015, BZ + 0.1 * Math.sin(P.stirA));
      rod.rotation.set(0.17 * Math.sin(P.stirA), 0, -0.17 * Math.cos(P.stirA));
    }
    if (P.stream) {
      const a = P.stream.from();
      const bY = P.stream.toY();
      stream.visible = true;
      stream.position.copy(a);
      stream.scale.set(P.stream.w ?? 1, Math.max(0.01, a.y - bY), P.stream.w ?? 1);
    } else stream.visible = false;
  }

  /* ================= molecule-level view (2D canvas in the overlay) ================= */
  type RxType = 'H' | 'Cl' | 'Na' | 'CO3' | 'W' | 'CO2';
  const RXT: Record<RxType, { c: string; l: string; r: number }> = {
    H: { c: '#e5484d', l: 'H⁺', r: 11 },
    Cl: { c: '#2f9e5f', l: 'Cl⁻', r: 13 },
    Na: { c: '#8e4ec6', l: 'Na⁺', r: 12 },
    CO3: { c: '#44505a', l: 'CO₃²⁻', r: 18 },
    W: { c: '#3e8ed0', l: 'H₂O', r: 12 },
    CO2: { c: '#7d8a94', l: 'CO₂', r: 14 },
  };
  interface RxPart {
    type: RxType;
    x: number;
    y: number;
    vx: number;
    vy: number;
    st: 'free' | 'go' | 'gas' | 'lat' | 'react';
    tgt?: RxPart;
    pair?: RxPart[];
    arr?: boolean;
    dead?: boolean;
    lx?: number;
    ly?: number;
  }
  const RX = { mode: null as 'acid' | 'evap' | null, parts: [] as RxPart[], flash: [] as { x: number; y: number; t: number }[] };
  let rxCanvas: HTMLCanvasElement | null = null;
  const rxPart = (type: RxType, x: number, y: number): RxPart => {
    const p: RxPart = { type, x, y, vx: rnd(-25, 25), vy: rnd(-25, 25), st: 'free' };
    RX.parts.push(p);
    return p;
  };
  function rxShow(mode: 'acid' | 'evap' | null): void {
    RX.mode = mode;
    RX.parts = [];
    RX.flash = [];
    useNaClUI.setState({ rx: mode });
    if (mode === 'acid')
      for (let i = 0; i < 10; i++) {
        rxPart('H', rnd(60, 240), rnd(110, 250));
        rxPart('Cl', rnd(60, 240), rnd(110, 250));
      }
    if (mode === 'evap') {
      for (let i = 0; i < 6; i++) {
        rxPart('Na', rnd(60, 240), rnd(120, 250));
        rxPart('Cl', rnd(60, 240), rnd(120, 250));
      }
      for (let i = 0; i < 24; i++) rxPart('W', rnd(50, 250), rnd(110, 260));
    }
  }
  function rxAddCarbonate(): void {
    if (RX.mode !== 'acid') return;
    rxPart('CO3', 150 + rnd(-40, 40), 40).vy = 60;
    for (let i = 0; i < 2; i++) rxPart('Na', 150 + rnd(-50, 50), 40).vy = 50;
  }
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const rxSurf = () => (RX.mode === 'evap' ? 80 + (1 - Math.min(1, dishLiq.vol / 50)) * 120 : 80);
  function rxUpdate(dt: number): void {
    if (!RX.mode) return;
    const ps = RX.parts;
    const top = rxSurf();
    if (RX.mode === 'acid') {
      const target = Math.round(S.hcl / 5);
      const freeH = ps.filter((p) => p.type === 'H' && p.st === 'free');
      while (freeH.length > target && freeH.length >= 2) {
        let c = ps.find((p) => p.type === 'CO3' && p.st === 'free' && p.y > top);
        if (!c) c = rxPart('CO3', 150, top + 20);
        const co3 = c;
        co3.st = 'react';
        freeH.sort((a, b) => dist(a, co3) - dist(b, co3));
        const pair = freeH.splice(0, 2);
        pair.forEach((h) => {
          h.st = 'go';
          h.tgt = co3;
        });
        co3.pair = pair;
      }
    } else {
      const target = Math.round(24 * Math.min(1, dishLiq.vol / 50));
      const ws = ps.filter((p) => p.type === 'W' && p.st === 'free');
      for (let i = target; i < ws.length; i++) {
        ws[i].st = 'gas';
        ws[i].vy = -70;
      }
      if (dishLiq.vol < 10.5) {
        const na = ps.filter((p) => p.type === 'Na');
        const cl = ps.filter((p) => p.type === 'Cl');
        let iN = 0;
        let iC = 0;
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 4; c++) {
            const p = (r + c) % 2 === 0 ? na[iN++] : cl[iC++];
            if (!p) continue;
            p.st = 'lat';
            p.lx = 150 + (c - 1.5) * 27;
            p.ly = 248 + (r - 1) * 27;
          }
      }
    }
    for (const p of ps) {
      const R = RXT[p.type].r;
      if (p.st === 'go' && p.tgt) {
        const dx = p.tgt.x - p.x;
        const dy = p.tgt.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(d, 110 * dt);
        p.x += (dx / d) * sp;
        p.y += (dy / d) * sp;
        p.arr = d < 14;
      } else if (p.st === 'gas') {
        p.y += p.vy * dt;
        p.x += Math.sin(p.y * 0.08) * 0.6;
        if (p.y < -20) p.dead = true;
      } else if (p.st === 'lat') {
        p.x += ((p.lx ?? p.x) - p.x) * Math.min(1, dt * 2.5);
        p.y += ((p.ly ?? p.y) - p.y) * Math.min(1, dt * 2.5);
      } else {
        p.vx += rnd(-90, 90) * dt;
        p.vy += rnd(-90, 90) * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < top + R) {
          p.y = top + R;
          p.vy = Math.abs(p.vy) + 5;
        }
        const dx = p.x - 150;
        const dy = p.y - 150;
        const d = Math.hypot(dx, dy);
        const lim = 140 - R;
        if (d > lim) {
          p.x = 150 + (dx / d) * lim;
          p.y = 150 + (dy / d) * lim;
          p.vx *= -0.5;
          p.vy *= -0.5;
        }
      }
    }
    for (const c of ps) {
      if (c.type === 'CO3' && c.st === 'react' && c.pair && c.pair.every((h) => h.arr)) {
        c.dead = true;
        c.pair.forEach((h) => (h.dead = true));
        rxPart('W', c.x, c.y);
        const g = rxPart('CO2', c.x, c.y);
        g.st = 'gas';
        g.vy = -55;
        RX.flash.push({ x: c.x, y: c.y, t: 0 });
      }
    }
    RX.parts = ps.filter((p) => !p.dead);
    RX.flash.forEach((f) => (f.t += dt));
    RX.flash = RX.flash.filter((f) => f.t < 0.6);
  }
  function rxDraw(): void {
    if (!RX.mode || !rxCanvas) return;
    const g = rxCanvas.getContext('2d');
    if (!g) return;
    const top = rxSurf();
    g.clearRect(0, 0, 300, 300);
    g.save();
    g.beginPath();
    g.arc(150, 150, 146, 0, 7);
    g.clip();
    g.fillStyle = '#eef3f6';
    g.fillRect(0, 0, 300, 300);
    g.fillStyle = RX.mode === 'evap' ? '#d4ecfb' : '#d9e8ff';
    g.fillRect(0, top, 300, 300);
    g.strokeStyle = '#7fa8d8';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, top);
    g.lineTo(300, top);
    g.stroke();
    g.fillStyle = '#6a7a86';
    g.font = `600 11px ${FONT}`;
    g.textAlign = 'left';
    g.fillText(RX.mode === 'evap' ? 'агаар' : 'агаар (CO₂ гарна)', 40, top - 8);
    if (RX.mode === 'evap' && dishLiq.vol < 10.5) {
      g.fillStyle = '#1e4db5';
      g.font = `700 12px ${FONT}`;
      g.textAlign = 'center';
      g.fillText('ханасан → талст тор', 150, 290);
    }
    for (const f of RX.flash) {
      g.strokeStyle = `rgba(245,184,0,${1 - f.t / 0.6})`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(f.x, f.y, 10 + f.t * 50, 0, 7);
      g.stroke();
    }
    for (const p of RX.parts) {
      const T = RXT[p.type];
      g.fillStyle = T.c;
      g.beginPath();
      g.arc(p.x, p.y, T.r, 0, 7);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `700 ${T.r > 15 ? 9 : 10}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(T.l, p.x, p.y + 0.5);
      if (p.type === 'CO3' && p.st === 'free' && S.hcl <= 0.01 && RX.mode === 'acid') {
        g.fillStyle = '#44505a';
        g.font = `600 9px ${FONT}`;
        g.fillText('илүүдэл', p.x, p.y + T.r + 8);
      }
    }
    g.restore();
    g.strokeStyle = '#9fb0bb';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(150, 150, 146, 0, 7);
    g.stroke();
  }

  /* ================= engine: tweens, processes, asks, holds ================= */
  let token = 0;
  let tickers: Ticker[] = [];
  let active = false;
  let camera: PerspectiveCamera | null = null;
  let controls: OrbitLike | null = null;
  function tween(dur: number, fn: (k: number) => void, e: (k: number) => number = ease): Promise<void> {
    const my = token;
    return new Promise((res) => {
      if (my !== token) return;
      let t = 0;
      tickers.push((dt) => {
        if (my !== token) return true;
        t += dt;
        const k = Math.min(1, t / Math.max(0.001, dur));
        fn(e(k));
        if (k >= 1) {
          res();
          return true;
        }
        return false;
      });
    });
  }
  function until(cond: () => boolean): Promise<void> {
    const my = token;
    return new Promise((res) => {
      if (my !== token) return;
      tickers.push(() => {
        if (my !== token) return true;
        if (cond()) {
          res();
          return true;
        }
        return false;
      });
    });
  }
  function proc(fn: (dt: number) => boolean | void): void {
    const my = token;
    tickers.push((dt) => (my !== token ? true : fn(dt) === true));
  }
  const all = (a: Promise<unknown>[]) => Promise.all(a);
  function moveH(p: Pourable, to: Vector3, rz: number | null, dur: number): Promise<void> {
    const s = p.holder.position.clone();
    const r0 = p.holder.rotation.z;
    return tween(dur, (k) => {
      p.holder.position.lerpVectors(s, to, k);
      if (rz !== null) p.holder.rotation.z = r0 + (rz - r0) * k;
    });
  }
  function moveObj(o: Object3D, to: Vector3, rot: { x?: number; y?: number; z?: number } | null, dur: number, arc = 0): Promise<void> {
    const s = o.position.clone();
    const r0 = o.rotation.clone();
    return tween(dur, (k) => {
      o.position.lerpVectors(s, to, k);
      if (arc) o.position.y += Math.sin(Math.PI * k) * arc;
      if (rot) {
        o.rotation.x = r0.x + ((rot.x ?? r0.x) - r0.x) * k;
        o.rotation.y = r0.y + ((rot.y ?? r0.y) - r0.y) * k;
        o.rotation.z = r0.z + ((rot.z ?? r0.z) - r0.z) * k;
      }
    });
  }
  function scaleKids(group: Group, k: number, invert = false, lag = 0.6, offset = 0): void {
    const kids = group.children;
    kids.forEach((m, i) => {
      const kk = Math.min(1, Math.max(0, k * 1.6 - (i / kids.length) * lag - offset));
      const v = invert ? 1 - kk : kk;
      m.scale.setScalar(((m.userData.s as number) ?? 1) * Math.max(0.0001, v));
    });
  }
  function setGroup(group: Group, on: boolean): void {
    group.visible = on;
    group.children.forEach((m) => m.scale.setScalar((m.userData.s as number) ?? 1));
  }
  function setFlame(v: number): void {
    flameLevel = v;
    flame.visible = v > 0.01;
  }
  function setWet(w: number): void {
    M.crystalP.color.setRGB(0.72 + 0.28 * (1 - w), 0.8 + 0.2 * (1 - w), 0.86 + 0.14 * (1 - w));
    M.crystalP.opacity = 0.7 + 0.28 * (1 - w);
    M.crystalP.roughness = 0.05 + 0.4 * (1 - w);
    M.crystalP.clearcoat = 0.3 + 0.7 * w;
  }

  /* camera poses in station units, converted to world space on use */
  const CAMS: Record<string, CamPose> = {
    over: { p: [0.4, 3.6, 8.2], t: [0.3, 0.75, 0] },
    A: { p: [-3.1, 2.0, 3.1], t: [-3.4, 0.8, 0.0] },
    cylRead: { p: [CX, 0.7, BZ + 0.62], t: [CX, 0.7, BZ] },
    Aclose: { p: [-2.35, 1.85, 2.7], t: [-2.85, 0.5, -0.05] },
    B: { p: [-1.55, 2.2, 3.7], t: [-1.5, 1.0, 0.35] },
    Bfun: { p: [-0.55, 2.3, 2.55], t: [-0.85, 1.3, 0.2] },
    BC: { p: [0.45, 2.3, 3.9], t: [0.45, 1.0, 0.2] },
    C: { p: [2.2, 1.85, 2.8], t: [1.6, 0.95, 0.2] },
    Cdish: { p: [1.95, 1.6, 1.65], t: [1.6, 0.82, 0.2] },
    BD: { p: [1.4, 2.9, 5.6], t: [1.3, 0.8, 0.2] },
    D: { p: [3.75, 1.6, 2.45], t: [3.85, 0.45, 0.35] },
    Dglass: { p: [3.45, 1.4, 2.0], t: [3.35, 0.05, 0.4] },
    eye: { p: [MX, 1.32, 0.22], t: [MX, 1.04, -0.2] },
  };
  let curCam: CamPose = CAMS.over;
  const toWorld = (p: [number, number, number]) => root.localToWorld(V3(...p));
  function flyTo(c: CamPose, dur = 1.3): Promise<void> {
    curCam = c;
    if (!camera || !controls) return Promise.resolve();
    const cam = camera;
    const ctl = controls;
    const p0 = cam.position.clone();
    const t0 = ctl.target.clone();
    const p1 = toWorld(c.p);
    const t1 = toWorld(c.t);
    return tween(dur, (k) => {
      cam.position.lerpVectors(p0, p1, k);
      ctl.target.lerpVectors(t0, t1, k);
    });
  }

  /* hint line, buttons and holds (the DOM overlay renders these) */
  let waiter: Waiter | null = null;
  let holdKeys: Set<string> | null = null;
  let holding = false;
  let holdT = 0;
  let noteTimer = 0;
  function hint(text: string): void {
    useNaClUI.setState({ hint: text });
  }
  function note(text: string, tone: NoteTone = 'info'): void {
    useNaClUI.setState({ note: { text, tone, id: Date.now() } });
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => useNaClUI.setState({ note: null }), 5000);
  }
  function setHold(keys: string[] | null): void {
    holdKeys = keys ? new Set(keys) : null;
    if (!keys) endHold();
  }
  function startHold(k: string): void {
    if (holdKeys && holdKeys.has(k)) {
      holding = true;
      holdT = 0;
      if (controls) controls.enabled = false;
    }
  }
  function endHold(): void {
    if (!holding) return;
    holding = false;
    if (controls) controls.enabled = true;
  }
  function ask(click: PartKey[] = [], buttons: string[] = [], hold: string | null = null): Promise<AskResult> {
    return new Promise((res) => {
      waiter = { keys: new Set(click), res, my: token };
      useNaClUI.setState({ buttons, hold, canSkip: click.length > 0 });
      setMarkers(click);
    });
  }
  function resolveWaiter(v: AskResult): void {
    if (!waiter || waiter.my !== token) return;
    const w = waiter;
    waiter = null;
    setMarkers([]);
    useNaClUI.setState({ buttons: [], hold: null, canSkip: false });
    w.res(v);
  }
  const clickOn = (...keys: PartKey[]) => ask(keys);
  function showHold(label: string): void {
    useNaClUI.setState({ hold: label });
  }
  function hideHold(): void {
    useNaClUI.setState({ hold: null });
  }

  /* ================= reset and jump states ================= */
  function resetScene(): void {
    watchCrystals.count = 0;
    clearParticles();
    endHold();
    rxShow(null);
    for (const p of [CYL, BEAK, FLASK, DISH, BOT]) {
      p.holder.position.copy(p.rest);
      p.holder.rotation.set(0, 0, 0);
      p.liq.setHidden(false);
    }
    cylLiq.set(0, true);
    beakLiq.set(0, true);
    flaskLiq.set(0, true);
    dishLiq.set(0, true);
    funLiq.set(0, true);
    beakLiq.mat.color.setHex(COL.acid);
    beakLiq.mat.opacity = 0.5;
    beakResidue.visible = false;
    funLiq.mat.color.setHex(COL.milky);
    stopper.visible = true;
    setGroup(rimCrys, false);
    setGroup(botCrys, false);
    paperG.visible = true;
    paperG.position.copy(PAPER_AT.stack);
    paperG.scale.setScalar(1);
    setPaperU(1, true);
    setGroup(paperCrys, false);
    setGroup(paperRes, false);
    setWet(1);
    slide.position.copy(SLIDE_REST);
    slideCrys.visible = false;
    spat.position.copy(SPAT_REST);
    spat.rotation.set(0, 0.3, 0);
    spatLoad.visible = false;
    spatLoad.material = M.powder;
    rod.position.copy(ROD_REST.p);
    rod.rotation.set(0, ROD_REST.ry, ROD_REST.rz);
    jarPowder.scale.y = 0.24;
    setFlame(0);
    (stageLight.material as MeshBasicMaterial).color.setHex(0x777777);
    resetS();
    useNaClUI.setState({ ...initialUI, labels: useNaClUI.getState().labels });
  }
  /** End states of each step, for jumping straight to a later step. */
  const SNAP: (() => void)[] = [
    () => {
      S.acid = 50;
      S.hcl = 50;
      beakLiq.set(50, true);
    },
    () => {
      S.carb = 3.5;
      S.hcl = 0;
      S.co2 = 25 * CHEM.molarVolume;
      beakResidue.visible = true;
      beakLiq.mat.color.setHex(COL.milky);
      beakLiq.mat.opacity = 0.62;
      jarPowder.scale.y = 0.16;
    },
    () => {
      beakLiq.set(0, true);
      beakResidue.visible = false;
      paperG.position.copy(PAPER_AT.funnel);
      setPaperU(0, true);
      setGroup(paperRes, true);
      flaskLiq.set(50, true);
    },
    () => {
      flaskLiq.set(0, true);
      dishLiq.set(9, true);
      setGroup(rimCrys, true);
      S.temp = 60;
    },
    () => {
      dishLiq.set(3.5, true);
      setGroup(botCrys, true);
      S.temp = 22;
    },
    () => {
      dishLiq.set(0, true);
      setGroup(rimCrys, false);
      setGroup(botCrys, false);
      setGroup(paperRes, false);
      setGroup(paperCrys, true);
      flaskLiq.set(3, true);
    },
    () => {
      paperG.position.copy(PAPER_AT.glass);
      setPaperU(1, true);
      setWet(0);
    },
    () => undefined,
  ];

  /* ================= shared actions ================= */
  const lift = (p: Pourable, dy = 0.55) => moveH(p, p.rest.clone().add(V3(0, dy, 0)), 0, 0.75);
  const liftedY = (p: Pourable) => p.holder.position.y - p.lipY;
  async function pourInto(src: Pourable, lipTo: Vector3, tilt: number, dur: number, step: (k: number) => void, toY: () => number, color: number, w?: number): Promise<void> {
    await moveH(src, lipTo, tilt * 0.45, 1.0);
    await moveH(src, lipTo, tilt * 0.8, 0.4);
    streamMat.color.setHex(color);
    P.stream = { from: () => src.holder.position, toY, w };
    src.liq.setHidden(true);
    await tween(dur, step, lin);
    P.stream = null;
    await lift(src);
    src.liq.setHidden(false);
    await moveH(src, src.rest, 0, 0.7);
  }
  async function paperFold(): Promise<void> {
    paperG.visible = true;
    paperG.position.copy(PAPER_AT.stack);
    setPaperU(1, true);
    await moveObj(paperG, PAPER_AT.stack.clone().add(V3(0, 0.35, 0)), null, 0.5);
    await tween(0.9, (k) => setPaperU(1 - 0.55 * k));
    await moveObj(paperG, PAPER_AT.funnel.clone().add(V3(0, 0.45, 0)), null, 0.9, 0.2);
    await all([tween(0.5, (k) => setPaperU(0.45 * (1 - k))), moveObj(paperG, PAPER_AT.funnel, null, 0.6)]);
    setPaperU(0, true);
  }
  async function paperToWaste(): Promise<void> {
    await moveObj(paperG, PAPER_AT.funnel.clone().add(V3(0, 0.6, 0)), null, 0.6);
    await moveObj(paperG, V3(WASTE.x, 0.85 - 0.52, WASTE.z), null, 1.0, 0.25);
    await tween(0.6, (k) => {
      paperG.position.y = 0.85 - 0.52 - 0.45 * k;
      paperG.scale.setScalar(1 - 0.55 * k);
    });
    paperG.visible = false;
    paperG.scale.setScalar(1);
    setGroup(paperRes, false);
  }

  /* ================= the experiment, step by step (а … з) ================= */
  const PM = (CHEM.portionGrams / CHEM.molarCarbonate) * 1000;
  const RUN: (() => Promise<void>)[] = [];
  // а — measure 50 cm³ of acid, read at eye level
  RUN[0] = async () => {
    await flyTo(CAMS.A);
    hint('Давсны хүчлийн шилийг дарж ав.');
    await clickOn('bottle');
    stopper.visible = false;
    await lift(BOT, 0.5);
    await moveH(BOT, V3(CX + 0.02, 1.6, BZ), 1.0, 1.0);
    await flyTo(CAMS.cylRead, 1.3);
    hint('Дарж барьж цутга, суллаад зогсоо. Менискийн доод ирмэг 50-д хүрэхэд «Шалгах».');
    let tilt = BOT.holder.rotation.z;
    let measuring = true;
    setHold(['btn', 'bottle', 'cyl']);
    proc((dt) => {
      if (!measuring) {
        P.stream = null;
        return true;
      }
      const target = holding ? 2.05 : 1.0;
      tilt += (target - tilt) * Math.min(1, dt * 7);
      BOT.holder.rotation.z = tilt;
      if (tilt > 1.8 && cylLiq.vol < 100) {
        cylLiq.set(cylLiq.vol + (1.6 + 5 * Math.min(1, holdT / 1.8)) * dt);
        streamMat.color.setHex(COL.acid);
        P.stream = { from: () => BOT.holder.position, toY: () => liftedY(CYL) + cylLiq.top, w: 0.8 };
      } else P.stream = null;
    });
    for (;;) {
      await ask([], ['Шалгах'], 'Дарж цутгах');
      const v = cylLiq.vol;
      if (v < 49) {
        note('Мениск 50-аас доор байна. Бага зэрэг нэмж цутга.', 'warn');
        continue;
      }
      if (v > 51) {
        note('Мениск 50-аас дээш байна. Бага зэрэг буцааж асга.', 'warn');
        const r = await ask([], ['≈1 см³ буцааж асгах', 'Дахин унших']);
        if (r.type === 'button' && r.i === 0) cylLiq.set(Math.max(45, v - rnd(0.7, 1.3)));
        continue;
      }
      S.acid = Math.round(v * 10) / 10;
      S.hcl = S.acid;
      note(`Уншилт: ${S.acid.toFixed(1)} см³.`, 'ok');
      break;
    }
    measuring = false;
    setHold(null);
    P.stream = null;
    await moveH(BOT, BOT.rest.clone().add(V3(0, 0.5, 0)), 0, 0.9);
    await moveH(BOT, BOT.rest, 0, 0.7);
    stopper.visible = true;
    await flyTo(CAMS.A);
    hint('Хэмжээст цилиндрийг дарж ав.');
    await clickOn('cyl');
    await lift(CYL);
    hint('Шилэн аягыг дарж хүчлээ цутга.');
    await clickOn('beaker');
    const v0 = cylLiq.vol;
    await pourInto(
      CYL,
      V3(BX - 0.22, 1.0, BZ),
      -1.75,
      2.6,
      (k) => {
        cylLiq.set(v0 * (1 - k));
        beakLiq.set(v0 * k);
      },
      () => beakLiq.top,
      COL.acid,
    );
  };
  // б — add carbonate portion by portion until it stops fizzing
  RUN[1] = async () => {
    await flyTo(CAMS.Aclose);
    hint('Шилэн савхыг дарж аяганд хий.');
    await clickOn('rod');
    await moveObj(rod, V3(BX + 0.1, 0.015, BZ), { x: 0, y: 0, z: -0.17 }, 1.0, 0.4);
    rxShow('acid');
    hint('Халбагыг дарж ав.');
    await clickOn('spat');
    const SP = { hover: V3(-2.75, 0.8, -0.15), jarTop: V3(-2.5, 0.62, -0.6), jarIn: V3(-2.5, 0.3, -0.6), over: V3(BX + 0.02, 1.05, BZ + 0.02) };
    await moveObj(spat, SP.hover, { x: 0, y: 0.3, z: 0.25 }, 0.8);
    let zero = 0;
    hint('Натрийн карбонатын савыг дарж ≈0.5 г ав.');
    await clickOn('jar');
    for (;;) {
      await moveObj(spat, SP.jarTop, { x: 0, y: 0.3, z: 0.5 }, 0.5);
      await moveObj(spat, SP.jarIn, null, 0.3);
      spatLoad.visible = true;
      jarPowder.scale.y = Math.max(0.1, jarPowder.scale.y - 0.011);
      await moveObj(spat, SP.jarTop, null, 0.25);
      await moveObj(spat, SP.hover, { z: 0.25 }, 0.45);
      hint('Шилэн аягыг дарж нунтгаа хий.');
      await clickOn('beaker');
      await moveObj(spat, SP.over, { x: 0, y: 0, z: 0.25 }, 0.5);
      await moveObj(spat, SP.over, { x: 2.2 }, 0.3);
      emitBits(18, spat.position.clone(), M.powder, { s0: 0.008, s1: 0.016, sp: 0.03, vx: 0.05, vy0: -0.3, vy1: 0, minY: beakLiq.top, delay: 0.3, flat: 0.7 });
      spatLoad.visible = false;
      S.carb += CHEM.portionGrams;
      rxAddCarbonate();
      await moveObj(spat, SP.over, { x: 0 }, 0.3);
      const react = Math.min(PM, S.hcl / 2);
      const peak = react / PM;
      hint('Шилэн савхыг дарж барьж хутга (хурдасна). Баруун доор: CO₃²⁻ + 2H⁺ → H₂O + CO₂.');
      setHold(['rod', 'btn']);
      showHold('Дарж хутгах');
      const h0 = S.hcl;
      const c0 = S.co2;
      const dur = react > 0 ? 3.6 : 1.8;
      let k = 0;
      await new Promise<void>((res) =>
        proc((dt) => {
          k += (dt / dur) * (holding ? 2.3 : 1);
          P.stir = holding ? 1 : 0;
          const kk = Math.min(1, k);
          P.fizz = peak * Math.pow(1 - kk, 1.3) * (kk < 0.06 ? kk / 0.06 : 1);
          S.hcl = h0 - 2 * react * kk;
          S.co2 = c0 + react * CHEM.molarVolume * kk;
          if (k >= 1) {
            P.fizz = 0;
            P.stir = 0;
            res();
            return true;
          }
          return false;
        }),
      );
      setHold(null);
      hideHold();
      await moveObj(spat, SP.hover, null, 0.4);
      if (react <= 1e-6) {
        zero++;
        if (zero > 1) S.extra++;
      }
      if (zero >= 3) {
        note('Хангалттай карбонат нэмлээ.', 'warn');
        break;
      }
      const obs = peak > 0.8 ? 'Хүчтэй хий ялгарлаа.' : peak > 0.05 ? 'Бага зэрэг хий ялгарлаа.' : 'Огт хий ялгарсангүй.';
      hint(`${obs} Дахин нэмэх бол савыг дар, хүчил дууссан бол «Урвал дууссан».`);
      const r = await ask(['jar'], ['Урвал дууссан']);
      if (r.type === 'button') {
        if (react > 1e-6) {
          S.early++;
          note(react > PM * 0.5 ? 'Хараахан биш: сүүлийн хэсэг хүчтэй хий ялгаруулсан.' : 'Бараг: сүүлийн хэсэг хий ялгаруулсан. Дахиад нэгийг нэмж шалга.', 'warn');
          hint('Натрийн карбонатын савыг дарж дахин нэмнэ үү.');
          await clickOn('jar');
          continue;
        }
        break;
      }
      if (zero >= 1) note('Хий ялгарахгүй бол хүчил үлдээгүй. Илүүдэл карбонат давсанд хольц болно.', 'warn');
    }
    note(S.early === 0 && S.extra === 0 ? 'Яг зөв: хий ялгаруулаагүй анхны хэсэг дээр зогслоо.' : 'Урвал дууслаа.', S.early === 0 && S.extra === 0 ? 'ok' : 'info');
    beakResidue.visible = true;
    beakLiq.mat.color.setHex(COL.milky);
    beakLiq.mat.opacity = 0.62;
    await all([moveObj(spat, SPAT_REST, { x: 0, y: 0.3, z: 0 }, 1.0, 0.3), moveObj(rod, ROD_REST.p, { x: 0, y: ROD_REST.ry, z: ROD_REST.rz }, 1.0, 0.4)]);
    await tween(1.5, () => undefined);
    rxShow(null);
  };
  // в — fold a filter paper and filter without overfilling
  RUN[2] = async () => {
    await flyTo(CAMS.B);
    hint('Шүүлтүүрийн цаасыг дарж юүлүүрт хий.');
    await clickOn('stack');
    await paperFold();
    hint('Шилэн аягыг дарж ав.');
    await clickOn('beaker');
    await lift(BEAK, 0.6);
    await moveH(BEAK, V3(FX - 0.24, 1.86, BZ), -0.7, 1.1);
    await flyTo(CAMS.Bfun, 1.0);
    hint('Дарж барьж юүлүүрт цутга. Шингэнийг цаасны ирмэгээс доош байлга.');
    setHold(['btn', 'beaker', 'funnel']);
    showHold('Дарж цутгах');
    let tilt = BEAK.holder.rotation.z;
    let warned = false;
    beakLiq.setHidden(true);
    const exc = Math.max(0, S.carb - ((S.acid / 2) * CHEM.molarCarbonate) / 1000);
    paperRes.visible = exc > 0.05;
    paperRes.children.forEach((m) => m.scale.setScalar(0.0001));
    const startVol = Math.max(1, beakLiq.vol);
    await new Promise<void>((res) =>
      proc((dt) => {
        const target = holding ? -1.4 : -0.7;
        tilt += (target - tilt) * Math.min(1, dt * 6);
        BEAK.holder.rotation.z = tilt;
        if (tilt < -1.2 && beakLiq.vol > 0.01) {
          const q = Math.min(beakLiq.vol, 10 * dt);
          beakLiq.set(beakLiq.vol - q);
          funLiq.set(funLiq.vol + q);
          streamMat.color.setHex(COL.milky);
          P.stream = { from: () => BEAK.holder.position, toY: () => funnel.position.y + Math.max(funLiq.top, 0.56) };
          const prog = 1 - beakLiq.vol / startVol;
          paperRes.children.forEach((m, i) => m.scale.setScalar(Math.max(0.0001, Math.min(1, prog * 1.5 - i / 60))));
        } else P.stream = null;
        const dq = Math.min(funLiq.vol, 4.5 * dt);
        funLiq.set(funLiq.vol - dq);
        flaskLiq.set(flaskLiq.vol + dq);
        P.drip = funLiq.vol > 0.3 ? 1 : 0;
        if (funLiq.vol > 30 && !warned) {
          warned = true;
          note('Цаасны ирмэгт ойртлоо. Суллаж шүүгдэхийг хүлээ.', 'warn');
        }
        if (funLiq.vol < 20) warned = false;
        if (funLiq.vol > 37.5) {
          if (!S.overflow) {
            S.overflow = true;
            note('Цаасны ирмэгээр давлаа! Шүүгдээгүй шингэн нэвтэрч, зарим нь асгарлаа.', 'warn');
          }
          S.lost += funLiq.vol - 37.5;
          funLiq.set(37.5);
        }
        if (beakLiq.vol <= 0.01 && !holding) {
          P.stream = null;
          res();
          return true;
        }
        return false;
      }),
    );
    setHold(null);
    hideHold();
    paperRes.children.forEach((m) => m.scale.setScalar(1));
    hint('Тунгалаг шүүгдэс (NaCl уусмал) колбонд дусалж байна.');
    await lift(BEAK, 0.6);
    beakResidue.visible = false;
    beakLiq.setHidden(false);
    await moveH(BEAK, BEAK.rest, 0, 0.8);
    proc((dt) => {
      const dq = Math.min(funLiq.vol, 5 * dt);
      funLiq.set(funLiq.vol - dq);
      flaskLiq.set(flaskLiq.vol + dq);
      P.drip = funLiq.vol > 0.2 ? 1 : 0;
      if (funLiq.vol <= 0.01) {
        P.drip = 0;
        return true;
      }
      return false;
    });
    await until(() => funLiq.vol <= 0.01);
  };
  // г — evaporate, stop at the first crystals (too late → spitting)
  RUN[3] = async () => {
    await flyTo(CAMS.BC);
    hint('Конус колбыг дарж ав.');
    await clickOn('flask');
    await lift(FLASK);
    hint('Ууршуулагч аягыг дарж шүүгдэсээ хий.');
    await clickOn('dish');
    const v0 = flaskLiq.vol;
    await pourInto(
      FLASK,
      V3(DX - 0.2, 1.46, BZ),
      -1.85,
      2.4,
      (k) => {
        flaskLiq.set(v0 * (1 - k));
        dishLiq.set(v0 * k);
      },
      () => liftedY(DISH) + dishLiq.top,
      COL.salt,
    );
    await flyTo(CAMS.C);
    hint('Спиртийн дэнг дарж асаа.');
    await clickOn('lamp');
    await tween(0.6, (k) => setFlame(k));
    rxShow('evap');
    await flyTo(CAMS.Cdish, 1.2);
    hint('Ирмэгт анхны цагаан талст гармагц дэнгээ унтраа (дэнг дар).');
    let heating = true;
    let evapLive = true;
    let spitDone = false;
    const CRYS_AT = 10.5;
    rimCrys.visible = true;
    rimCrys.children.forEach((m) => m.scale.setScalar(0.0001));
    proc((dt) => {
      if (!evapLive) return true;
      if (heating && flameLevel > 0.5) {
        const v = dishLiq.vol;
        dishLiq.set(Math.max(0, v - (v > 15 ? 3.4 : 0.85) * dt));
        S.temp = Math.min(100, S.temp + 30 * dt);
        P.steam = Math.min(1, Math.max(0, (S.temp - 60) / 30));
        S.clock = 'Хурдасгасан ×60';
        const kc = Math.max(0, (CRYS_AT - dishLiq.vol) / 3);
        rimCrys.children.forEach((m, i) => {
          const vv = Math.min(1, Math.max(0, kc * 1.5 - (i / 30) * 0.6));
          m.scale.setScalar((m.userData.s as number) * Math.max(0.0001, vv));
        });
        if (dishLiq.vol <= 6 && !spitDone) {
          spitDone = true;
          S.spit = true;
          heating = false;
          emitBits(46, V3(DX, liftedY(DISH) + dishLiq.top, BZ), M.crystal, { s0: 0.01, s1: 0.024, sp: 0.15, vx: 1.0, vy0: 1.3, vy1: 2.4, minY: 0.02, delay: 0.6 });
          resolveWaiter({ type: 'spit' });
        }
      } else {
        S.temp = Math.max(22, S.temp - 4 * dt);
        P.steam = Math.max(0, P.steam - dt * 0.4);
      }
      return false;
    });
    for (;;) {
      const r = await ask(['lamp'], ['Дэнг унтраах']);
      heating = false;
      await tween(0.4, (k) => setFlame(1 - k));
      if (r.type === 'spit') {
        note('Давс үсэрч байна! Хэт удаан халаасан тул бүтээгдэхүүний нэг хэсэг алдагдлаа.', 'warn');
        break;
      }
      if (dishLiq.vol > CRYS_AT) {
        note('Талст хараахан гараагүй. Усны ихэнх нь ууршсан байх ёстой.', 'warn');
        hint('Дэнгээ дахин асаа.');
        await ask(['lamp'], ['Дэнг асаах']);
        await tween(0.5, (k) => setFlame(k));
        heating = true;
        hint('Ирмэгт анхны цагаан талст гармагц дэнгээ унтраа.');
        continue;
      }
      note('Зөв цагтаа унтраалаа: ирмэгт талст үүслээ.', 'ok');
      break;
    }
    S.clock = '';
    await tween(2.5, () => undefined);
    evapLive = false;
    rxShow(null);
  };
  // д — cool and leave to crystallise
  RUN[4] = async () => {
    await flyTo(CAMS.Cdish);
    hint('Аягыг хөдөлгөлгүй үлдээж хөргө.');
    await ask([], ['24 цаг үлдээх']);
    const v0 = dishLiq.vol;
    const t0 = S.temp;
    botCrys.visible = true;
    botCrys.children.forEach((m) => m.scale.setScalar(0.0001));
    const keep = S.spit ? 0.7 : 1;
    await tween(
      5.5,
      (k) => {
        S.clock = `1-р өдөр · ${Math.round(k * 24)} цаг`;
        S.temp = t0 + (22 - t0) * Math.min(1, k * 3);
        P.steam = Math.max(0, 0.3 * (1 - k * 4));
        dishLiq.set(v0 + (Math.min(v0, 3.5) - v0) * k);
        botCrys.children.forEach((m, i) => {
          const f = i / botCrys.children.length;
          const vv = f < keep ? Math.min(1, Math.max(0, k * 1.5 - f * 0.55)) : 0;
          m.scale.setScalar((m.userData.s as number) * Math.max(0.0001, vv));
        });
      },
      lin,
    );
    P.steam = 0;
    S.clock = '';
  };
  // е — new filter paper, collect the crystals
  RUN[5] = async () => {
    await flyTo(CAMS.B);
    hint('Юүлүүр дэх хэрэглэсэн цаасыг дарж хая.');
    await clickOn('funnel');
    await paperToWaste();
    hint('Шинэ шүүлтүүрийн цаасыг дарж юүлүүрт хий.');
    await clickOn('stack');
    await paperFold();
    await flyTo(CAMS.BC);
    hint('Ууршуулагч аягыг дарж ав.');
    await clickOn('dish');
    await lift(DISH);
    hint('Юүлүүрийг дарж талстаа хий.');
    await clickOn('funnel');
    await moveH(DISH, V3(FX + 0.25, 1.86, BZ), 0.6, 1.3);
    await moveH(DISH, V3(FX + 0.25, 1.86, BZ), 1.25, 0.5);
    streamMat.color.setHex(COL.salt);
    P.stream = { from: () => DISH.holder.position, toY: () => funnel.position.y + Math.max(funLiq.top, 0.56), w: 1.5 };
    dishLiq.setHidden(true);
    funLiq.mat.color.setHex(COL.salt);
    paperCrys.visible = true;
    const v0 = dishLiq.vol;
    let emitted = 0;
    await tween(
      2.6,
      (k) => {
        dishLiq.set(v0 * (1 - k));
        funLiq.set(v0 * k * 0.7);
        P.drip = 0.5;
        scaleKids(rimCrys, k, true);
        scaleKids(botCrys, k, true);
        scaleKids(paperCrys, k, false, 0.6, 0.1);
        const want = Math.floor(k * 30);
        while (emitted < want) {
          emitted++;
          emitBits(1, DISH.holder.position.clone().add(V3(0, -0.02, 0)), M.crystal, { s0: 0.014, s1: 0.026, sp: 0.03, vx: 0.08, vy0: -0.2, vy1: 0, minY: funnel.position.y + 0.6 });
        }
      },
      lin,
    );
    P.stream = null;
    setGroup(rimCrys, false);
    setGroup(botCrys, false);
    setGroup(paperCrys, true);
    await lift(DISH);
    dishLiq.setHidden(false);
    await moveH(DISH, DISH.rest, 0, 0.8);
    const f0 = funLiq.vol;
    const fl0 = flaskLiq.vol;
    await tween(
      2.0,
      (k) => {
        funLiq.set(f0 * (1 - k));
        flaskLiq.set(fl0 + (f0 + v0 * 0.3) * k);
        P.drip = k < 0.95 ? 0.6 : 0;
      },
      lin,
    );
    funLiq.set(0, true);
    P.drip = 0;
  };
  // ж — lift the paper out, open it on the watch glass, dry
  RUN[6] = async () => {
    await flyTo(CAMS.Bfun);
    hint('Юүлүүр дэх цаасыг дарж талсттай нь гарга.');
    await clickOn('funnel');
    await moveObj(paperG, PAPER_AT.funnel.clone().add(V3(0, 0.75, 0)), null, 0.9);
    const fly = flyTo(CAMS.BD, 1.6);
    await moveObj(paperG, PAPER_AT.glass.clone().add(V3(0, 1.0, 0)), null, 2.0, 0.25);
    await fly;
    await flyTo(CAMS.Dglass, 1.0);
    await all([moveObj(paperG, PAPER_AT.glass.clone().add(V3(0, 0.25, 0)), null, 0.6), tween(0.6, (k) => setPaperU(0.3 * k))]);
    await all([moveObj(paperG, PAPER_AT.glass, null, 0.9), tween(1.1, (k) => setPaperU(0.3 + 0.7 * k))]);
    setPaperU(1, true);
    hint('Талстууд нойтон, гялалзсан байна. Дулаан газар хатаа.');
    await ask([], ['24 цаг хатаах']);
    await tween(
      4.5,
      (k) => {
        setWet(1 - k);
        S.clock = `Хатааж байна · ${Math.round(k * 24)} цаг`;
      },
      lin,
    );
    setWet(0);
    S.clock = '';
  };
  // з — slide, microscope, focus
  RUN[7] = async () => {
    await flyTo(CAMS.D);
    hint('Цагны шил дээрх талстыг дарж шилэн хавтсан дээр тавь.');
    await clickOn('crystals');
    spatLoad.material = M.crystal;
    await moveObj(spat, V3(PX - 0.05, 0.4, 0.45), { x: 0, y: 0, z: 0.2 }, 1.3, 0.4);
    await moveObj(spat, V3(PX - 0.05, 0.08, 0.45), null, 0.4);
    spatLoad.visible = true;
    await moveObj(spat, V3(SLIDE_REST.x - 0.04, 0.25, SLIDE_REST.z), null, 0.8, 0.1);
    await moveObj(spat, V3(SLIDE_REST.x - 0.04, 0.25, SLIDE_REST.z), { x: 2.0 }, 0.3);
    spatLoad.visible = false;
    slideCrys.visible = true;
    await tween(0.6, (k) => scaleKids(slideCrys, k), lin);
    await moveObj(spat, SPAT_REST, { x: 0, y: 0.3, z: 0 }, 1.2, 0.4);
    hint('Шилэн хавтсыг дарж микроскопын тавцан дээр тавь.');
    await clickOn('slide');
    await moveObj(slide, STAGE_POS.clone().add(V3(0, 0.03, 0.3)), null, 0.9, 0.2);
    await moveObj(slide, STAGE_POS, null, 0.6);
    (stageLight.material as MeshBasicMaterial).color.setHex(0xfff6d8);
    hint('Микроскопыг дарж окуляраар хар.');
    await clickOn('scope');
    await flyTo(CAMS.eye, 1.3);
    hint('Фокусын бариулыг эргүүлж талстын ирмэгийг тод болго.');
    useNaClUI.setState({ scope: true, focus: 10 });
    let ok = 0;
    await new Promise<void>((res) =>
      proc((dt) => {
        const blur = Math.abs(useNaClUI.getState().focus - 64) * 0.32;
        if (blur < 0.9) {
          ok += dt;
          if (ok > 0.7) {
            res();
            return true;
          }
        } else ok = 0;
        return false;
      }),
    );
    note('Куб хэлбэртэй талст: NaCl куб тортой.', 'ok');
    await tween(2.5, () => undefined);
    useNaClUI.setState({ scope: false });
    await flyTo(CAMS.D, 1.0);
  };

  function finish(): void {
    setMarkers([]);
    const theo = (S.acid / 1000) * CHEM.molarSalt;
    const needed = ((S.acid / 2) * CHEM.molarCarbonate) / 1000;
    const recovered = Math.max(0, theo * (S.spit ? 0.82 : 1) * (1 - S.lost / Math.max(1, S.acid)) - CHEM.motherLiquorSalt);
    hint('Туршилт дууслаа.');
    useNaClUI.setState({
      buttons: [],
      hold: null,
      canSkip: false,
      result: { acid: S.acid, carbonate: S.carb, needed, co2: S.co2, theoretical: theo, recovered, spit: S.spit, overflow: S.overflow },
    });
  }

  /* ================= control flow ================= */
  let started = false;
  function goto(i: number): void {
    token++;
    tickers = [];
    waiter = null;
    setMarkers([]);
    setHold(null);
    resetScene();
    for (let j = 0; j < i; j++) SNAP[j]();
    started = true;
    void run(i);
  }
  async function run(i: number): Promise<void> {
    const my = token;
    for (let s = i; s < STEPS.length; s++) {
      curStep = s;
      useNaClUI.setState({ step: s });
      await RUN[s]();
      if (my !== token) return;
    }
    finish();
  }

  function showInfo(k: PartKey): void {
    const sub = contentOf(k);
    const vf = VOLOF[k];
    const vol = vf && vf() > 0.5 && !(k === 'cyl' && curStep === 0) ? Math.round(vf()) : null;
    useNaClUI.setState({ info: { key: k, substance: sub, volume: vol } });
  }

  /* ================= per-frame update (called by the R3F component) ================= */
  let dataT = 0;
  const raycaster = new Raycaster();
  function update(rawDt: number): void {
    const now = performance.now();
    if (flame.visible) {
      const f = 1 + 0.07 * Math.sin(now * 0.023) + 0.05 * Math.sin(now * 0.041 + 1.3);
      flame.scale.set(flameLevel * (1 - 0.03 * Math.sin(now * 0.03)), flameLevel * f, flameLevel);
      flLight.intensity = 0.25 * flameLevel * f;
    } else flLight.intensity = 0;
    if (!active) return;
    const dt = Math.min(0.05, rawDt);
    if (holding) holdT += dt;
    for (let i = tickers.length - 1; i >= 0; i--) {
      const f = tickers[i];
      if (f && f(dt)) {
        const j = tickers.indexOf(f);
        if (j >= 0) tickers.splice(j, 1);
      }
    }
    updateParticles(dt);
    rxUpdate(dt);
    rxDraw();
    if (camera) {
      const b = Math.sin(now * 0.006) * 0.03;
      const camLocal = root.worldToLocal(camera.position.clone());
      markers.forEach((m, i) => {
        const k = markerKeys[i];
        if (!k) return;
        const p = PKEY[k];
        p.getWorldPosition(tmpA);
        root.worldToLocal(tmpA);
        const d = camLocal.distanceTo(tmpA);
        const sc = Math.max(0.04, Math.min(0.2, d * 0.035));
        m.position.set(tmpA.x, tmpA.y + (p.userData.top as number) + sc * 0.7 + 0.12 + b * sc * 5, tmpA.z);
        m.scale.setScalar(sc);
        m.visible = pickable(p);
      });
    }
    dataT += dt;
    if (dataT > 0.1) {
      dataT = 0;
      useNaClUI.setState({ data: { carbonate: S.carb, co2: S.co2, temp: S.temp, clock: S.clock } });
    }
  }

  /* ================= DOM labels (projected each frame by the overlay) ================= */
  const LABEL_AT: Partial<Record<PartKey, () => Vector3>> = { tripod: () => V3(DX + 0.62, 0.72, BZ + 0.35), lamp: () => V3(DX - 0.42, 0.34, BZ + 0.3) };
  interface LabelSpot {
    key: PartKey;
    x: number;
    y: number;
    visible: boolean;
    substance: SubstanceId | null;
  }
  function labelSpots(width: number, height: number): LabelSpot[] {
    const out: LabelSpot[] = [];
    if (!camera) return out;
    const cam = camera;
    const camLocal = root.worldToLocal(cam.position.clone());
    for (const key of LABEL_KEYS) {
      const p = PKEY[key];
      if (!pickable(p)) {
        out.push({ key, x: 0, y: 0, visible: false, substance: null });
        continue;
      }
      const at = LABEL_AT[key];
      const local = at ? at() : root.worldToLocal(p.getWorldPosition(V3(0, 0, 0))).add(V3(0, (p.userData.top as number) + 0.05, 0));
      const far = camLocal.distanceTo(local) > 14;
      const w = root.localToWorld(local.clone()).project(cam);
      const visible = !far && w.z < 1 && Math.abs(w.x) < 1.05 && Math.abs(w.y) < 1.05;
      out.push({ key, x: ((w.x + 1) / 2) * width, y: ((1 - w.y) / 2) * height, visible, substance: visible ? contentOf(key) : null });
    }
    return out;
  }
  function steamSpot(width: number, height: number): { x: number; y: number } | null {
    if (!camera || P.steam <= 0.3) return null;
    const w = root.localToWorld(V3(DX + 0.3, 1.75, BZ)).project(camera);
    if (w.z > 1) return null;
    return { x: ((w.x + 1) / 2) * width, y: ((1 - w.y) / 2) * height };
  }

  /* ================= public API ================= */
  const freeObjects: Record<PartKey, Object3D> = {
    bottle: BOT.holder, cyl: CYL.holder, beaker: BEAK.holder, jar, spat, rod,
    stack: stackG, paper: paperG, crystals: paperG, funnel, flask: FLASK.holder,
    dish: DISH.holder, lamp, tripod: tripodG, waste: wasteBody, watch, slide, scope: scopeG,
  };
  const freeLiquids: Partial<Record<PartKey, Liquid>> = { bottle: botLiq, cyl: cylLiq, beaker: beakLiq, flask: flaskLiq, dish: dishLiq, funnel: funLiq };
  const freeOffsets = new Map<Object3D, Vector3>();
  const freeVisibility = new Map<Object3D, boolean>();
  function freeBottom(key: PartKey): Vector3 {
    root.updateWorldMatrix(true, true);
    const object = freeObjects[key];
    let offset = freeOffsets.get(object);
    if (!offset) {
      const box = new Box3().setFromObject(object);
      const at = object.getWorldPosition(new Vector3());
      offset = new Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2).sub(at);
      freeOffsets.set(object, offset);
    }
    return object.getWorldPosition(new Vector3()).add(offset);
  }
  return {
    root,
    /** Preparation only changes visibility, never chemistry or apparatus transforms. */
    showParts(keys: PartKey[]) {
      retortStand.visible = keys.includes('funnel');
      if (keys.includes('stack')) keys = [...keys, 'paper'];
      const objects = new Set(keys.map((key) => freeObjects[key]));
      for (const object of new Set(Object.values(freeObjects))) {
        if (!freeVisibility.has(object)) freeVisibility.set(object, object.visible);
        object.visible = objects.has(object) && freeVisibility.get(object)!;
      }
    },
    partObject: (key: PartKey) => freeObjects[key],
    projectPoint(at: Vector3, width: number, height: number) {
      if (!camera) return null;
      const p = at.clone().project(camera);
      return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, visible: p.z > -1 && p.z < 1 };
    },
    /** Free-play API: original meshes stay in the shared room and never become clones. */
    parts: Object.entries(PKEY).map(([key, hit]) => ({ key: key as PartKey, hit, label: NAMES[key as PartKey] })),
    partVisible: (key: PartKey) => pickable(PKEY[key]),
    partPosition: freeBottom,
    partBounds(key: PartKey) {
      root.updateWorldMatrix(true, true);
      return new Box3().setFromObject(PKEY[key]);
    },
    guideMarkers(keys: PartKey[]) {
      setMarkers(keys);
      keys.slice(0, 3).forEach((key, index) => {
        const marker = markers[index];
        const box = new Box3().setFromObject(PKEY[key]);
        const at = box.getCenter(new Vector3());
        at.y = box.max.y + 0.025;
        marker.position.copy(root.worldToLocal(at));
        marker.scale.setScalar(0.18);
        marker.visible = pickable(PKEY[key]);
      });
    },
    movePart(key: PartKey, bottom: Vector3, yaw: number, tilt = 0) {
      freeBottom(key);
      const object = freeObjects[key];
      const offset = freeOffsets.get(object)!;
      object.position.copy(root.worldToLocal(bottom.clone().sub(offset)));
      object.rotation.set(0, yaw, tilt);
      object.updateWorldMatrix(true, true);
    },
    prepareFreePlay() {
      active = false;
      resetScene();
      // A loose sheet is available from the start; it is not locked behind a step.
      paperG.position.copy(PAPER_AT.stack);
      setPaperU(1, true);
      botLiq.set(100, true);
      PKEY.paper.userData.when = () => true;
    },
    reactionOrigin(bottom: Vector3 | null, height: number) {
      freeFizz = bottom ? { at: root.worldToLocal(bottom.clone()), top: height / STATION_SCALE } : null;
    },
    freeVisuals(values: Partial<Record<PartKey, BenchVisual>>, lit: boolean, fizz: number, steaming: number, _rx: 'acid' | 'evap' | null, dt: number, paperIn = false) {
      if ((paperIn && paperU > 0.5) || (!paperIn && paperU < 0.5)) setPaperU(paperIn ? 0 : 1, true);
      for (const [key, value] of Object.entries(values)) {
        const liquid = freeLiquids[key as PartKey];
        liquid?.set(value.volume);
        if (liquid && value.color) liquid.mat.color.set(value.color);
      }
      jarPowder.scale.y = .24 * Math.min(1, (values.jar?.solid ?? 0) / 20);
      spatLoad.visible = (values.spat?.solid ?? 0) > .001 || (values.spat?.crystals ?? 0) > .001;
      spatLoad.material = (values.spat?.crystals ?? 0) > .001 ? M.crystal : M.powder;
      watchCrystals.count = Math.min(32, Math.ceil((values.watch?.crystals ?? 0) * 16));
      beakResidue.visible = (values.beaker?.solid ?? 0) > 0.01;
      const dishCrystals = Math.min(1, (values.dish?.crystals ?? 0) / 2);
      setGroup(rimCrys, dishCrystals > 0.001);
      setGroup(botCrys, dishCrystals > 0.001);
      if (dishCrystals > 0) {
        scaleKids(rimCrys, dishCrystals);
        scaleKids(botCrys, dishCrystals);
      }
      paperRes.visible = (values.funnel?.solid ?? 0) > 0.01;
      paperCrys.visible = (values.paper?.crystals ?? 0) > 0.001;
      slideCrys.visible = (values.slide?.crystals ?? 0) > 0.001;
      setFlame(lit ? 1 : 0);
      P.fizz = fizz;
      P.steam = steaming;
      // The scene-anchored instanced 3D lens owns free-play molecular visuals.
      // The old 2D renderer remains only for the unused scripted demonstration.
      updateParticles(dt);
    },
    transferStream(from: Vector3 | null, to: Vector3 | null) {
      if (!from || !to) { stream.visible = false; return; }
      const a = root.worldToLocal(from.clone());
      const b = root.worldToLocal(to.clone());
      const direction = b.sub(a);
      stream.visible = direction.length() > 0.01;
      stream.position.copy(a);
      stream.scale.set(1, direction.length(), 1);
      stream.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), direction.normalize());
    },
    /** Camera and orbit controls are owned by the R3F component. */
    attach(cam: PerspectiveCamera | null, ctl: OrbitLike | null) {
      camera = cam;
      controls = ctl;
    },
    attachRx(canvas: HTMLCanvasElement | null) {
      rxCanvas = canvas;
    },
    /** Called when the player sits down at / leaves the bench. Starts the experiment the first time. */
    setActive(on: boolean) {
      active = on;
      if (!on) endHold();
      if (on) {
        if (!started) goto(0);
      }
    },
    /** Release resources owned by this station when the lab is unmounted. */
    dispose() {
      active = false;
      endHold();
      token++;
      tickers = [];
      waiter = null;
      window.clearTimeout(noteTimer);
      rxCanvas = null;
      camera = null;
      controls = null;
      const geometries = new Set<BufferGeometry>();
      const materials = new Set<Material>();
      const textures = new Set<Texture>();
      root.traverse((object) => {
        if (object instanceof InstancedMesh) object.dispose();
        if (!(object instanceof Mesh) && !(object instanceof Sprite)) return;
        if (object instanceof Mesh) geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => materials.add(material));
      });
      Object.values(M).forEach((material) => materials.add(material));
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof Texture) textures.add(value);
        });
        material.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
    },
    update,
    goto,
    restart: () => goto(0),
    /** Station part under a camera ray (preferring parts the current step is waiting for). */
    pick(ndc: Vector2, exclude?: PartKey): PartKey | null {
      if (!camera) return null;
      raycaster.setFromCamera(ndc, camera);
      const keys = raycaster
        .intersectObjects(PROX, false)
        .filter((h) => pickable(h.object as Mesh))
        .map((h) => h.object.userData.key as PartKey)
        .filter((key) => key !== exclude);
      const isActive = (k: PartKey) => (waiter?.keys.has(k) ?? false) || (holdKeys?.has(k) ?? false);
      return keys.find(isActive) ?? keys[0] ?? null;
    },
    isActiveKey(k: PartKey) {
      return (waiter?.keys.has(k) ?? false) || (holdKeys?.has(k) ?? false);
    },
    click(k: PartKey | null) {
      if (!k) return;
      if (waiter && waiter.keys.has(k)) {
        resolveWaiter({ type: 'click', key: k });
        return;
      }
      if (holdKeys && holdKeys.has(k)) return;
      showInfo(k);
    },
    showInfo,
    zoomTo(k: PartKey) {
      const p = PKEY[k];
      const t = root.worldToLocal(p.getWorldPosition(V3(0, 0, 0)));
      const top = p.userData.top as number;
      t.y += top * 0.3;
      const keep = curCam;
      void flyTo({ p: [t.x + 0.15, t.y + 0.3 + top * 0.4, t.z + 0.75 + top * 0.6], t: [t.x, t.y, t.z] }, 1.0);
      curCam = keep;
    },
    resetView() {
      void flyTo(curCam, 0.9);
    },
    pressButton(i: number) {
      resolveWaiter({ type: 'button', i });
    },
    skip() {
      if (!waiter || waiter.keys.size === 0) return;
      const first = [...waiter.keys][0];
      resolveWaiter({ type: 'click', key: first, skipped: true });
    },
    holdStart: startHold,
    holdEnd: endHold,
    labelSpots,
    steamSpot,
    /** World-space point the bench camera orbits around by default. */
    benchTarget() {
      return toWorld(CAMS.over.t);
    },
    benchCamera() {
      return toWorld(CAMS.over.p);
    },
  };
}

export type NaClEngine = ReturnType<typeof createNaClEngine>;

/** Microscope field of view: cubic NaCl crystals (some hopper-stepped), 0.5 mm scale bar. */
export function drawScopeImage(canvas: HTMLCanvasElement): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const W = canvas.width;
  const c = W / 2;
  const s0 = W / 520;
  g.save();
  g.beginPath();
  g.arc(c, c, c - 2, 0, 7);
  g.clip();
  const bg = g.createRadialGradient(c, c, 20, c, c, c);
  bg.addColorStop(0, '#fbfaf2');
  bg.addColorStop(0.75, '#ece8d6');
  bg.addColorStop(1, '#a9a48e');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, W);
  const items: [number, number, number, number][] = [
    [170, 170, 104, 0.12], [340, 135, 66, -0.2], [360, 305, 118, 0.05], [190, 362, 80, 0.35], [277, 243, 46, -0.1],
    [107, 282, 38, 0.5], [435, 215, 34, 0.2], [260, 435, 50, -0.3], [135, 102, 25, 0.1], [395, 418, 30, 0.7],
  ];
  for (const [x, y, s1, a] of items) {
    const s = s1 * s0;
    g.save();
    g.translate(x * s0, y * s0);
    g.rotate(a);
    g.fillStyle = 'rgba(210,222,226,0.55)';
    g.strokeStyle = 'rgba(60,70,78,0.85)';
    g.lineWidth = 2.2;
    g.fillRect(-s / 2, -s / 2, s, s);
    g.strokeRect(-s / 2, -s / 2, s, s);
    for (let k = 1; k <= 3; k++) {
      const t = s * (0.5 - k * 0.12);
      if (t < 4) break;
      g.strokeStyle = `rgba(60,70,78,${0.5 - k * 0.1})`;
      g.lineWidth = 1.3;
      g.strokeRect(-t, -t, 2 * t, 2 * t);
    }
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(-s / 2 + 3, -s / 2 + 3, s * 0.35, 3);
    g.restore();
  }
  g.fillStyle = '#1c2226';
  g.fillRect(c - 68 * s0, W - 78 * s0, 136 * s0, 6 * s0);
  g.font = `600 ${19 * s0}px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('0.5 мм', c, W - 88 * s0);
  g.restore();
}
