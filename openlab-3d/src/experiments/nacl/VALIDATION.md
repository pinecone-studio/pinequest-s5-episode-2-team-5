# Combined main/bench validation — 2026-10-22

Commands:

- Root `npm run lint`: passed.
- Root Expo web export to a temporary output directory: passed (1360 modules bundled).
- Root `npm run typecheck`: passed. The local duplicate checkout is excluded and its accidentally committed gitlink removed; its on-disk files were retained.
- `npm run build:chemquest` in `openlab-3d/`: passed, including strict TypeScript and regenerated public assets.

Headless Chrome checks against the merged running app exercised the real runtime
stores, interaction callbacks and camera, with no browser page errors:

- Default walking and optional V work/detail camera; return to walking preserves apparatus placement.
- Visible zoom buttons, mouse-wheel zoom, pan arrows and drag panning.
- Exact 5 cm³ and 1 cm³ doses; 50 cm³ acid measurement.
- Cursor placement of the same bottle at two distinct worktop points, 35 cm apart.
- Mobile controls at 390×844 and desktop at 1440×1000.
- Full NaCl sequence: react 50 cm³ of 1 M HCl with excess carbonate, filter, heat to first crystals, turn off, cool below 30 °C, collect, dry and transfer a sample to a slide.
- Stoichiometry: 2.922 g total NaCl and 600 cm³ CO₂. Transferring 0.020 g to the slide leaves 2.902 g on the watch glass without creating or losing salt.
- Copper/sulfate solution retains its species when transferred both into and out of NaCl apparatus.
- Ordinary-vessel R actions still use the room’s general chemistry and conserve chloride.
- One hand is shared by scene apparatus, inventory and stored equipment.
- Opening a real drawer, taking an item and storing that same item back preserves its identity.
- Room burner E toggle and G pickup callbacks both remain usable; inventory throwing retains its velocity.
- Session restart clears all carried items and puddles and restores 100 cm³ acid.

The production assets served by ChemQuest are checked for desktop/mobile loading,
live measurements, zoom and pan controls, warnings, return to walking and absence of
horizontal overflow. Production builds omit the development debug bridge.

These checks combine actual browser input and deterministic simulation calls. They do
not certify scientific accuracy, every reagent combination or real-device performance.
The NaCl procedural parts retain their accelerated model; the room’s physics inventory
retains its original breakage, throwing, storage and general chemistry.
