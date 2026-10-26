/**
 * Cold made visible: droplets of condensation on the outside of a cold vessel, turning to
 * white frost below 0 °C. Follows the measured temperature; never changes it.
 * (A refracting heat-shimmer sheet was tried: three.js transmission blurs what is behind it
 * into a frosted pane, so hot vessels rely on steam and the burner flame instead.)
 */
import { useEffect, useMemo } from 'react';
import { CanvasTexture, LatheGeometry, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three';
import { lazy } from '../utils/lazy';
import { radiusAt, type VesselProfile } from '../equipment/profiles';

/** Fogged glass with beads: a faint mist base, then drops with dark refracted rims and a highlight. */
function beadTexture(frost: boolean) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  if (x) {
    x.fillStyle = frost ? 'rgba(255,255,255,0.72)' : 'rgba(236,243,247,0.32)';
    x.fillRect(0, 0, 256, 256);
    let seed = frost ? 9 : 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (frost) {
      // Feathery ice crystals: short bright strokes in random directions.
      x.strokeStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 900; i++) {
        const cx = rnd() * 256,
          cy = rnd() * 256,
          a = rnd() * Math.PI,
          l = 2 + rnd() * 7;
        x.lineWidth = 0.6 + rnd() * 1.2;
        x.beginPath();
        x.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l);
        x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
        x.stroke();
      }
    } else
      for (let i = 0; i < 700; i++) {
        const cx = rnd() * 256,
          cy = rnd() * 256,
          r = rnd() < 0.08 ? 6 + rnd() * 6 : 1.5 + rnd() * 3.5;
        // A water bead lenses the view: dark rim, clear body, bright glint.
        x.fillStyle = 'rgba(70,86,96,0.55)';
        x.beginPath();
        x.ellipse(cx, cy, r, r * 1.08, 0, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = 'rgba(214,230,238,0.85)';
        x.beginPath();
        x.ellipse(cx, cy + r * 0.12, r * 0.72, r * 0.78, 0, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,1)';
        x.beginPath();
        x.arc(cx - r * 0.3, cy - r * 0.35, Math.max(0.6, r * 0.22), 0, Math.PI * 2);
        x.fill();
      }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}
const droplets = lazy(() => beadTexture(false));
const frostMap = lazy(() => beadTexture(true));

/** An open sleeve just outside the glass wall between two heights (no caps). */
function sleeve(profile: VesselProfile, from: number, to: number, offset: number) {
  const pts: Vector2[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const y = from + ((to - from) * i) / n;
    pts.push(new Vector2(radiusAt(profile, y) + offset, y));
  }
  return new LatheGeometry(pts, 36);
}

/** Condensation or frost on the outside of a vessel, up to the cold liquid's level. */
export function Condensation({ profile, bottom, top, temp }: { profile: VesselProfile; bottom: number; top: number; temp: number }) {
  const cold = Math.max(0, Math.min(1, (15 - temp) / 12));
  const frozen = Math.max(0, Math.min(1, -temp / 6));
  const height = Math.round(Math.max(0, top - bottom) * 400) / 400;
  const geometry = useMemo(() => (height > 0.004 ? sleeve(profile, bottom, bottom + height, 0.0025) : null), [profile, bottom, height]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  // The texture tiles about every 3 cm around the wall and up it.
  const material = useMemo(() => new MeshStandardMaterial({ transparent: true, depthWrite: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const r = radiusAt(profile, bottom + height / 2);
  // Each vessel tiles its own copy (the image is shared).
  const iced = frozen > 0.5;
  const map = useMemo(() => {
    const t = (iced ? frostMap() : droplets()).clone();
    t.needsUpdate = true;
    return t;
  }, [iced]);
  useEffect(() => () => map.dispose(), [map]);
  useEffect(() => {
    material.map = map;
    material.needsUpdate = true;
  }, [material, map]);
  useEffect(() => {
    map.repeat.set(Math.max(1, Math.round((2 * Math.PI * r) / 0.03)), Math.max(0.3, height / 0.03));
    material.opacity = Math.min(1, 0.25 + cold * 0.75);
    material.roughness = frozen > 0.5 ? 0.9 : 0.2;
  }, [material, map, cold, frozen, r, height]);
  if (!geometry || cold <= 0.02) return null;
  return <mesh geometry={geometry} material={material} renderOrder={4} userData={{ noOutline: true, noBatch: true }} raycast={() => undefined} />;
}
