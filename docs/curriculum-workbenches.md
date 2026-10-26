# Grade 7 and 10 physical workbenches

All 77 activities (32 Grade 7, 45 Grade 10) now provision nonempty apparatus and material lists. The 52 previous notebook-only models have been converted to bench activities. Existing 25 bench activities remain available. Lesson Hall practicals and OpenLab use the same methods and identifiers.

## Equipment and stocks

`openlab-3d/src/experiments/curriculum/kinds.ts` defines 31 additional apparatus types: balances, volumetric preparation, phase baths, reflux and separation equipment, diffusion chambers, material and density testers, magnetic reactors, combustion and lime furnaces, reaction racks, optical rate measurements, drying ovens, electrolysis and galvanic cells, ion migration tubes, equilibrium and pressure reactors, oil fractionation, falling-ball viscometers, cracking/dehydration trains, molecular kits, fermenters, interfacial nylon apparatus, nine-well enzyme racks, corrosion exposure racks and soil benches.

`materials.ts` adds 49 finite reagent stocks, including gas cylinders, nickel, wax, benzoic acid, acetone, hydrocarbons, crude-oil blend, concentrated sulfuric and nitric acids, aluminium/nickel salts, thiosulfate, glucose, yeast, amylase, polymer precursors, soil mixtures and seeds. Gas transfer uses mL; solids use grams; liquids use mL. Organic solvents have their own density and volume rather than an invented water carrier. Stock depletion and compartment contents persist through transfers.

Each apparatus has a Three.js body, selectable chambers, visible loaded contents and controls. Learners can change inputs and operating conditions; there are no product-selection sliders. Finite products can be transferred or collected, including distillates, plated metal, filtered liquid and drawn nylon.

## Chemical behavior

Supported additions include Fe + S, oxygen-limited Cu/Mg oxidation, methane complete/incomplete combustion, wax melting/combustion, aluminium hydroxide amphoterism, thiosulfate acidification, hot concentrated sulfuric acid with copper, ethene bromination/permanganate oxidation, ethanol oxidation/dehydration, hydrocarbon cracking, reversible esterification, fermentation, acid/enzyme starch hydrolysis and nylon-6,10 formation. Existing salt, acid/base, precipitation, gas-generation and displacement chemistry remains in use.

Faraday-law electroplating consumes actual anode/electrolyte stock. The galvanic cell needs loaded half-cells and a salt bridge; current consumes zinc and deposits copper when the load connects. Closed gas equilibria conserve loaded nitrogen/hydrogen or NO₂/N₂O₄, with temperature and piston volume affecting composition. Catalysts affect the modeled rate rather than selecting equilibrium yield.

Empty apparatus cannot create products. New reaction observations follow nonzero reaction events. All activities require bench evidence for notebook completion. Old published model guides cannot remove the bundled stock list or reinstate slider-only completion.

## Educational approximations

This is finite supported educational chemistry, not an unrestricted chemical simulator. Accelerated clocks make slow processes observable. Rate constants, optical thresholds, diffusion indices, settling, non-iron surface corrosion and plant-growth responses are illustrative. Density/conductivity and molecular-kit boiling points are reference values. Iron corrosion explicitly distinguishes finite oxygen in covered wells from atmospheric oxygen available to open wells.

Electrolysis assumes 100% metal-current efficiency and omits competitive hydrogen kinetics. Equilibria use ideal mixtures and illustrative constants. Distillation separates components by approximate boiling thresholds, not a full vapor–liquid equilibrium column. Falling-ball calculations use Stokes drag at low Reynolds number and an approximate inertial drag correction otherwise. Nylon tracks repeat units, end groups and HCl but omits interfacial diffusion. The molecular kit represents physical model pieces rather than synthesis of hexane.

The existing gas-volume convention is 24 L/mol. Procedures and labels distinguish educational virtual handling from instructions for unsupervised real-world experiments.

## Rollout and validation

Run `npm run learning:grade7:sql`, `npm run learning:grade10:sql` and `npm run learning:labs:sql` after changing content. The numbered workbench migration upgrades executable fields by stable IDs while retaining editorial content, publication state and progress. No applied migration is edited and no database connection is made by generation. Apply the new migration to update a deployed database.

Required checks:

```sh
npm run typecheck
npm run lint
npm run test:experiments && npm run test:hub
node --experimental-strip-types --test scripts/learning-database.test.mjs
npm --prefix openlab-3d run typecheck
npm --prefix openlab-3d run test:workbench
npm --prefix openlab-3d run build -- --base /openlab/ --outDir ../public/openlab
```

Browser checks prepare all 77 setups and verify their supplied objects mount. Desktop and phone workflows transfer real portions, heat Fe/S to FeS, record bench evidence, electrodeposit nickel, form and collect nylon, and combust loaded methane with loaded oxygen.

Verified in this revision: app typecheck and lint exit 0; OpenLab typecheck exit 0; experiment catalog 6/6, hub 38/38, learning database 5/5, and workbench 86/86 tests passed (135 total). Browser checks passed at 1280 px and 390 px with no page errors. Embedded OpenLab production build and Expo web/Android exports exited 0. Android was bundled, not run on a physical device. Existing Node module-type and Vite output-directory notices were non-failing. No migration or seed was applied to Supabase.

## Equipment guidance

The instruction panel provides 133 experiment-specific starter walkthroughs across Grades 7–10, including 68 apparatus-based Grade 7/10 activities. Each card separates the stock name, exact amount/unit, destination chamber and operating action. The remaining nine shared-glassware/tool activities include specific starter quantities or tool handling instructions. Quantities are labelled app starter trials, not claimed textbook prescriptions.

“Багаж дээр заах” selects the actual destination and shows a marker on the apparatus plus a source-stock marker. “Энэ үйлдлийг үзүүлэх” performs just the current action. Curriculum apparatus also accepts an exact custom dose, including quantities such as 0.56 g.

“Энэ туршилтын 3D үзүүлбэр” explicitly replaces the current bench sample and runs a scene demonstration: it opens containers, lifts/transports/tilts the actual source body for pouring, uses a spoon or pipette for measured samples, and connects a hose for gas. It restores each container and its physics properties after use. The camera frames the equipment and handling space on desktop and phone. Material enters the selected chamber gradually during the visible dispensing phase through the normal finite-transfer engine. The demonstration then operates the apparatus, waits for reactions or measurements, and performs supported follow-up collection actions. Pause freezes the action clock, container pose, and transferred quantity; resume continues from that exact point. Cancellation restores a moving container while retaining material already delivered. Taking over keeps the current stock and products. Saved notebook evidence is retained. Stock shortages and apparatus start errors stop the demonstration instead of skipping ahead. Switching experiments or leaving the bench cancels the timer. Guided mode suppresses competing inspection and molecular-preview panels until the learner takes over.

Validation: all 133 starter plans execute through real finite transfer and apparatus operations in the workbench test suite; missing/depleted-stock and notebook-preservation checks pass. Desktop/phone browser checks cover exact quantities, equipment markers, actual automated nylon formation, pause/resume and single-action Fe dosing. Required app lint/typecheck and catalog/hub tests pass; the workbench suite now has 94 passing tests. The embedded production bundle is rebuilt.

Additional phone validation confirmed an exact 0.32 g custom dose and cancellation of pending actions/markers when leaving the bench. Final required checks: app typecheck/lint exit 0; lab typecheck/build exit 0; 6 catalog + 38 hub + 5 database + 88 workbench tests passed (137 total). No database changes were required for the guide UI.


## Physical showcase verification

The frame-driven showcase lives in `openlab-3d/src/experiments/workbench/guidance/showcase.ts` and `PhysicalShowcase.tsx`. It provides open caps, animated real container bodies, spoons, pipettes, hoses and material streams. The hand/avatar has been removed; only equipment and materials animate. Heating and reaction contents remain owned by the existing chemical engine. Demonstrations are animated simulations, not recorded videos or fluid-dynamics solvers.

The current sequence uses measured endpoints rather than fixed observation durations. See “Complete protocols” below for the current coverage and verification.

Browser verification passed at 1280 px and 390 px: real container lift and tilt, no transfer before dispensing, gradual pouring, pause/resume without a duplicate dose, complete nylon reaction and collection, and restored source pose. Additional phone checks passed for exact 5 ml liquid, 0.56 g spoon and 50 ml gas transfers. Required checks passed: app lint/typecheck, lab typecheck/build, 6 catalog, 38 hub, 5 database and 92 workbench tests (141 total). The production OpenLab bundle is rebuilt. No database rollout is required for this UI change.

## Experiment-specific showcase entry

The demonstration button is part of the selected experiment's guide. It shows that experiment's title and can launch only its own demonstration after the learner enters the experiment. There is no separate showcase browser, grade picker, or cross-experiment switch. Before entering an experiment no demo option appears. Saved notebook evidence is retained when a fresh demonstration sample is prepared.

The hand/avatar is removed. Containers, caps, spoons, pipettes and gas hoses animate directly. Pause/resume, manual takeover, measured stock depletion and reaction observation remain available.

Grade 9 coverage includes all 32 activities. Grade 8 includes 20 of the 28 textbook activities that have physical chemistry demonstrations, plus 13 existing core lab guides including elephant toothpaste and the default NaCl experiment. The remaining eight Grade 8 conceptual/environmental activities retain their existing models. Grade 8 model metadata and quizzes are not rewritten: optional physical demonstrations use scoped lab-only equipment definitions. Ordinary glassware uses the same finite-transfer and chemical engine as manual lab work; extra demonstration objects are removed with that experiment's session.

`npm --prefix openlab-3d run test:production` serves the actual built embedded bundle and uses installed Chrome/Chromium (or `CHROME_PATH`). It checks desktop and phone startup, no missing assets or JavaScript errors, no demo option before experiment entry, the contextual button's visibility, absence of a cross-experiment chooser, and completion of a measured transfer in Grade 8, Grade 9, Grade 10 and the default NaCl guide. Optional `OPENLAB_SMOKE_SCREENSHOTS` saves screenshots. Build the embedded lab first.

Verified for this change: app lint/typecheck, lab typecheck/build, 94 workbench, 6 catalog and 38 hub tests passed. Production browser checks passed for all four tested routes. No database migration is needed.


## Complete protocols

The manual guide and optional 3D showcase now share 142 completed physical protocols. The nine previously separate shared-glassware Grade 7/10 activities are included. Non-laboratory Grade 8 models keep their existing behavior.

Each protocol has explicit reaction/measurement endpoints, recorded observations and a checked final stage. Salt preparations filter the whole sample, wash the residue, collect the filtrate, evaporate, stop heating, cool and transfer the dry product to a watch glass. Precipitation procedures filter, wash and collect the actual solid. Other endpoints include actual distillate, collected nylon, electrode products and completed comparison samples. Comparison trials use fresh finite stock and account for discarded sample mass.

Endpoint waits accelerate only the active experiment's simulation clock (bounded chemistry substeps); pause/cancel clears acceleration. Timeouts, depleted stock and unmet final conditions stop the demonstration. Completion requires the current experiment's recorded measurements and its final physical conditions. A green completed panel exposes stage readings. Source containers undergoing controlled animated pouring are excluded from unrelated knock-over spilling.

Validation includes an end-to-end simulation audit of every one of the 142 protocols, checking every endpoint without skipped stages. The production browser test now waits for the verified final result for nylon, Grade 9 filtration and the full NaCl salt isolation on desktop/phone. It continues to check contextual launch, asset loading and JavaScript errors. These remain simplified educational chemical/physical models; passing the audit establishes the supported simulation endpoints rather than laboratory accuracy for every real-world condition.

Final verification: app typecheck/lint exit 0; 6 catalog, 38 hub, 5 learning-database and 97 workbench tests pass. The workbench suite includes both direct and incremental-animation audits of all 142 protocols, timeout/premature-completion rejection, and the last-liquid-portion regression. Lab typecheck and embedded build pass. Complete production browser runs passed for Grade 10 nylon (desktop), Grade 9 filtration (phone), and NaCl isolation (desktop); the initial NaCl browser failure was corrected and its complete rerun passed. Existing Vite bundle-size warnings remain. No database migration was applied.

## Apparatus and material-flow visuals

The apparatus model, numbered chamber labels and demonstration targets share `grade9/port-layout.ts`. Previously missing receiving cups are rendered for comparison, reuse and auxiliary samples. The nylon interface and collected-thread tray have separate anchors. Ordinary glassware uses its actual inner profile for the opening and liquid surface. Manual pours into apparatus also target the selected compartment rather than the centre of the whole assembly.

Selected apparatus shows a readable Mongolian chamber name, liquid volume, solid mass, temperature and operating state. Number buttons select a chamber; a touch-sized key in the procedure panel explains every numbered part and the apparatus workflow. During demonstrations the guide displays the current reaction equation separately from handling instructions.

`ChamberContents` renders measured liquid colour/turbidity, sediment, foam and gas. Liquid height and colour ease toward the measured state; receiving liquid and manual stirring move the surface. Bubbles follow increases in measured chamber gas or boiling, rather than a generic reaction-rate decoration at an unrelated position. Empty chambers do not allocate particle meshes. Convection retains its existing relative mixing-colour visualization.

`MaterialFlow` uses bounded instanced geometry for a continuous tapered liquid jet, separate drops, powder grains and hose flow. The jet passes through the actual opening and reaches the receiving surface. Transferred solutions retain their source colour. The closer demonstration camera improves phone visibility. These are educational visualizations rather than fluid-dynamics simulations; the finite-transfer and reaction engines still own the quantities and products.

Validation: lab typecheck and 97 workbench tests pass, including direct and incremental-animation runs of all 142 protocols. App typecheck/lint, 6 catalog and 38 hub tests pass. The embedded production build passes (existing bundle-size warning). Browser checks verify readable apparatus labels and run the full nylon, filtration and NaCl procedures; desktop/phone screenshots include the pouring stage. No database change is required.

Additional visual verification: full nylon runs passed at 1280 px and 390 px; full filtration passed at 390 px and NaCl isolation at 1280 px. The galvanic apparatus also passed its complete phone run with readable part labels, an explicit salt-bridge connection and Zn− / Cu+ electrode labels. Screenshots were inspected for the pouring stages. No JavaScript errors or missing assets were reported. Selecting a numbered part also updates the inspected mixture to that chamber.
