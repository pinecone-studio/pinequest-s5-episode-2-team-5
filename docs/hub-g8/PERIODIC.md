# Dedicated periodic-table learning section

Entry: Lesson Hall → «Үелэх хүснэгт судлах» → `/periodic`.
The revision hub's periodic link opens this section too; the older direct revision
URL continues to render the shared component.

## Learning flow

- Explore all 118 elements in their positions, with category legend, group/period
  highlighting, element search and a first-20 emphasis. The table scrolls horizontally
  on phones and brings a newly selected element into view.
- Element details connect symbol/name, atomic number, proton/electron counts, mass,
  group, period, shell diagram and full electron configuration.
- Electron diagrams draw every supplied electron and distinguish the outer shell.
  Students can select a shell to highlight it. They are explicitly labeled as teaching
  diagrams, rather than physical orbital paths.
- Group lessons compare the first-20 examples side by side. Period lessons compare
  the valence-electron pattern across periods 2 and 3. Hydrogen, helium and transition
  element exceptions are explained; occupied shells are not equated universally with period.
- Native SVG sample illustrations and everyday-use pictograms provide memory cues.
  The UI distinguishes compounds/use references from pure elements and labels these as
  illustrations, not photos. Unknown superheavy sample appearances are not fabricated.
- Carbon/sodium/chlorine isotope examples distinguish A from relative atomic mass
  and compute neutrons using A − Z only after choosing a specific isotope.
- Memorization supports the first 20, a selected group, or all 118: gently flipping
  cards, known/again ratings, weak-element filtering and shuffling.
- Up to ten unique quiz targets per session test names, proton counts, shells, group
  numbers and blank-table placement. Feedback reconnects the answer to the atom and
  use illustration; missed elements can be retried.

Memory/attempts are stored on the device per signed-in account. No cloud schema,
3D lab, experiment state or global XP behavior changes.

## Scientific references

The existing content pack supplies element data and uses. Explanations were checked
against the Royal Society of Chemistry's primary element reference:

- https://periodic-table.rsc.org/
- https://periodic-table.rsc.org/element/11/sodium (groups/periods, Z, relative mass, Na-23)
- https://periodic-table.rsc.org/element/17/chlorine (Cl-35 / Cl-37 and configuration)
- https://periodic-table.rsc.org/element/6/carbon (C-12 / C-13 / C-14)
- https://periodic-table.rsc.org/element/10/neon (filled outer shell)
- https://periodic-table.rsc.org/element/46/palladium (5th-period atom with [Kr]4d10)

Source links in the student element panel open the corresponding RSC element page.
Teacher review of Mongolian terminology/content remains part of the original pack's QA.

## Checks

`npm run typecheck`, `npm run lint`, `npm run test:hub` (24 tests), and
`npm run test:experiments` (6 tests) pass. The new tests validate electron conservation
and shell/configuration agreement across all 118 elements, family examples, quiz-option
uniqueness/correctness across all scopes, and persisted-data validation.

Web and Android exports succeed. Android/iOS device interaction has not been tested.
The local Chrome/Playwright check at 390px and 1280px covers the separate entry, search,
shell selection, isotope counts, group/period comparisons, memory reload, ten practice
questions including blank placement, and missed-element retry. It checks page errors and
horizontal document overflow. Authentication/profile responses are mocked; no cloud writes.

Re-run `scripts/check-periodic-study.cjs` against a served web export with SPA fallback.
Optional variables: `CHEMQUEST_PLAYWRIGHT_PATH`, `CHROME_EXECUTABLE_PATH`,
`CHEMQUEST_TEST_URL` (default localhost:8096), `CHEMQUEST_SCREENSHOTS`, and `WIDTHS`.
