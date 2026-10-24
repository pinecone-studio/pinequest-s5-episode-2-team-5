# Textbook investigations

The existing XP lesson path remains unchanged. Under Lesson Hall → “Хими 8 · Сурах бичгийн зам”, eleven textbook topics lead to notes and practical investigations. “Судалгааны багажууд” lists the added activities. All 23 practical summaries in the revision hub now have runtime lab mappings; the original supplied content JSON is preserved.

## Implemented experiences

There are 28 additional investigations, alongside the existing 15 guides:

- **Nine additional physical workbench guides:** carbonate-solution NaCl preparation, CuCO₃ → CuSO₄, Zn → ZnSO₄, a metal activity comparison matrix, acid/metal heat, vinegar/soda heat, KCl dissolution, wastewater pH reduction, and MnO₂ catalyst reuse. These use existing equipment interaction, reagent transfer, heat, filtration, and chemistry. Solid CuCO₃ and KCl supplies and crystallisable ZnSO₄ were added. MnO₂ already existed. Filtered solids can be collected with the existing spatula action. KI solution is not described as filter-recoverable.
- **Nineteen virtual investigation instruments:** timing/mass loss, melting curves, group-2 metal comparisons in water and acid, halogen displacement, physical/chemical changes, concentration/temperature/surface-area rate comparisons, combustion-product observations, calorimetry, photosynthesis, air/water samples, plant-growth comparisons, treatment methods, smoke-filter residue analysis, atomic models, and element cards.

Virtual instruments are clearly labelled simplified teaching models and work in both the lab notebook and native Lesson Hall. They are **not** twenty additional fully manipulable 3D apparatus simulations. Environmental datasets are illustrative, not real-world monitoring measurements. Rate constants, growth curves, and melting curves are didactic approximations; they do not predict real experiment timings. The equipment diagram is a recorded trial view, not a second physics engine.

## Investigation workflow

Predict → choose controlled conditions → collect repeat readings → inspect a table/graph → write observations → reveal the explanatory comparison → conclude.

The notebook never blocks free pouring. New guide completion records participation in this workflow, not a chemically validated answer or an independently graded conclusion. Existing chemistry guides retain their original event rules. Expected practical results are hidden until students write an observation. Different quantities and units are graphed separately; negative values remain visible.

Physical bench sampling records the selected vessel's actual simulated volume, temperature, pH when available, solid mass, foam volume, and elapsed time since the first reading. Reagent bottles can be sampled, but are labelled as source bottles. These numeric samples are instrument readings from the simulator, not claims of actual school-lab measurements. The foam investigation exposes time and foam volume; the book's five-minute foam-height comparison is not represented as a calibrated height measurement.

## Links and persistence

`src/data/textbook-investigations.json` is shared metadata. `src/lib/textbook-investigations.ts` defines pure model calculations and mappings. Lesson links pass only an allowlisted experiment ID to the embedded lab. The entry still asks the user to enter the lab, then selects the intended guide at the existing worktable.

Lesson notebooks use user-scoped AsyncStorage; the lab notebook uses its existing browser-local pattern. Same-origin, source-checked messages transfer predictions and results between them without passing credentials. Lab notebooks also offer JSON export. The native app supports lesson investigations and virtual instruments, while the existing 3D lab remains web-only.

Published catalog rows override matching bundled IDs. Locally bundled textbook-linked guides remain present when a published catalog omits them, so lessons do not link to absent experiments. No remote database writes or migrations were applied.

## Validation

Automated checks cover mappings, valid equipment/reagent recipes, finite bounded model results, rate dependencies and stoichiometric limits, displacement direction, dark controls, restoration, quantity-separated graphs, actual KCl cooling, copper-carbonate dissolution and filtration, crystallisation, and catalogue fallback.

Desktop and 390px browser checks exercise deep linking, model controls, repeated readings, answer reveal, negative-temperature graphs, reload persistence, native lesson notebooks, and the lesson → lab → lesson result exchange. Scientific calibration and native-device runtime testing remain separate from these software checks.
