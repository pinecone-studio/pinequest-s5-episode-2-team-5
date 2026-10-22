# OpenLab workbench — round 3

This supersedes the behavior described in `WORKBENCH-ROUND2.md`; that file is retained as history.
The free laboratory, the same room/camera, Mongolian interface, configurable keys and touch controls remain in use.
No `Mode` or `Panel` union, database schema, experiment JSON schema, ChemQuest XP/result contract, or deployment setting changed.

## Implementation

- **Always-open catalog:** `workbench/BenchDrawer.tsx` uses the same complete apparatus/reagent catalog before, during and after preparation. Required entries are pinned, with found markers; other supplies remain available. Wrong choices show guidance and still spawn. Search remains available. A newly spawned inventory object is framed after its actual Interactable registers, fixing the registration timing race that previously made a first click appear ineffective.
- **One nearby Tab path:** `controls/useGameKeys.ts` handles nearby-walk and bench Tab in the window capture phase, before input typing guards. Nearby walking enters the bench camera and opens the same drawer. Away from the station the ordinary tools UI still applies. Remapped tools keys remain supported.
- **Selection:** `HUD.tsx` keeps `ExperimentCard` visible while walking near the bench. Bench mode renders only the compact bench guide. `openNaClExperiment()` now moves the player only; the menu has a separate explicit NaCl-selection button. Version-2 selection persistence remains intact.
- **White instruction styling:** the bench side tab, instruction chips, toast/help text, preparation list, reaction equation/controls and inspection safety panel use white/neutral backgrounds. Hazard text inside substance details may remain amber. Existing general navigation controls are not proximity instructions.
- **Actual preparation:** `session.ts` subscribes to inventory and portable pickup/release transitions. A drawer click only spawns or frames; a required item gets a check when its real identity has been picked up and then placed on `chem-n4`. Inventory throwing/storage does not masquerade as placing on the worktop. Bounds correspond to the actual 2.6 × 0.7 m worktop, including small supports. Reusing ordinary compatible glassware is accepted, including NaCl glassware equivalents; liquid carbonate stock is deliberately not mistaken for the textbook's solid carbonate jar. Wrong objects are accepted with feedback. Guide progress starts only after preparation; real observations and measurement counts still record during preparation. A small `Алгасах (багшийн горим)` link is the explicit bypass; step chips no longer auto-prepare the bench.
- **Finding help:** `PreparationHints.tsx` reads existing holder categories and stock metadata to name the drawer, cupboard or room item. `WorkbenchRuntime.tsx` projects up to three subtle white labels and outlines on actual matching objects/holders, at 4 Hz without per-frame React updates. Static shelf glassware needs bounds-derived positions because its mesh offset is inside an unpositioned group. Shelf stock is exempted from its own coarse shelf collision hull in the same way stored drawer contents already were, so the real object can be focused and picked up.
- **Shared chemistry observations:** `chemistry/reaction-view.ts` describes actual `equilibrateHeat()` transfer results and `kinetics.step()` results. `lab/reaction-view.ts` publishes vessel id, real reactants/products, rate, temperature, equation, explanation, effect and episode expiry. This is transient local display state; it does not independently create chemical material.
- **Reaction coverage:** carbonate/acid → CO₂, metal/acid → H₂, salt/hydroxide precipitation, strong/weak neutralisation, peroxide → O₂, evaporation/crystals; generic observations cover actual complex/indicator changes, starch/iodine, dissolution and less common modeled transformations. Known equations use chemical stoichiometry; an unfamiliar transformation uses an explicitly illustrative symbolic fallback with actual species labels. NaCl's accelerated textbook path publishes into the same observation stream. General transfers involving ordinary portable vessels now use the existing equilibrium solver rather than just concatenating mixture contents.
- **One molecular lens:** `ReactionLens.tsx` is mounted once in the HUD. Actual focused/held reacting vessels qualify in walking, selected/reacting worktop vessels qualify in bench mode, and the inspected vessel qualifies in ordinary F inspection. The same bounded instanced-particle model, elastic contacts, gas escape, settled precipitates and ion lattice are used. Low/reduced-motion quality caps particle populations at 40; otherwise 150. The rate controls reaction credit and procedural collision/fizz/crackle audio. Zero rate stops new product conversion. Equation and Mongolian explanatory sentence stay with the particle view. Pin and close apply to observed reaction episodes; GPU resources are disposed on cleanup.
- **F inspection:** ordinary inventory and shelf apparatus retain normal rotate/zoom inspection with canonical live mixtures. Bench F or its equivalent button uses the actual room object and restores the prior camera on return. Ordinary inspect runs chemistry at 10 Hz while its background room is frozen; the projection belongs to its own camera. Bench details now list real dissolved species and solid quantities for ordinary glassware as well.

## Validation environment

Production child assets are generated by `npm run build:chemquest` into `../public/openlab`.
Browser checks use Chrome/SwiftShader and the root Expo web app, starting at the campus hub and clicking the actual OpenLab hall so the player walks to its door. The child is the generated production iframe; `window.__lab` is absent. Auth/profile and catalog HTTP responses use local fixtures, with the repository's real experiment definitions. These are UI/chemistry checks, not a live Supabase integration or deployment test.

## Required embedded-build checks

| # | Result | Observed evidence |
| --- | --- | --- |
| 1. Non-NaCl guide near the station | **PASS** | Selected the actual catalog title `Саармагжуулах урвал — титрлэлт`, used the station waypoint, and observed that title with its five preparation items while walking. No NaCl instruction card appeared. The specified instruction-file color audit finds only permitted amber hazard **text**, with no yellow/amber/orange instruction backgrounds. |
| 2. Same complete drawer | **PASS** | No selection: **93** cards in both nearby-walk → Tab and V → Tab. Titration selection: **5 required + 88 other** cards, including after preparation. Tab from focused search closed the drawer (remaining drawer count **0**) and reopened it. |
| 3. Actual finding and placement | **PASS** | Walked to room shelving, aimed at `Тавиурын конус колбо`, picked it up with G, carried that same live object to the station and placed it on the worktop: **0/5 → 1/5**, `data-supply="erlenmeyer" data-found="true"`. Separately, spawning an Erlenmeyer left its marker **false** until pickup/placement. A wrong beaker could be placed and showed `Энэ туршилтад хэрэггүй. Тавихыг хориглоогүй.` See [shelf delivery](docs/workbench-round3/shelf-delivery.png). |
| 4. Three different chemistry cases | **PASS** | UI pickup plus 5 cm³ transfers produced [HCl/NaOH](docs/workbench-round3/neutralisation.png): `H⁺ + OH⁻ → H₂O`, **8 collisions / 3 product events**; [AgNO₃/NaCl](docs/workbench-round3/precipitation.png): `Ag⁺ + Cl⁻ → AgCl↓`, **6 / 2**; and [H₂O₂/KI](docs/workbench-round3/peroxide.png): `2H₂O₂ → 2H₂O + O₂↑ (KI — катализатор)`, with **16 / 1** in the initial rate-driven lens sample. Each rendered a Mongolian explanatory sentence. Web Audio instrumentation counted **23 oscillator** and **32 buffer-source** creations during the peroxide interaction; the headless browser is muted, so this verifies synthesis/scheduling, not speaker loudness. These are the titration, precipitation and peroxide experiment chemistries; keeping the titration guide selected also verified that its preparation/guide does not lock other chemistry. |
| 5. Normal vessel F in both modes | **PASS** | A normal `graduatedCylinder` (not `nacl-*`) showed **10.0 cm³**, H₂O₂, K⁺ and I⁻ in bench inspection; drag and + zoom worked. Carried it into walking and pressed F: ordinary inspection showed **10 ml / 100 ml**, live concentration/temperature, drag rotation and wheel zoom. Reaction-lens counts were **1 in walk** and **1 in ordinary inspect**, with zero page errors. See [live inspection](docs/workbench-round3/live-inspection.png). |
| 6. Waypoint preserves selection | **PASS** | `NaCl ширээнд очих →` left the chosen titration title and preparation list unchanged. Reloading the production child twice retained that selected title; only transient physical/preparation state reset. Explicit `NaCl туршилтыг сонгох` remains a separate action. |

The robot's preparation success call and sound occur only at the transition to a ready
worktop. For later mixing checks, the explicitly labeled teacher bypass supplied remaining
stock; it was **not** used for the shelf-delivery or spawn-versus-placement checks.

Additional mobile verification: **PASS**, true 390 × 844 Chrome touch context entered
through the root hub door (`ontouchstart=true`, coarse pointer true). Touch interaction
entered the workbench, search found NaOH, and [the drawer](docs/workbench-round3/touch-drawer.png)
fit without horizontal overflow. [Touch inspection](docs/workbench-round3/touch-inspection.png)
opened a normal cylinder, and the zoom control changed its logarithmic distance slider
from **60 → 55**. The final rebuilt production child booted with **no development hook**.

## Commands

- `cd openlab-3d && npm run typecheck` — **PASS**.
- `cd openlab-3d && npm run build` — **PASS**.
- `cd openlab-3d && npm run test:workbench` — **PASS, 14/14**: elastic collision conservation; two-proton carbonate conversion; zero-rate conversion guard; bounded evaporation lattice; real surface bounds; five general collision presets; actual neutralisation, two precipitates and three gas chemistries; and guide-credit gating during preparation without dropping real observation/measurement records.
- `cd openlab-3d && npm run build:chemquest` — **PASS**, generated production assets included under `public/openlab`.
- Root `npm run lint -- --no-cache` and `npm run typecheck` — **PASS**. The initially missing already-declared Nunito package was restored locally; no dependency manifest or lockfile change was needed. Clearing the lint cache removed its stale missing-module result.
- `git diff --check` — **PASS**.

## Limits

Particle counts, lengths and animation time are illustrative. The lens observes the
existing simplified school chemistry model, not a molecular dynamics solver or every
possible real chemical reaction. Instantaneous mixing rates describe the observed
formation over a display sampling interval; they are not independently measured laboratory
rate constants. Unknown transformations retain a labeled symbolic fallback rather than
pretending to provide a fully balanced mechanism. Stock quantities, preparation, chemistry
and placements remain local tab state; selected guide/progress retain their existing local
persistence. Hardware speaker output and real-phone frame rate are not certified by headless
browser checks. No push, deployment, migration or external team message was performed.
