# OpenLab 3D

A browser-based, explorable first-person virtual chemistry laboratory (front end only).
Walk around a 14 m × 12 m Chemistry Lab, open the labelled drawers and cabinets, take out
any of 30 kinds of equipment and 50 reagents, pour and mix them, and watch reactions play
out by real chemistry: precipitates, gases, indicator colors, heat, crystals and fire.
Glass breaks when it falls, spills make puddles, and a 14-experiment guide walks you
through classic school experiments step by step.

All in-lab text — menus, prompts, the robot assistant, equipment descriptions, signs,
posters and the whiteboard — is in Mongolian.

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
| G | Pick up an item even when E does something else (Bunsen burner, balance) |
| R (hold) | Use the held item on the focused thing: pour (stream speeds up the longer you hold), draw from a bottle, drip with a pipette or dropper, scoop with a spatula, stir, measure temperature / pH, filter, dip the nichrome loop and hold it in a flame, heat a gripped vessel over a burner, cover or extinguish a fire, fill / empty at the sink, dispose of waste, wipe a spill |
| Q | Also puts the held item into an open drawer, cabinet or test-tube rack in focus |
| T (hold) | Throw the held item (longer press = harder); glass breaks on hard impacts |
| Mouse wheel | Burette flow (closed / drops / slow / fast) |
| C | Free the mouse to click HUD buttons; press again (or click the view) to take it back |
| Shift | Sprint |
| Space | Jump (can be disabled) |
| Tab | Tools drawer |
| N | Lab notes |
| M | Minimap |
| Esc | Release the mouse / pause |

**Keyboard-turn mode** (Settings → Look mode): ←/→ and Q/E turn, PageUp/PageDown tilt,
Enter interacts and Backspace places. On touch devices a virtual joystick (left half),
drag-to-look (right half) and E/F/Q/sprint buttons appear. All keys are remappable.

### Equipment, storage and chemistry

Every piece of equipment is a loose, physical rapier body that can be picked up, carried,
placed, thrown and inspected (F). Glass and porcelain shatter above ~3.5 m/s impacts
(shards + a puddle of the contents); upright vessels spill when knocked over; walking into
items on the floor pushes them. Tongs and the test-tube holder grip items (E while holding
them), which is required for hot vessels and for heating glass over a flame.

Every bench drawer and cabinet is a labelled storage holder (`src/interaction/holders.ts`):
drawers hold equipment by category (small tools, glassware, heating, measuring, test tubes,
safety, filtration, dishes); cabinets hold reagents (acids, bases, salt solutions,
indicators, solid salts, metals, special reagents, water & dyes); the yellow cabinet holds
ethanol. Contents appear when opened; E takes an item, Q puts one back. Test-tube racks
hold real tubes.

The chemistry engine (`src/chemistry/`) tracks moles: strong ions, weak acid/base systems
(acetate, ammonia, carbonate), molecules and solids. pH comes from the charge balance;
hydroxides and salts precipitate by Ksp; metals react with acid or displace less active
metals; carbonates fizz; H₂O₂ decomposes on KI/MnO₂ (foam with soap); permanganate is
decolorized; Fe³⁺/SCN⁻, Cu²⁺/NH₃ and starch/iodine give color complexes; dissolving is
endo- or exothermic; burners heat vessels on a tripod (boiling, evaporation to crystals,
dehydration of CuSO₄·5H₂O, charring sugar); ethanol ignites and is put out by covering or
CO₂. Colors follow Beer–Lambert absorption; suspended solids make the liquid cloudy, then
settle into a sediment layer. Flame tests color the burner flame by cation.

Every reaction is announced (toast, notebook, robot) and drives the experiment guide in
the menu's **Experiments** tab (`src/lab/experiments.ts`), whose active experiment is
shown at the top left.

### Bench skills

The menu's **Experiments** tab, the robot assistant and the end-of-session lab report
track four bench skills:

1. **Light a Bunsen burner** on one of the island benches (E toggles the flame).
2. **Tare the analytical balance** on the west bench, then place glassware on its pan —
   the display shows the summed catalog mass minus the tare.
3. **Raise the fume-hood sash** on the north wall.
4. **Mix two substances** so that they react (R).

Each action is also written to the activity log in the lab notebook (N).

## Project layout

```
src/
  store/        zustand stores: game (modes, focus, robot, log), settings (persisted),
                inventory (world items / held item), experiment (station state and
                bench skills), loading
  controls/     keyMap, Player (rapier kinematic character controller), PhysicsDriver
                (fixed ≤1/60 s substeps), pointer lock, global key/mouse dispatch
  world/        Lab, layout (floor plan and walls), lighting, sky, effects, StaticBatch,
                performance helpers
    rooms/      ChemistryLab
    architecture/ Wall (merged), Window, Floor, Ceiling, CeilingLight
    furniture/  LabBench (+ instanced BenchParts), Sink, Stool, FumeHood, Shelf,
                Whiteboard, SafetyShower, FireExtinguisher, Decor
  equipment/    one component per model + equipmentCatalog.ts and the kind → model registry
  materials/    glass, plastic, metal, liquids, labPalette
  chemistry/    species, reagents, mixture model, equilibrium (pH, Ksp), kinetics, colors, texts
  lab/          lab event bus, observation tracking, announcer, spills, experiment guide
  physics/      breakage and impact sounds
  interaction/  Interactable, useRaycastFocus, Pickable, HeldItem, InspectMode, surfaces, spawn,
                actions (R), holders + StoredItems (drawers, cabinets, racks), live bodies
  ui/           HUD and every overlay (menu, notes, tools drawer, robot, minimap,
                loading/start, pause, summary, touch)
  utils/        sounds, textures (procedural CanvasTextures), fonts, constants
```

### Swapping in authored models

Every equipment component accepts an optional `modelUrl`. When it is set, the
procedural model is replaced by the GLTF/GLB loaded with `useGLTF`, e.g.
`<BunsenBurner modelUrl="/models/bunsen-burner.glb" />`.

## Rendering & performance notes

- **Quality presets** (Settings): Low (no post-processing, shadows or glass refraction),
  Medium (default), High. `PerformanceMonitor` + `AdaptiveDpr` scale the pixel ratio
  within the preset's range; the post-processing buffers are resized with it.
- **Draw calls**: walls/trim/windows are merged meshes; drawers, handles, stools,
  shelf stock and test tubes are instanced; `StaticBatch` merges the lab's static meshes
  per material after mount.
- **Glass LOD**: three.js re-renders every opaque object for the transmission pass when
  any transmissive mesh is on screen, so glassware farther than ~3 m swaps to an
  alpha-blended twin. Decorative stock (shelf glassware) always uses alpha glass.
- **Physics** is stepped manually in substeps of at most 1/60 s, so long frames never
  knock glassware over; pickables are dynamic rapier bodies with CCD.
- Measured in the dev preview on a 1024 × 700 viewport (Apple laptop): 60 fps on Medium.

## Deliberate deviations from the brief

- `Environment preset="apartment"` downloads an HDR from a CDN, which conflicts with
  "no external asset downloads", so an equivalent studio environment is rendered locally
  with `<Lightformer>`s.
- Liquids: three.js cannot show a transmissive object through another transmissive one
  (the transmission buffer only contains opaque geometry), so with refractive glass the
  liquid is a glossy opaque tinted material that the glass refracts; on Low it is a
  semi-transparent tint inside alpha glass.
- Google Fonts is replaced by the same Inter/Poppins families bundled via `@fontsource`.
  The bundled troika fonts are Latin-only subsets, and troika would fetch missing glyphs
  from a CDN, so Mongolian signs are drawn as canvas textures with the DOM fonts (whose
  Cyrillic and Cyrillic-ext subsets cover Ө and Ү) instead of `<Text>`. The lab mounts
  once those subsets have loaded (`canvasFontsReady`). Instrument readouts (`g`, `m/s`)
  stay in SI symbols.
- Mouse look is a small custom pointer-lock handler (instead of drei
  `PointerLockControls`) so sensitivity, invert-Y and the ±85° clamp share one input path.

In development builds `window.__lab` exposes stores and a deterministic frame stepper for
automated checks; it is not included in production builds.
