# Experiment quantity guidance

Source: user-supplied **Хими VIII**, `08_khimi.pdf`. Page numbers below are the printed page numbers, matching PDF pages. The original PDF and extracted text are not included in the repository.

## Catalyst / elephant toothpaste — page 102, experiment 6

The book specifies a 100 mL measuring cylinder, 20–30 mL hydrogen peroxide, a small amount of detergent, and approximately 0.1 g of either potassium iodide or manganese dioxide. It does not assign a detergent volume or a peroxide concentration in this procedure. It asks students to compare foam height after five minutes and investigate reuse of the catalyst.

The application supplies 3% peroxide and **0.5 M KI solution**, rather than a weighed solid catalyst. Its displayed KI volume is a calculated adaptation:

`0.1 g / 166.0028 g·mol⁻¹ / 0.5 mol·L⁻¹ × 1000 = 1.2048 mL`.

The UI rounds this to approximately 1.2 mL and identifies the adaptation. The stock concentration comes from the reagent catalog. Detergent quantity remains open for observation and comparison. This change does not implement the book's five-minute measurement or catalyst recovery procedure.

## Sodium chloride from carbonate — page 22, experiment 1

The book limits the acid to no more than one-third of the beaker volume. It adds solid carbonate gradually with stirring until further carbonate remains undissolved, then filters and crystallises. It does **not** prescribe a universal 50 mL acid quantity or a fixed carbonate mass.

The existing simulated station uses a 150 mL beaker and a 50 mL measuring task. The guide identifies that as the application's task at the one-third limit, rather than a direct textbook dose.

## Other existing demonstrations

The titration, NH₄NO₃/NaOH temperature comparison, and ethanol-fire quantities currently displayed are existing app variants. They are labelled accordingly; this source does not establish them as the textbook's exact recipes. In particular, the salt-dissolution experiment on page 114 uses KCl in approximately 25 mL water, so it must not be substituted directly for the app's different reagents.

## Measurement behavior

The notebook counts actual liquid volume received through the supported transfer paths, not nominal button presses or current solution volume. It resets for a new attempt. Quantity feedback is advisory and does not gate equipment or award completion. The guide keeps optional technique explanations separate from visible target amounts.
