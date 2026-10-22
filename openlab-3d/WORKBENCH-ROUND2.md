# OpenLab workbench, round 2 — implementation report

## Step 0: what exists in this checkout

This checkout uses the **free laboratory**, not the original seated `engine.goto()` script.
The engine's original scripted demonstration remains in the source, but the live
station uses `sandbox.ts` + canonical `useChemStore` mixtures. Reconnecting the old
step runner would overwrite user placements and contents.

| Requested feature | Actual file / component before the changes |
| --- | --- |
| Open workbench zone | `src/experiments/nacl/NaClStation.tsx` / `NaClStation`: distance from `[8.254, BENCH_HEIGHT, -14.585]` sets `useSandbox.near` within 2.4 m. Mounted outside `StaticBatch` by `world/rooms/ChemistryLab.tsx`. |
| Approaching the bench | `NaClHUD.tsx` displayed NaCl guidance unconditionally when near, independent of `useLabStore.active`. `HUD.tsx` hid the ordinary `ExperimentCard` near the station. There was no separate zone-based experiment loader. |
| Orange instruction | No standalone orange approach-banner component exists. `NaClHUD.tsx` had amber buttons, an amber warning box and an amber bottom instruction chip, with a substantial instruction panel triggered by proximity. The newer hold button was `bg-amber-300`, not the reference snapshot's `bg-orange-600`. These approach triggers/markup were removed; the hold control now uses neutral slate. Normal yellow navigation and the tools side tab remain. |
| Lessons and data | `lab/experiments.ts` exposes the JSON catalog from `src/data/experiments.json`; the already-existing parent bridge can replace it with Supabase-published guide rows. The independent physical NaCl station used `nacl/data.ts` and `guidance.ts`. |
| Experiment selection | `ui/MenuPanel.tsx` / `ExperimentsTab`. `useLabStore.active`, persisted together with guide progress under `openlab3d-experiments`. It previously defaulted to `safety`; `lab/announcer.ts` automatically selected another experiment on completion. |
| Tab / tools | `HUD.tsx` excluded `ToolTab` in bench mode. The bench keyboard branch did not process Tab. Walking tools deliberately use `mode: ui`, `panel: tools` and `resumeWalk()`. Those pathways are retained for walking. |
| Robot | `ui/RobotAssistant.tsx` reacts to skills and explicit clicks; `lab/announcer.ts` reacts to chemistry/guide events. Neither has its own NaCl proximity-selection trigger. The robot remains hidden while seated. |

## Resulting behavior

1. Choose an experiment in **Цэс → Туршилт**. The built-in physical NaCl station is
   now a normal selectable entry with stable id `nacl`; its shortcut explicitly
   chooses it and moves the player to the workbench.
2. Look at the worktop and press the existing interaction key (**E**, or the
   configured equivalent). The existing white interaction chip is used. **V** near
   the bench is still available. No approach instruction panel appears.
3. With no choice, the bench is empty and says **Туршилт сонгоогүй байна**.
   With a choice, it starts in **Бэлтгэл**. Required names form a compact scrollable
   checklist. The needed movable objects are absent until collected.
4. Tab / the yellow side tab opens a **separate seated drawer**, without changing
   `Mode` or `panel`. During preparation it offers required supplies and other lab
   equipment/reagents. A test tube, thermometer, or wrong reagent can be chosen as
   a distractor; inappropriate choices get **Энэ туршилтад хэрэггүй** inline.
   Duplicate generic copies of NaCl's own correct tools are excluded from its choices.
5. The accepted simpler preparation alternative is implemented: choose the correct
   stock from the drawer. Required NaCl meshes appear at their original positions;
   ordinary guide recipes use the existing inventory spawn pipeline on this bench.
   Shelf-to-bench recognition is not an additional preparation pathway.
6. **хийж үзүүлэх** collects the remaining required supplies. Step chips also finish
   preparation and choose the instruction to read. They do not fabricate chemistry
   or run the legacy scripted engine over the student's current mixtures.
7. Once ready, the drawer lists only the selected experiment's supplies, with
   formulas, swatches, stock remaining/used, hazards and apparatus purposes. Clicking
   a card frames and highlights the actual object; HCl selects the cylinder/beaker
   if one already contains the acid. The lamp's fuel quantity is explicitly marked
   as unmodeled, rather than inventing a measured quantity.
8. Tab or Esc closes this drawer and keeps the current camera and experiment.
   A second Esc exits inspection if active; Esc in the normal bench view stands up.
9. Click / E selects an apparatus. G or **Авах / зөөх** carries it. Q and cursor
   placement, hold-to-pour/stir, exact 1/5 cm³ NaCl doses and deep zoom remain.
10. F / **Барьж шинжлэх** frames the actual live scene object, including its liquid,
    colour, powder and crystals. In this view left drag rotates and wheel/pinch
    zooms. Esc restores the saved bench pose. A carried object is frozen spatially
    during inspection so it does not chase the moving camera. No catalog model is
    substituted for bench inspection. The compact contents panel remains inline.
11. The NaCl macroscopic chemistry publishes a vessel id, temperature and actual
    reaction/evaporation rate. A projected circular lens follows that vessel. A thin
    connector shows its anchor when viewport clamping moves the lens away from it.
    The old corner 2D molecule panel is no longer mounted.
12. The lens renders instanced atom spheres in 3D. Carbonate needs two proton collision
    events before becoming CO₂ plus water; CO₂ rises out of the liquid region.
    Na⁺ and Cl⁻ remain spectators in the acid reaction. Evaporation removes water
    and arranges alternating ions into a bounded cubic lattice. CPK-like colours,
    Mongolian legend chips, a coloured equation strip and product pulses are included.
13. Molecular motion uses a 3D spatial hash and equal-mass elastic collision impulses.
    Speed varies with temperature. The lens is an educational magnification model;
    its lengths, particle counts and time scale are not SI molecular dynamics or a
    direct count of the vessel's molecules.
14. Procedural collision ticks (at most one every 140 ms), fizz (240 ms cadence scaled
    by production rate), and crystal crackle use the existing Web Audio engine.
    Audio still requires the existing initial user gesture and respects master volume.
15. **Урвалд автоматаар ойртох** defaults on. NaCl reaction onset eases to its vessel
    over 0.7 s. The general chemistry engine also frames reacting prepared inventory
    vessels. A canvas drag/wheel immediately cancels camera motion. Low quality or
    reduced motion disables autozoom and caps the lens at 40 particles instead of 150.
16. Pin keeps the lens visible after a reaction; close dismisses the current episode.
    An unpinned lens fades when its reaction rate reaches zero. Each lens renderer
    owns its canvas, so changing quality or leaving/re-entering cannot reuse a lost
    WebGL context. Its GPU resources and animation loop are released on cleanup.
17. Walking away pauses the prepared experiment's chemistry. Its selection, found
    supplies, contents and progress survive walking/panels. Ordinary free-lab vessels
    keep their original general simulation. Switching recipes hides the previous
    recipe's spawned bodies while retaining their contents and saved poses.
18. The normal walking Tab drawer, generic F inspect, storage, instrument actions,
    inventory physics, throwing and breakage retain their existing pathways.

## Persistence and team contracts

- `Mode` and `Panel` unions in `store/useGameStore.ts` are **unchanged**. Bench drawer
  state and the inspect subview live in bench-owned stores.
- Shared `SettingsState` adds `reactionAutoZoom: boolean`, default `true`, persisted
  with the existing settings. The team should include this field when constructing
  complete settings objects.
- `openlab3d-experiments` is now persistence **version 2**. A version 1 migration keeps
  completed step progress but clears the old active id once: that version could
  auto-select lessons, so its id is not reliable evidence of a student's choice.
  New explicit choices persist normally.
- New transient `useWorkbench` state holds per-experiment preparation and spawned
  object identities. It is tab-local. Mixtures and physical apparatus are still not
  serialized across a full page reload. This task guarantees walking/panel continuity,
  not cloud or reload restoration of a physical simulation.
- `SandboxState` adds transient `reaction` metadata. `BenchVisual` now carries current
  liquid colour as well as levels/solids/crystals. Bench camera commands add inspect,
  back and reaction focus; these are OpenLab-local APIs.
- No new cross-app URL parameter or message contract was added. The actual app
  already had a public catalog postMessage bridge; this task leaves it intact.
- The built-in `nacl` guide is appended locally even when remote rows replace the
  other guides. This is not a new database row. No Supabase schema/data was changed.
- Preparation mappings cover the existing 14 bundled guide ids plus `nacl`. A future
  unknown remote guide remains readable but needs an explicit apparatus mapping in
  `session.ts` before it can have an automatic physical preparation setup. Arbitrary
  apparatus/chemistry cannot be inferred safely from prose materials strings.
- No message was sent to other owners. These contracts are recorded in `TEAM.md`
  for review with the PR.

## Every source/config/document file changed

Paths below are relative to `openlab-3d/`.

| File | Reason |
| --- | --- |
| `package.json` | Adds reproducible `test:workbench`; no dependencies changed. |
| `src/experiments/workbench/session.ts` (new) | Preparation lists for all existing recipes, per-recipe sessions, collection, distractor feedback, stock amounts, visibility and pause helpers. |
| `src/experiments/workbench/BenchDrawer.tsx` (new) | Seated-only searchable supplies drawer and side tab, without mode changes. |
| `src/experiments/workbench/molecules.ts` (new) | Pure hard-sphere spatial-hash collision model, two-proton carbonate chemistry and cubic lattice. |
| `src/experiments/workbench/ReactionLens.tsx` (new) | Vessel-anchored 3D renderer, legends/equation, pulses, audio cadence, pin/close/fade and resource cleanup. |
| `src/experiments/nacl/lesson.ts` (new) | Selectable local NaCl guide, stable step ids and completion events. |
| `src/experiments/nacl/NaClStation.tsx` | White-prompt bench entry, preparation visibility, live F camera/restore, generic highlight, reaction autozoom and progress events. |
| `src/experiments/nacl/NaClHUD.tsx` | Removes proximity guidance/amber banner markup and old 2D panel; adds compact selected-guide/preparation UI, live inspection and reaction lens. |
| `src/experiments/nacl/bench.ts` | Begins preparation on entry; closes bench-owned UI on exit; explicit NaCl choice in shortcut. |
| `src/experiments/nacl/engine.ts` | Visibility/projected-point/live-object APIs, live liquids/powder/crystals, hides the retort stand until collected with its funnel; legacy 2D routine no longer called by free-play. |
| `src/experiments/nacl/guidance.ts` | Optional explicitly chosen instruction index. |
| `src/experiments/nacl/sandbox.ts` | Publishes vessel/rate/temperature metadata from actual kinetics. |
| `src/experiments/nacl/view.ts` | Bench-owned inspect state and camera commands. |
| `src/controls/useGameKeys.ts` | Seated Tab/Esc hierarchy, E selection, G pickup and F live inspection; walking drawer routing retained. |
| `src/interaction/HeldItem.tsx` | Exposes the live held visual for inspection and freezes its pose during the subview. |
| `src/interaction/Pickable.tsx` | Hides inactive recipe bodies and disables shadow casting on newly prepared bench visuals. |
| `src/lab/experiments.ts` | Includes local NaCl alongside bundled/remote guide catalog. |
| `src/lab/announcer.ts` | Removes automatic next-lesson selection. |
| `src/store/useLabStore.ts` | Null default selection, selected-only guide progress, v1→v2 selection migration. |
| `src/store/useSettingsStore.ts` | Persisted autozoom toggle and default. |
| `src/ui/HUD.tsx` | Mounts the bench drawer while keeping walking ToolTab intact. |
| `src/ui/MenuPanel.tsx` | Explicit recipe selection and current bench explanation. |
| `src/ui/SettingsPanel.tsx` | Mongolian autozoom setting. |
| `src/ui/SummaryScreen.tsx` | Clears transient preparation sessions on full restart. |
| `src/utils/DebugBridge.tsx` | DEV-only access to the actual bench runtime stores/commands for verification. |
| `src/utils/sounds.ts` | Three new synthesized SoundName entries, using existing master audio. |
| `src/world/ChemSim.tsx` | Pauses prepared recipe contents while away, excludes dormant burners, and frames onset of general bench reactions. |
| `tests/molecules.test.mjs` (new) | Collision conservation, stoichiometric collision reaction, no unbacked reaction, bounded evaporation/lattice checks. |
| `src/experiments/nacl/README.md` | Replaces superseded free-bench usage with current controls/selection/preparation contract. |
| `TEAM.md` | Records shared settings/persistence/bench contracts; historical contract is marked superseded. |
| `WORKBENCH-ROUND2.md` (new) | This report, step-0 findings, complete change list and verification. |

The already-tracked `../public/openlab/index.html` and hashed asset outputs are regenerated
by `build:chemquest`. The old hashed chunks are replaced by the generated chunks referenced
by the new index. Fonts and other unchanged assets are retained. No Expo source changed.

### Exact generated output changes

All paths here are relative to the repository root; each replacement is produced by
`npm run build:chemquest`, not edited by hand.

| Removed chunk | Replacement | Purpose |
| --- | --- | --- |
| `public/openlab/assets/index-6_4guT36.js` | `public/openlab/assets/index-8FG-or0i.js` | Application code including the bench improvements. |
| `public/openlab/assets/index-Dmws9frD.css` | `public/openlab/assets/index-Z1jhhXaI.css` | Compiled styles for the bench drawer, lens and compact UI. |
| `public/openlab/assets/physics-DGx563Xv.js` | `public/openlab/assets/physics-lWNTGeCm.js` | Regenerated physics chunk references. |
| `public/openlab/assets/post-epgf_oCe.js` | `public/openlab/assets/post-BINXiW--.js` | Regenerated postprocessing chunk references. |
| `public/openlab/assets/r3f-CTVeAo3J.js` | `public/openlab/assets/r3f-DRfKhx5H.js` | Regenerated React Three Fiber chunk references. |
| `public/openlab/assets/three-BS5j-76V.js` | `public/openlab/assets/three-DEnvIbW3.js` | Three.js chunk with newly used helpers/instancing APIs. |

`public/openlab/index.html` references these new hashes. Existing generated fonts did
not change. These generated outputs are tracked in this repository; `dist/` is ignored.

## Verification

- OpenLab `npm run typecheck`: passed.
- OpenLab `npm run build`: passed.
- OpenLab `npm run build:chemquest`: passed; embedded static files regenerated because
  the repository already tracks them.
- OpenLab `npm run test:workbench`: 4/4 passed on Node 24. Tests require Node 22.6+.
- Root `npm run test:experiments`: 6/6 existing catalog tests passed.
- `git diff --check`: passed.
- Root `npm run lint` and `npm run typecheck` were run. Both stop on the pre-existing
  missing local `@expo-google-fonts/nunito` installation imported by `src/app/_layout.tsx:8`.
  Root `package.json` already declares that dependency. No root source/dependency
  files were changed to work around this unrelated environment problem.

Headless Chrome checked the actual application stores, keys, drawer controls and scene:

- Empty unselected bench; preparation checklist and a rejected test-tube distractor.
- Correct supplies collected, with demonstration completing preparation.
- Seated Tab open/close, reagent focus and stable bench mode.
- F on a live cylinder containing 37 cm³; drag rotation and wheel zoom; Esc returns.
- Actual held carbonate transfer into 50 cm³ HCl opens the lens. The low-tier run
  recorded collisions, new products and CO₂ escape, rather than a static animation.
- Medium tier: autozoom from roughly 80 cm to 16 cm, 150-particle cap, collision/fizz calls.
- Pin/unpin and automatic fade; reduced-motion 40-particle cap with no autozoom and audio calls.
- Evaporation lens: water escapes, lattice sites form and crackle calls occur.
- Walking pauses contents unchanged and returning resumes the same selected recipe.
- 390×844 narrow layout, side-tab drawer and close controls.
- The generated production files also passed desktop and true touch-enabled browser
  checks using only UI controls: menu shortcut, actual touch E entry, preparation,
  drawer, F inspection and zoom. No page errors, horizontal overflow, or production
  debug bridge.
- Switching to Elephant Toothpaste prepares its cylinder/H₂O₂/soap/KI, hiding NaCl apparatus.
- A real H₂O₂/soap/KI transfer generates foam and frames that cylinder; generic
  framing excludes invisible particle-pool bounds. The legacy v1 selection migration
  retains progress while clearing its automatic choice; explicit v2 choices survive reload.
- Walking Tab and normal F inspection still use `ui` and `inspect` respectively and return to walk.
- Full NaCl chemistry regression: 50 cm³ of assumed 1 M HCl gives 2.922 g NaCl and
  600 cm³ CO₂; filtering, heating, cooling, drying and slide sampling preserve mass
  (2.902 g on watch glass plus 0.020 g sample). Copper ions survive transfers into/out
  of NaCl vessels. Ordinary R transfer conserves chloride. Storage pickup/return,
  original burner E/G callbacks, throwing and session restart also passed.

Remaining practical limits: these browser checks use software WebGL and do not certify
FPS on a particular classroom phone. Real device audio loudness and multi-touch pinch
feel still merit a human check. The microscopic motion is intentionally illustrative;
this is not a general molecular dynamics or fluid simulation. No publishing, deployment,
commit, push, or database mutation was performed for this task.
