# OpenLab workbench — round 4

This supersedes the corresponding round-3 behavior. The free laboratory, Mongolian
interface, configurable keys, touch controls and shared `Mode` / `Panel` unions remain.
No Expo API, database schema, lesson JSON schema, ChemQuest XP/result contract or
deployment setting changed. The rebuilt child is included in `public/openlab`.

## Implementation

1. **Found → placed:** `workbench/session.ts` records actual inventory/portable pickup
   immediately, plays a tick and shows `✓ {name} олдлоо (n/total)` in a small white toast.
   Real placement on `chem-n4` separately sets `placed` and `✓ ширээнд`. Taking an item
   off the worktop removes its placed marker; putting it back restores it, including
   after preparation is complete. Preparation remains ready once completed. A required
   card near the station takes the real object when the hand is free; with an occupied
   hand it frames the target for measurement/pouring. Arbitrary wrong supplies remain usable.
2. **One ToolTab:** the separate `BenchDrawer.tsx` is removed. The original yellow
   OpenLab tab/header (with mobile clearance for the parent ChemQuest link), two shelves, category filters and shared-canvas 3D thumbnails
   now serve both walking and bench use. Required supplies are pinned above the normal
   catalog with the same found/placed markers. All **93** nearby stock choices remain:
   **43 apparatus/station parts + 50 reagents**, including the NaCl-kit category while
   another experiment is selected. Away from the bench the original 27-equipment /
   50-reagent catalog remains. Search accepts names, ids and reagent formulas. Tab is
   captured before typing guards, does not seat a walking player, and closes back to
   the same bench camera when already seated.
3. **Teacher mode:** the outlined indigo button has a 32 px minimum height and an icon.
   The bench guide retains `👩‍🏫 Багшийн горим` after preparation. Guidance and warnings
   remain visible; the bypass is explicit.
4. **Attempt lifecycle:** session ownership includes optional/wrong apparatus. Changing
   guides packs away the old attempt; starting/restarting clears its guide steps and
   preparation, despawns generated copies, clears mixtures/tool effects/observations,
   removes owned spills even off the worktop, and restores room objects to their original
   shelf/holder transforms and initial holder order. NaCl restores poses and initial
   stock contents. Old queued reaction feedback is cancelled. Continue retains state.
   Optional `Puddle.sourceIds` / `Burst.sourceId` metadata permits scoped cleanup.
5. **Controls:** seated E grabs the hovered/selected object; G remains an alias. Q places,
   F inspects/returns, Esc returns from inspection or exits the bench, and R uses/pours.
   Existing remapping and keyboard-look Enter/Backspace alternatives remain. Pickup,
   inspection, rotation, dosing and camera action buttons are touch-only; desktop retains
   information, exit and the requested molecule-viewer button. Bench wheel zoom uses
   actual wheel distance, so trackpads and large wheel gestures make useful progress;
   two-finger pinch stays with OrbitControls.
6. **Molecule viewer:** `chemistry/molecules3d.ts` holds atom/bond data, CPK colours,
   charged ions, polyatomic-ion/formula-unit diagrams and an explicitly symbolic fallback.
   `ui/MoleculeViewer.tsx` opens from the lens and vessel F inspection, provides species
   selection / `Бүгдийг`, OrbitControls, idle rotation, local-font camera-facing labels
   on every atom, and Mongolian element legend chips. H₂O has a 104.5° bend, H₂O₂ is
   non-planar, O₂ has a double bond, and K⁺ / I⁻ are unbonded charged spheres. Ionic
   solids are labelled as lattice/formula-unit diagrams rather than isolated molecules.
   H₂O₂ geometry uses the documented [NIST CCCBDB experimental data](https://cccbdb.nist.gov/expgeom2x.asp?casno=7722841).
7. **Incomplete peroxide observations:** zero-rate info observations are accepted without
   warning/blocking. H₂O₂ alone and H₂O₂ + soap explain slow decomposition; soap without
   H₂O₂ explains the missing reactant. Actual uncatalysed gas rates are retained rather
   than fabricated or rounded into an active reaction.
8. **KI cycle:** catalyst addition changes the observation key/episode immediately.
   The bounded collision model carries I⁻ → IO⁻ → I⁻ through two H₂O₂ contacts,
   generating H₂O and O₂ while K⁺ remains a spectator. Gold labels/highlighting identify
   the catalyst; the renderer exposes cycle counters for verification. Geometry/time
   are educational illustrations, not an SI molecular-dynamics calculation.
9. **Macro effects/audio:** bounded instanced foam, spill lobes, gas streams, steam wisps
   and settling precipitate clouds follow canonical foam, temperature, solid contents
   and observed rates. The floating gas label reads the actual gas product. Liquid
   colour interpolates smoothly toward the chemistry target. Reduced-motion/low modes
   use 24 macro instances per effect instead of 72; the existing 40/150 lens limits
   remain. Layered fizz/bubble/sizzle and eruption audio use the existing master gain.
10. **Success:** `ui/ExperimentSuccess.tsx` detects prepared-guide completion or observed
    expected products, allows the eruption to develop briefly, and presents the product
    model, equation, lesson explanation, success sound/confetti and the three requested
    actions. Continue keeps the mixture; retry starts preparation again. Presentation
    state is transient and does not introduce game modes. Nonchemical skill completion
    does not invent a chemical molecule when there is no observed product.

## Validation environment

Chrome/SwiftShader through the **root Expo campus hub → actual OpenLab hall door →
generated production iframe**, at 1440 × 1000 and a separate **390 × 844 touch-enabled**
context (`pointer: coarse`, touch points present). The final production child was also
reloaded inside the same parent. Low quality was exercised. Auth/profile/catalog HTTP
responses used local fixtures and the repository's real lesson definitions; no live
Supabase data was mutated. Browser page-error lists were empty. These are local embedded
UI/chemistry checks, not a live deployment, physical-phone or speaker-listening test.

## Required embedded-build checks

| # | Result | Evidence |
| --- | --- | --- |
| 1. Immediate pickup / worktop check | **PASS** | Walked to the real shelf, took `Тавиурын конус колбо`: `found=true`, `placed=false`, white `олдлоо (1/5)` toast; carried it to the bench and placed it: `placed=true`, `✓ ширээнд`. [Pickup](docs/workbench-round4/shelf-found.png), [placement](docs/workbench-round4/shelf-placed.png). |
| 2. One ToolTab in both modes | **PASS** | The same `Багажны шургуулга` dialog opened near the bench while walking, with **0** bench-exit buttons after closing; seated Tab opened the same component and returned to the bench. Focused-search Tab closed it. Final build shows **43 apparatus + 50 reagents**, pinned required cards and the normal thumbnails/categories. [ToolTab](docs/workbench-round4/tooltab.png). |
| 3. Visible teacher control at 390 px | **PASS** | Real touch context measured the button at **196.5 × 34 px**, fully within the viewport; tapping it left the persistent teacher badge visible. [Phone preparation](docs/workbench-round4/phone-teacher.png), [final mobile ToolTab](docs/workbench-round4/phone-tooltab.png). |
| 4. Experiment change cleanup | **PASS** | Prepared the NaCl kit, switched to `Зааны шүдний оо`, and sat down: previous apparatus disappeared, the white cleanup notice appeared, and elephant preparation started at **0/4**. The final build repeated this transition. [Fresh selected bench](docs/workbench-round4/experiment-cleanup.png). |
| 5. E/Q/F and desktop/touch UI | **PASS** | In mouse-look bindings, E took the live shelf flask, F entered/returned from inspection and Q placed it. Desktop pickup/zoom button counts were **0**; the real touch context showed **1 pickup, 1 F inspect, 1 zoom** control, and touch inspection/zoom worked. Wheel distance visibly changes the worktop framing. [Phone controls](docs/workbench-round4/phone-controls.png), [bench zoom](docs/workbench-round4/bench-zoom.png). |
| 6. Rotatable labelled H₂O₂ | **PASS** | Opened the viewer from vessel F inspection, selected H₂O₂, dragged and wheel-zoomed it. It rendered **O O H H**, with a symbol on each atom and `O — Хүчилтөрөгч` / `H — Устөрөгч` legends; no page errors. [Model after rotation](docs/workbench-round4/molecule-viewer.png). |
| 7. Soap info → KI cycle/rate jump | **PASS** | H₂O₂ + soap displayed the exact requested non-catalyst explanation; sampled O₂ rate **0.0000080148 mol/s**. Adding KI rekeyed to `catalyst=iodide`, showed I⁻/K⁺ and the cycle; a sample recorded **3 IO⁻ intermediates, 1 regenerated turnover** and **0.00179584 mol/s** (>200×). [Info](docs/workbench-round4/soap-observation.png), [catalysis](docs/workbench-round4/peroxide-catalysis.png). |
| 8. Strong effects / correct gas / audio | **PASS** | Peroxide/soap/KI produced visible overflow foam/wisps and **O₂↑**; actual Zn + HCl produced **H₂↑** with `Zn + 2H⁺ → Zn²⁺ + H₂↑`. WebAudio instrumentation recorded **672 gain-envelope events**, peak **0.361**, during the catalysis interaction. The headless check verifies synthesis/scheduling and master-gain routing; subjective speaker loudness was not measured. [Peroxide](docs/workbench-round4/peroxide-catalysis.png), [hydrogen](docs/workbench-round4/zinc-hydrogen.png). |
| 9. Product success moment | **PASS** | Real peroxide completion displayed `🎉 Амжилттай! H₂O + O₂ гарган авлаа`, rotating labelled product models, the balanced equation, elephant explanation and all three requested buttons. [Success](docs/workbench-round4/success.png). |
| 10. Continue vs restart | **PASS** | Continue retained **41.3 см³**. Menu retry returned to **0/4**, every found/placed marker false, **0 gas labels / 0 lenses**, and a clear bench. Store tests additionally verify cleared guide progress/mixtures, restored room and drawer apparatus, and removal of owned off-bench spills while retaining unrelated spills. [Restart](docs/workbench-round4/restart.png). |

## Commands

| Check | Result |
| --- | --- |
| `openlab-3d`: `npm run typecheck` | PASS |
| `openlab-3d`: `npm run build` | PASS |
| `openlab-3d`: `npm run test:workbench` | PASS — **22/22** |
| `openlab-3d`: `npm run build:chemquest` | PASS — regenerated `public/openlab` |
| Repo root: `npm run lint -- --no-cache` | PASS |
| Repo root: `npm run typecheck` | PASS |

Added tests cover real soap/no-change chemistry, catalyst episode re-keying and rate
increase, both iodide-cycle collision stages/regeneration, found/placed transitions,
fresh retry versus continue, room/drawer restoration, scoped spill cleanup, zero-rate
publishing and molecule geometry/charge invariants. Existing collision, stoichiometry,
chemical-observation and preparation-credit tests remain.

`TEAM.md` records the shared transient metadata and control/cleanup contracts. No commit,
push, PR merge or deployment was performed.
