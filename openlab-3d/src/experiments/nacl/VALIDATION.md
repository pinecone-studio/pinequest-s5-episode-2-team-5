# Free-lab validation — 2026-10-22

- `npm run build:chemquest` in `openlab-3d/`: passed (includes strict TypeScript build).
- Root `npm run lint`: passed.
- Root `npm run typecheck`: still fails in the existing nested duplicate checkout:
  missing nightMode/onNightModePress in its hub, and its obsolete lab-scene import.
  No errors from the current standalone OpenLab typecheck.

Headless Chrome checks against the running standalone app verified:

- Default entry is walk mode, with no experiment selection.
- E/Enter pickup works through the actual camera ray and interactable registry.
- A microscope can be picked up before any chemistry steps.
- The same microscope can be carried to another bench and stays placed at its surface
  (observed y=0.904 m rather than the hand position).
- Ordinary inventory glassware and individually movable shelf bottles share one hand.
- A movable burner retains its R toggle callback.
- Liquid transfers into an ordinary spawned beaker; carbonate produces NaCl and CO2.
- Contents survive that ordinary vessel's pickup/place cycle.
- Overflow, pouring without a receiver, out-of-range use, paper filtering, heating,
  crystal formation, and cooling satisfy the checked state invariants.
- Optional V close-up enters bench camera mode and Escape returns to walking.
- New-session reset clears the hand and restores the acid stock to 100 cm3.
- No browser page errors occurred during these checks.

These checks include both actual keyboard/camera pickup and deterministic calls into
live chemistry stores. They do not prove full manual scientific accuracy, real-device
performance, arbitrary chemistry, breakage, throwing, or fluid dynamics.

The rebuilt production page served by ChemQuest was also checked in headless Chrome
at 1440x1000 and a 390x844 touch viewport. Both loaded without page errors or horizontal
overflow. Normal walking, the optional table waypoint, optional close-up and return to
walking worked. The production page did not expose the development debug bridge.
