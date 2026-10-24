# Grade 9 textbook coverage

Source: *Хими IX*, fourth edition (2022), ISBN 978-99962-74-41-1. PDF pages match printed page numbers. The source PDF is not included in the repository. Procedures and teaching content are paraphrased.

29 labelled experiment headings plus 3 unnumbered demonstrations are available as bench activities. Composite experiments retain their comparisons (including three diffusion media, two thermal pairs, and seven corrosion treatments).

| Activity | Pages | Delivery | Source |
|---|---|---|---|
| Халуун, хүйтэн усны молекулын хөдөлгөөн (`g9-liquid-motion`) | 7 | bench | Labelled experiment |
| Усны хайлах, буцлах шилжилт (`g9-state-change`) | 12 | bench | Labelled experiment |
| Хийн эзлэхүүн ба температур (`g9-gas-expansion`) | 14 | bench | Labelled experiment |
| Шингэн дэх диффуз (`g9-liquid-diffusion`) | 16 | bench | Labelled experiment |
| Аммиак, HCl хийн диффуз (`g9-gas-diffusion`) | 18 | bench | Labelled experiment |
| Диффузийн хурдад температурын нөлөө (`g9-diffusion-temperature`) | 20 | bench | Labelled experiment |
| Нунтаглалт ба усанд тархах хурд (`g9-diffusion-surface`) | 21 | bench | Labelled experiment |
| Ус, желатин, цаасан дахь будаг (`g9-diffusion-media`) | 23 | bench | Labelled experiment |
| III үеийн элементүүдийн шинж (`g9-period3`) | 50 | bench | Labelled experiment |
| Галогены халах урвалын хүснэгт (`g9-halogens`) | 55 | bench | Labelled experiment |
| Шилжилтийн металлын нэгдлийн өнгө (`g9-transition-colours`) | 62 | bench | Labelled experiment |
| Металлын оксидын катализаторын нөлөө (`g9-catalyst-screen`) | 63 | bench | Labelled experiment |
| Металл, металл биш, металлоид (`g9-element-types`) | 69 | bench | Labelled experiment |
| Хар маркерын цаасан хроматограф (`g9-chromatography`) | 72 | bench | Labelled experiment |
| Гомоген ба гетероген холимгийг шүүх (`g9-filtration`) | 91 | bench | Labelled experiment |
| Гомоген холимгийг талстжуулах (`g9-crystallisation`) | 95 | bench | Labelled experiment |
| Битүү ба нээлттэй системийн масс (`g9-mass-conservation`) | 102 | bench | Labelled experiment |
| Нэгдэх ба задрах урвал (`g9-reaction-types`) | 104 | bench | Labelled experiment |
| CuSO₄ ба NaOH — солилцох урвал (`g9-precipitation`) | 105 | bench | Labelled experiment |
| Экзотерм ба эндотермийг хэмжих (`g9-thermal-pairs`) | 110 | bench | Labelled experiment |
| Түлшний энергийг хэмжих (`g9-fuel-energy`) | 114 | bench | Labelled experiment |
| Нимбэгний хүчил ба сод (`g9-citric-endotherm`) | 116 | bench | Labelled experiment |
| Хүчил ба суурийг лакмусаар таних (`g9-litmus`) | 118 | bench | Labelled experiment |
| Ахуйн уусмалын pH эрэмбэ (`g9-ph-ranking`) | 120 | bench | Labelled experiment |
| Zn ба HCl — устөрөгч гаргах (`g9-zinc-hcl`) | 123 | bench | Labelled experiment |
| CaCO₃ + HCl ба шохойн усны сорил (`g9-carbonate-co2`) | 125 | bench | Labelled experiment |
| Mg(OH)₂-оор хүчлийг саармагжуулах (`g9-antacid`) | 129 | bench | Labelled experiment |
| Агаар дахь O₂-ийн эзлэх хувь (`g9-air-oxygen`) | 162 | bench | Labelled experiment |
| Төмрийг зэврэлээс хамгаалах (`g9-corrosion`) | 176 | bench | Labelled experiment |
| Аммиак гарган авах ба таних (`g9-ammonia-preparation`) | 127 | bench | Supplementary demonstration |
| Усыг таних хоёр химийн сорил (`g9-water-tests`) | 159 | bench | Supplementary demonstration |
| Шингэн агаарыг хэсэгчлэн нэрэх (`g9-air-distillation`) | 164–165 | bench | Supplementary demonstration |

## Interpretation and limits

- Twelve dedicated apparatus kinds and paper strips complement the existing glassware, measuring tools, burners and stock bottles.
- Bench activities use the existing select, pour, stir, heat and measure controls. Their notebooks record the simulated vessel state; completion requires prediction, comparison and explanation rather than recipe-locking.
- All Grade 9 activities launch physical workbench setups. Dedicated apparatus receive depleted portions through the same pour/scoop controls as Grade 8. Transport rates, corrosion indices and catalyst coefficients remain teaching approximations; the 3D lab is a simulation.
- The transfer ledger records grams for solids and millilitres for liquids, without combining unlike units. Textbook quantities appear directly in the workbench guide.
- Methods distinguish textbook quantities from app-selected concentrations or example quantities. A missing textbook dose is explicitly left as an investigation variable.
- Mass-conservation and carbonate models enforce limiting acid. Gas expansion uses Kelvin temperature. Chromatography reports spot distances and solvent front; gas diffusion locates the NH₄Cl ring nearer HCl.
- Citric acid has its own triprotic charge balance; the lemon sample does not substitute acetate. Dissociation constants follow [Merck citric acid product data](https://www.merckmillipore.com/SG/en/product/sial/c0759).
- Liquid-air separation is a boiling-point schematic, not a complete vapour–liquid equilibrium simulation. Ammonia collection is qualitative. Crystallisation uses the existing simplified solubility engine.
- Notebook measurements persist across refresh. Physical contents restart with a fresh setup, matching the lifetime of the existing Grade 8 chemistry store. Transient spawn IDs never restore old reaction contents.
- Chapter 6 corrosion is numbered 6.4 in the app to disambiguate the book’s duplicated 6.3 heading.
- Grade 8 and Grade 9 have separate revision storage keys. All Grade 9 investigation/practical IDs are prefixed `g9-`. Existing Grade 8 storage keys remain valid.

## Learning coverage

17 topics across all six chapters include notes, flashcards, a quiz and a structured question. This is an introductory revision pack, not a transcription of every textbook exercise. Shared periodic-table tools remain available separately.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm run test:hub`, `npm run test:experiments`, and `npm --prefix openlab-3d run test:workbench`. Rebuild embedded lab assets with `npm --prefix openlab-3d run build:chemquest`.

Browser validation: all 32 setups prepared and mounted successfully; 390 px and 1280 px interaction checks cover stock pickup, measured pouring into separate compartments, live NH₄Cl formation, notebook measurements, and a clean refreshed apparatus with saved notebook evidence.
