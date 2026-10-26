# Observed reaction appearance

Research and implementation review: 2026-10-26. These references inform observable behaviour; they do not validate the app's approximate kinetic constants. Public reference photos were inspected in a temporary directory and are not bundled or committed.

| Process | Reference observation | Implementation |
| --- | --- | --- |
| CuSO₄ + NaOH | Pale-blue insoluble copper hydroxide appears. A precipitate is a suspension of solid, not simply a new dissolved dye. | Actual Cu(OH)₂ produces cloudy flocs; the suspended fraction decreases and sediment becomes more prominent. |
| CO₂ + limewater | White precipitate and cloudiness; sufficiently high CO₂ can dissolve it again. | White flocs use the actual CaCO₃ and cloud fractions. If the engine dissolves the solid, those effects disappear. |
| Permanganate diffusion | Purple colour starts concentrated around the added material and spreads over minutes in undisturbed water. | A bounded purple concentration region expands with the apparatus's measured relative diffusion extent. Removed the old visible molecule-like dots for liquid diffusion. |
| Oil/water | Separate phases with lighter oil above water. | Immiscible solvent volumes render separately with an interface in both ordinary vessels and apparatus. Water/ethanol stays one phase. |
| Nylon 6,10 | Organic solution floats on the aqueous solution; a greyish film forms at their interface and can be drawn into a thread. | The two stored monomer feeds are displayed as two phases of one beaker. Film requires actual nylon product. The thread appears after real collection, starting at the interface. |
| Phenolphthalein titration | A faint persistent pink is the visual endpoint; an intense pink can indicate overshoot. | Existing pH-dependent indicator colour is retained. A neutral-pH completion check is not described as proof of a phenolphthalein endpoint. No invented pink flash is added independently of local pH. |
| Metal displacement | Copper grows on the reducing metal and the blue copper-ion solution fades. Appearance can be dark on zinc and red-bronze on iron. | Existing finite reactants and copper-ion colour depletion remain. A generic reddish sediment is not claimed to reproduce all deposition morphologies. Surface-resolved metal growth remains a limitation. |
| Acid/carbonate | CO₂ effervescence; detergent makes a longer-lived foam. | Gas bubbles remain driven by real production. No permanent foam or bubbles are introduced for ordinary dissolution or precipitation. |

## Primary demonstration sources

- UW–Madison, [Copper(II) sulfate with sodium hydroxide](https://www2.chem.wisc.edu/deptfiles/genchem/lab/cca/MVHTM/CUSO/CUSONAOH.HTM).
- UW–Madison, [Carbon dioxide and limewater](https://demolab.chem.wisc.edu/aqueous-equilibrium-and-precipitation-reactions-reactions-between-carbon-dioxide-and-limewater/), including the photograph showing clear solution, cloudy suspension and visible solid.
- Wesleyan University, [Potassium permanganate in water](https://physicsdemos.site.wesleyan.edu/home/thermodynamics/4d/4d50-62-potassium-permanganate-in-water/).
- NOAA, [How does oil act in water?](https://response.restoration.noaa.gov/exercises_oilfloats).
- Royal Society of Chemistry, [Making nylon: the nylon rope trick](https://edu.rsc.org/experiments/making-nylon-the-nylon-rope-trick/755.article).
- UW–Madison, [Is this solution too pink?](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/titrate/titrqpink.htm), including the photograph of the faint endpoint.
- Purdue University, [Displacement reactions of zinc and copper](https://chemed.chem.purdue.edu/demos/demosheets/9.11.html).
- University of Washington, [Bicarbonate fizz](https://chem.washington.edu/lecture-demos/bicarbonate-fizz).
- American Chemical Society, [Acid–base reactions with carbon dioxide](https://pubs.acs.org/doi/10.1021/ed079p1464), comparing transient bubbles with detergent-stabilized foam.

## Rendering and scientific limits

`appearance.ts` derives phase volumes and precipitate appearance without changing chemistry. `ReactionCloud` draws bounded macroscopic wisps/flocs with fixed instancing; it does not show individually visible molecules. Apparatus diffusion uses its existing relative extent. Mixing plumes and smoothing are illustrative, not computed fluid flow.

Fine-precipitate cloud decay now has a longer illustrative time constant (45 simulation seconds rather than the generic 5 seconds). Actual settling varies with particle size, concentration, vessel, agitation and other conditions. The value is not measured from these demonstrations. The app's accelerated demonstration clock also changes wall-clock duration.

The nylon beaker uses a 25 mL display capacity matching the scale of the referenced classroom demonstration; logical feed compartments remain separate so mass, chemistry and completion checks are preserved. The visible layer volumes include both actual feeds exactly once. Other apparatus retains existing display scales.

The immiscible-phase model covers loaded oil, cyclohexane and selected hydrocarbons/paraffin with water. It is not a general solvent-partition, emulsion or mutual-solubility model. Stirred oil emulsification and adsorption, detailed nucleation and metal-surface deposition require further models. These changes should not be described as photorealism or validation of every Grade 7–10 reaction.

## Validation and sample visibility

The three ordinary-beaker precipitation guides now use 25 mL of each solution, matching their 250 mL glassware better than a thin 5 + 5 mL puddle. These are explicit app example quantities, not textbook prescriptions. Transfers still deplete finite source stock and all final-product checks remain active. Copper hydroxide's display palette is pale blue. Trace equilibrium solid below the display threshold does not trigger a visible-precipitate observation.

Checks: app typecheck/lint and the 6 catalog + 38 hub tests passed; lab typecheck/build and 100 workbench tests passed. Workbench coverage includes all 142 complete protocols with both direct and animated incremental dosing, phase-volume conservation, miscible ethanol, precipitate suspension/settling without fabricated gas, and a non-mutating nylon display view. Production Chrome runs passed full nylon on phone, diffusion on phone, and precipitation on desktop with no script errors or missing assets; reaction-stage screenshots were inspected against the reference observations.

The final desktop precipitation rerun passed after the visibility-threshold, palette and sample-quantity corrections. Its reaction screenshot was captured during the second solution addition, not while the first solution was being poured. All 100 workbench tests passed after those corrections.

## Physical handling and device actions

The source material determines the stream colour, phase and viscosity. Pure indicator stock retains its real stock appearance (for example, colourless phenolphthalein rather than its pink label). Oil and concentrated syrup transfer more slowly with a thicker jet. Powders use grains; measured liquids use discrete drops. Jet trajectories fall with gravity and are suppressed if the visible lip is below the receiving opening.

For active pours, `liquid-plane.ts` numerically integrates circular vessel-profile slices below a gravity plane. `HydrostaticLiquid` clips the liquid to that level and draws its free surface. The tilt calculation places the current fill at the lower rim. Liquid quantity remains owned by the finite-transfer engine. This is a quasi-static approximation with bounded geometry, not a fluid-dynamics or general spill solver. The previously inconsistent 500 mL stocks in 250 mL curriculum bottles now start at 250 mL.

Spoons and pipettes reserve a finite portion from the source before travelling. Their visible load decreases with delivery. Cancellation returns only the unused portion. Dropwise endpoint steps stop dispensing as soon as the actual endpoint is reached. Unused material is returned when the tool returns to its source.

Structured operations now drive apparatus parts: electrical clips/leads and the salt bridge move into place, gas hoses and connectors seat at their ports, the cylinder valve turns, control knobs operate, magnets move between sample and collection, the nylon reel turns and piston positions ease toward their new values. Molecular-kit bonds draw in during assembly. Ordinary mixing moves the supplied glass rod. Nylon interfacial polymerization is observed without stirring its separate layers. Electronic flow arrows on the galvanic external circuit require actual running load current.

The observation camera frames the receiving vessel/product more closely; endpoint chamber references also select the correct chamber. Floating measurement cards are hidden during handling operations when they could obscure the parts. Gas-generation counters now drive larger visible bubble populations where appropriate, while precipitate flocs have greater contrast. No generic gas, glow, smoke or new product is added to otherwise inactive mixtures.

Reference handling and connections: [UW–Madison liquid pouring](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/pouring/pouringliq.htm), [Purdue galvanic-cell demonstrations](https://chemed.chem.purdue.edu/demos/demosheets/20.4.html), and [UC San Diego galvanic-cell setup](https://prod.chem.ucsd.edu/undergraduate/teaching-labs/demos/demo9b.html). The app still has simplified apparatus models; it does not simulate every contact, fluid eddy or laboratory manipulation mechanically.

Automated verification for this revision: 104 workbench tests passed, including all 142 direct and animated complete protocols, gravity trajectories, fill-dependent tilt, plane-volume integration, source colours, viscosity differences and finite measured-tool reservation/cancellation. App lint/typecheck and the 6 catalog + 38 hub tests passed. Lab typecheck and embedded production build passed, with the existing bundle-size warning.

Production browser verification for physical actions: full phone runs passed for nylon, CO₂/limewater, the galvanic cell and the phenolphthalein indicator procedure. Final reruns after the stock-capacity and control-placement fixes also passed for nylon, the indicator and the galvanic cell. Pouring and connection screenshots were inspected; the power control is mounted beside the meter rather than on the salt-bridge cup. No JavaScript exceptions or missing assets were reported. No database migration was required.
