# OpenLab experiment workbench

The station is part of the same laboratory. Choose an experiment in **Цэс → Туршилт**,
then look at the worktop and press **E** (or use **V** nearby). Without a choice,
the guide says **Туршилт сонгоогүй байна**, and the complete supplies drawer remains usable. Approaching it does not
start NaCl or open an instruction banner.

## Preparation and supplies

Each chosen recipe first enters **Бэлтгэл**. The same **Tab / white side tab**
drawer is used while walking near the station and while seated. It always contains
all apparatus and reagents, with required supplies pinned above the other stock.
A card spawns or frames an actual object. Spawning alone never checks off a supply.

Pick up a required object from a shelf, storage, or the drawer spawn and place it on
the real `chem-n4` worktop to get ✓. Existing storage metadata provides white location
hints and outlines. Wrong objects remain usable, with short feedback. Once all needed
objects are delivered, a success sound and the robot's message announce the first step.
**Алгасах (багшийн горим)** is a small explicit bypass. Step chips select instructions
only after preparation; they never fabricate preparation or chemical completion.

Cards keep their quantities, hazards and uses after preparation. Tab/Esc closes the
drawer without leaving the bench, including when search or a button had DOM focus.
Away from the station the ordinary walking tools drawer retains its behavior.
The menu waypoint keeps the selected guide; NaCl selection is a separate explicit action.

## Bench controls

- Click / **E**: select and frame an item; its label and live contents can be read.
- **G** / **Авах / зөөх**: pick up. **Q**: place at the indicated surface point.
  Cursor placement and 45° rotation controls remain available.
- **R, hold**: pour, scoop or stir. The contents card also offers hold-to-use and exact
  1/5 cm³ NaCl pour controls. Instrument operation remains available in the card.
- **F / Барьж шинжлэх**: inspect the live apparatus in place, preserving its liquid,
  colour, powder and crystals. Left drag rotates, wheel/pinch zooms, Esc restores
  the preceding bench camera. Carried visuals stop following the camera during inspection.
- Normal bench camera: left drag pans, right drag orbits, wheel/two fingers zoom.
  Visible +/−, slider, arrows and overview controls remain; minimum distance is 1.8 cm.
- **Esc**: closes the seated drawer first, returns from inspection next, otherwise
  stands up. **Ширээнээс гарах / V** also returns to walking.

The white interaction chip, labels, one short hint and inline warnings guide the
student. There are no new modal tasks or quizzes. All strings are Mongolian. Keys
honor existing bindings except Tab/Esc remain the explicit bench drawer shortcuts.

## Chemistry and molecular lens

`useChemStore` still owns canonical contents. `chemistry.ts` projects the NaCl model
without deleting other ions. `sandbox.ts` advances the physical NaCl apparatus;
`world/ChemSim.tsx` advances ordinary inventory vessels. Prepared experiment contents
pause while walking away; returning preserves the recipe, preparation and current state.

`chemistry/reaction-view.ts` observes actual transfer equilibria and kinetic results.
`lab/reaction-view.ts` publishes transient per-vessel reactants, products, rate, temperature
and equations; it never creates material contents. The shared 3D lens appears for held /
focused reacting vessels while walking, at the bench, and in normal F inspection.
It covers carbonate/acid, metals/acid, precipitation, neutralisation, peroxide, evaporation
and crystallisation, with actual-species generic views for further modeled transformations.

Instanced atoms collide through a spatial hash and elastic impulses. Reaction credit
follows the observed rate; gas escapes, precipitates settle into clusters, and crystals
assemble into ion sites. A white equation card includes one Mongolian explanatory sentence.
Pin keeps a view open; close dismisses its current episode. Its passive particle view
allows pointer interaction with the apparatus behind it. A calm, unpinned view fades.

Procedural ticks/fizz/crackle use the existing master audio. Autozoom defaults on via
**Урвалд автоматаар ойртох**; drag/wheel interrupts it. Low quality or reduced motion
uses a 40-particle cap instead of 150 and disables automatic camera motion. The
microscopic model uses illustrative lengths/time/counts, not physical SI dynamics.

## Ownership and persistence

- The original engine's `goto`/`RUN` demonstration is retained as a reference. Do not
  reconnect it to this free-placement scene: it overwrites user contents and poses.
- The scene stays outside `StaticBatch`. No new bench shadow casters are added.
- Selection/guide progress use `openlab3d-experiments` v2. The v1 migration preserves
  progress and clears its potentially auto-assigned selection once.
- Preparation, quantities, placements and reaction progress are transient tab state.
  Walking/panels preserve them; a full reload/restart resets physical state.
- The `nacl` lesson is local and included alongside the bundled/Supabase guide catalog.
  No cloud result/progress or new database row is written.
- `Mode` / `Panel` are unchanged. `SettingsState` gains `reactionAutoZoom`.

See [WORKBENCH-ROUND2.md](../../../WORKBENCH-ROUND2.md)
for the complete file map, current limitations and verification results. The earlier
`VALIDATION.md` documents the prior merge; the round-2 report is the current behavior.

Round-3 changes and concrete embedded-build checks: `../../../WORKBENCH-ROUND3.md`.
