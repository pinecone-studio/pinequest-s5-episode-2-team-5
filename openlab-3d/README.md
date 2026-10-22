# OpenLab 3D

A browser-based, explorable first-person virtual science laboratory (front end only).
Walk through a 40 m × 30 m facility — Main Hall, East Corridor, Physics Lab, Chemistry
Lab, Biology & Microscopy Lab and Storage Room — and run the Millikan Oil Drop
experiment at the hero station in the Physics Lab.

Every piece of equipment and furniture is a procedural 3D model built from three.js
geometries at real-world scale. No external assets are downloaded at runtime (fonts are
bundled from `@fontsource`, the environment map is rendered in-scene, all sounds are
synthesized with the Web Audio API).

## Run

```bash
npm install
npm run dev
```

Open the printed URL, wait for the loading bar, then click **Click to enter the lab**.

`npm run build` type-checks (strict TS) and produces a production build in `dist/`.

### Inside ChemQuest

In the ChemQuest repo this app lives in `openlab-3d/`. `npm run build:chemquest` builds it
with base `/openlab/` into `../public/openlab/`, which the Expo web app serves; the hub's
**OpenLab** building opens it full screen (`src/app/(game)/openlab.tsx`).

## Controls

| Key | Action |
| --- | --- |
| W A S D / ↑ ← ↓ → | Move |
| Mouse (click the view to capture it) | Look around |
| E (or click) | Interact / pick up |
| F | Inspect the focused or held object |
| Q | Drop / place the held item (ghost preview shows where) |
| Shift | Sprint |
| Space | Jump (can be disabled) |
| Tab | Tools drawer |
| N | Lab notes |
| M | Minimap |
| Esc | Release the mouse / pause |

**Keyboard-turn mode** (Settings → Look mode): ←/→ and Q/E turn, PageUp/PageDown tilt,
Enter interacts and Backspace places. On touch devices a virtual joystick (left half),
drag-to-look (right half) and E/F/Q/sprint buttons appear. All keys are remappable.

### Millikan station

1. Flip the **power** switch (red LED + lamp glow, mains hum).
2. Squeeze the **atomizer** bulb — glowing droplets appear in the chamber.
3. Look through the **eyepiece** (E). In the eyepiece: click a drop, keep polarity at 0,
   press **Space** to start/stop the stopwatch between two reticle lines, then
   **Record fall (1)**.
4. Set polarity to **+**, raise the voltage (scroll, ←/→ or the ▲▼ buttons; on the
   apparatus: scroll or hold E and drag the knob) until the drop rises or hovers, then
   **Record field run (2)** or **Balanced (3)**.
5. Use the **laptop**: the camera docks to the screen and the Drop Logger shows every
   measurement, the computed charge, q / e and a chart against whole multiples of e.

Physics: v = mg / (6πηr) with the field off gives r; under a field qE − mg = 6πηr·v,
E = V/d (d = 6 mm, η = 1.81 × 10⁻⁵ Pa·s, ρ = 886 kg/m³). Each droplet carries a random
charge n·e, so recovered charges cluster at integers.

## Project layout

```
src/
  store/        zustand stores: game (modes, focus, robot, log), settings (persisted),
                inventory (world items / held item), experiment (Millikan state), loading
  controls/     keyMap, Player (rapier kinematic character controller), PhysicsDriver
                (fixed ≤1/60 s substeps), pointer lock, global key/mouse dispatch
  world/        Lab, layout (floor plan, rooms, doors, portals), lighting, sky, effects,
                guided arrows, StaticBatch, performance helpers
    rooms/      MainHall, Corridor, PhysicsLab (+ physicsStations), ChemistryLab,
                BiologyMicroscopyLab, StorageRoom  — each lazy-loaded
    architecture/ Wall (merged), Window, Door (kinematic pocket doors), Floor, Ceiling, CeilingLight
    furniture/  LabBench (+ instanced BenchParts), WallCabinet, Sink, Stool, FumeHood,
                Shelf, Whiteboard, SafetyShower, FireExtinguisher, Decor
  equipment/    one component per model + equipmentCatalog.ts and the kind → model registry
  materials/    glass, plastic, metal, liquids, labPalette
  interaction/  Interactable, useRaycastFocus, Pickable, HeldItem, InspectMode, surfaces, spawn
  experiment/   millikanPhysics (pure functions), millikanSim (live droplets), director
  ui/           HUD and every overlay (menu, notes, tools drawer, robot, minimap,
                microscope view, laptop app, loading/start, pause, summary, touch)
  utils/        sounds, textures (procedural CanvasTextures), fonts, constants
```

### Swapping in authored models

Every equipment component accepts an optional `modelUrl`. When it is set, the
procedural model is replaced by the GLTF/GLB loaded with `useGLTF`, e.g.
`<Microscope modelUrl="/models/microscope.glb" />`.

## Rendering & performance notes

- **Quality presets** (Settings): Low (no post-processing, shadows or glass refraction),
  Medium (default), High. `PerformanceMonitor` + `AdaptiveDpr` scale the pixel ratio
  within the preset's range; the post-processing buffers are resized with it.
- **Draw calls**: walls/trim/windows are merged meshes; drawers, handles, stools,
  shelf stock, keys and test tubes are instanced; `StaticBatch` merges static meshes of
  every room and every equipment model per material after mount; microscopes use
  `<Detailed>` LODs.
- **Room visibility** uses portals (doors, interior windows, archway): a neighbouring
  room's contents render only while you are near an opening into it.
- **Glass LOD**: three.js re-renders every opaque object for the transmission pass when
  any transmissive mesh is on screen, so glassware farther than ~3 m swaps to an
  alpha-blended twin. Decorative stock (cabinet and shelf glassware, slides) always uses
  alpha glass.
- **Physics** is stepped manually in substeps of at most 1/60 s, so long frames never
  knock glassware over; pickables are dynamic rapier bodies with CCD.
- Measured in the dev preview on a 1024 × 768 viewport (Apple laptop): 60 fps in every
  room on Medium at DPR 1.5; High at DPR 2 drops to ~38 fps at the Millikan station
  until the performance monitor lowers the pixel ratio.

## Deliberate deviations from the brief

- `Environment preset="apartment"` downloads an HDR from a CDN, which conflicts with
  "no external asset downloads", so an equivalent studio environment is rendered locally
  with `<Lightformer>`s.
- Liquids: three.js cannot show a transmissive object through another transmissive one
  (the transmission buffer only contains opaque geometry), so with refractive glass the
  liquid is a glossy opaque tinted material that the glass refracts; on Low it is a
  semi-transparent tint inside alpha glass.
- Google Fonts is replaced by the same Inter/Poppins families bundled via `@fontsource`.
- Mouse look is a small custom pointer-lock handler (instead of drei
  `PointerLockControls`) so sensitivity, invert-Y, the ±85° clamp and hold-to-drag on
  the voltage knob share one input path.

In development builds `window.__lab` exposes stores and a deterministic frame stepper for
automated checks; it is not included in production builds.
