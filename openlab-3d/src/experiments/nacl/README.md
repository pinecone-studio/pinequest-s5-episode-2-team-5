# OpenLab free laboratory and NaCl work area

The NaCl work area belongs to the same room and interaction system as the rest of
OpenLab. Entering the lab starts ordinary walking; there is no required experiment,
lesson, or step selection. The menu's NaCl shortcut only moves the player to that
work area. It does not start a scripted sequence or lock the camera.

## Controls

- **E / walking click**: pick up the focused piece of equipment. Normal inventory, shelf stock,
  movable instruments, and NaCl apparatus share one hand. No experiment step locks pickup.
- **Q**: place on the aimed bench/shelf surface or the floor. In table view, the preview follows the cursor; clicking empty worktop places there. No nearest-surface snapping is used.
- **R, hold**: use the held object on the focused object: pour, add carbonate, scoop,
  stir, install a filter sheet, or choose a receiving vessel. R with a NaCl or shelf vessel but no receiving
  vessel spills liquid; a full receiving vessel overflows. Neither mistake blocks play.
- **E** operates the room’s burner, balance and burette; **G** picks those instruments up. **R** toggles the NaCl lamp and opens its microscope. These original instrument callbacks are preserved.
- **F**: inspect a vessel's current contents or the equipment's normal detailed view.
- **V**, near the work area: smoothly enter the middle-distance work view of the same room. V/Esc returns to walking. Click equipment to select and frame it, read its current volume, then use **Авах / зөөх** or E to pick it up. Camera movement preserves equipment placement.
- In table view, left drag pans along the bench, right drag orbits, and the wheel or two-finger pinch zooms. Visible +/− buttons, a distance slider, pan arrows, **Ажлын харагдац** and **Бүтэн ширээ** also control the camera. Minimum orbit distance is 1.8 cm.
- Selected vessels show live numeric volumes and cylinder scale information. With a liquid vessel held, choose a receiving vessel, hold the pour button, or use exact **1 см³** / **5 см³** doses.
- Touch controls include pickup, placement, use/hold and inspection. In table view, tap selects an item, one finger pans and two fingers zoom/pan. Rotate held equipment in 45° increments before placement.

The displayed keys above are defaults. Keyboard controls and prompts honor remapping.

The current instruction and warning panel stays visible near the experiment; its optional eight-step checklist can be expanded. Progress is derived from measured contents and observed actions. Warnings remain visible for wrong/unsupported combinations,
excess carbonate, hot vessels, pouring without a receiver, overflowing and over-heating.
These warnings guide rather than lock the equipment. Furniture and architecture remain
installed; shelves' bottles and glassware, loose apparatus, burners and the balance are
movable. A test-tube rack carries its assembly; its stored tubes can also be picked up individually.

## Shared simulation

`useChemStore` owns canonical contents keyed by item identity, including all species and solids. `chemistry.ts` derives the textbook view (volume, HCl mmol, carbonate grams, NaCl grams and temperature) without discarding other species. `sandbox.ts` keeps guidance and action state and mirrors that view for the overlay. Ordinary
inventory vessels and movable shelf vessels can receive, carry, and transfer solutions.
Contents stay with the same object after pickup and placement. The store is not persisted
or sent to Supabase/ChemQuest.

HCl + carbonate produces NaCl and CO2 over time; stirring accelerates the modeled reaction.
Filter paper and a receiving vessel permit filtering; missing paper causes a warning.
A dish near a lit spirit lamp or a lit room burner heats and evaporates; moving it away
lets it cool. Crystals appear when the modeled solubility threshold is crossed. Crystal
samples can be transferred to a slide for the microscope. Experiment progress records
observed actions rather than enforcing a sequence. Nearby work keeps reacting when the
player walks; menus pause the simulation. Session restart clears contents, spills and
carried state and restores scene equipment positions.

Chemistry remains deliberately limited: HCl is assumed 1 mol/dm3, evaporation is accelerated,
solubility and filtration are approximations, and other reagents do not gain invented
reactions. Filtration cannot remove dissolved salts. The procedural NaCl parts do not implement glass breakage or throwing. The room’s physics inventory retains both. Neither model implements arbitrary reactions, full fluid dynamics or moving installed furniture. Local spilled volume and puddles represent losses; they are not a full fluid
solver. The microscope is an illustrative NaCl crystal image, not rendered atoms.

## Code boundaries

- `NaClStation.tsx`: mounts the original apparatus inside the room, registers every part
  with the ordinary interactable registry, optional camera controls, effects and puddles.
- `view.ts`: shared table/detail camera commands and selected-item state.
- `guidance.ts`: measured eight-step instructions, suggested equipment and warnings without step locks.
- `chemistry.ts`: bridge to canonical `useChemStore` mixtures, preserving individual species during transfer.
- `sandbox.ts`: textbook kinetics for NaCl apparatus, input holds, guidance, warnings, shared vessel metadata and reset. `ChemSim` advances ordinary vessels; each item has a single simulation owner.
- `NaClHUD.tsx`: unobtrusive guidance, controls, focused labels, live substance cards,
  molecule view and microscope. No step selection or quizzes.
- `engine.ts`: procedural apparatus, particles, liquid meshes, molecule drawing and
  public free-play geometry API. Its older `RUN`/`goto` scripted routines remain as legacy
  reference but are not called by the free lab. Do not reconnect `setActive(true)` or
  `goto` to the station; doing so would overwrite player placements.
- `bench.ts`: mounted geometry handle, optional room waypoint, optional close-up camera.
- `data.ts`: Mongolian equipment/substance labels and original constants.
- `interaction/portable.ts`: carries an existing live scene object without cloning it,
  preserving callbacks/content and restoring portable scene objects on session restart.
- `interaction/HeldItem.tsx`: shared carry/placement preview and surface solver for both
  inventory items and live scene equipment.
- `interaction/Interactable.tsx`: explicit `movable` scene pickup for shelf stock. It defaults to false so physical inventory and storage items retain their own pickup and use callbacks.
- `interaction/useHeld.ts`: one R action routes to the NaCl apparatus or the room’s general action system. Both end on release, blur, camera change or reset.

All new chemistry and carry state remains in this browser tab. Build from `openlab-3d/`
with `npm run build:chemquest` to update the static files used by ChemQuest.
