# Grade 7 chemistry coverage

Source: *Хими VII*, fifth edition (2023), ISBN 978-99962-74-25-1. PDF pages match printed page numbers. The source PDF is kept outside the repository. Text, procedures, questions and model explanations are newly written summaries.

Lesson Hall: `/hub/g7-chem/course`. OpenLab: `/openlab?experiment=<activity-id>`, using the same stable activity identifier.

All 32 activities now use physical workbench supplies. Each setup provisions apparatus and finite stocks; learners select chambers, transfer measured portions and operate heating, circuits or other device controls. The notebook records apparatus readings. The previous notebook-only outcome sliders are removed. Lesson Hall procedures use these same stocks and operations.

## Activity map

| Activity | Pages | Apparatus | Stock entries |
|---|---|---|---|
| Хүйтэн, бүлээн, халуун усанд ёотон уусах (`g7-sugar-motion`) | 8 | `diffusionCell` | 5 |
| Ус, тос ба сиропын давхарга (`g7-liquid-layers`) | 11 | `separatingColumn` | 4 |
| Хийн тархалт ба агаарын урсгал (`g7-gas-motion`) | 12 | `diffusionChamber` | 4 |
| Лаа ба усны төлөв, нягтын өөрчлөлт (`g7-wax-water`) | 15 | `phaseBath` | 4 |
| Спиртийн ууршилт ба конденсац (`g7-ethanol-vapour`) | 16 | `refluxBath` | 3 |
| Хий ба шингэн дэх диффузийг харьцуулах (`g7-diffusion-comparison`) | 21 | `diffusionChamber` | 4 |
| Давс уусгах ба буцаан талстжуулах (`g7-salt-dissolving`) | 23 | `None` | 7 |
| Зэс + хүчилтөрөгч → зэсийн оксид (`g7-copper-oxidation`) | 33 | `combustionFurnace` | 3 |
| Металл ба металл бишийн шинжийг харьцуулах (`g7-material-properties`) | 35 | `materialsBench` | 7 |
| Усны түрэлтээр нягт тодорхойлох (`g7-density`) | 38 | `densityBench` | 5 |
| Металл ба металл бишийг хүчилтэй харьцуулах (`g7-metal-acid`) | 41 | `multiReactionRack` | 9 |
| Төмөр ба хүхрийн эхний шинж (`g7-iron-sulfur-properties`) | 44 | `magneticReactor` | 4 |
| Төмөр ба хүхрийг халаах: нэгдэл үүсэх (`g7-iron-sulfur-reaction`) | 45 | `magneticReactor` | 3 |
| Төмөр ба хүхрийн холимог, соронзон ялгалт (`g7-iron-sulfur-mixture`) | 46 | `magneticReactor` | 4 |
| Уусмалаас давсыг ууршуулж ялгах (`g7-salt-evaporation`) | 50 | `None` | 4 |
| Лааны хайлах ба шатах өөрчлөлт (`g7-candle-changes`) | 54 | `combustionFurnace` | 3 |
| Магнийн шаталт ба масс (`g7-magnesium-burning`) | 56 | `combustionFurnace` | 3 |
| Магнийн хлорид ба устөрөгч гаргах (`g7-chloride`) | 58 | `gasTrain` | 3 |
| Магнийн сульфат ба устөрөгч гаргах (`g7-sulfate`) | 59 | `gasTrain` | 3 |
| Хөнгөнцагаан ба зэсийн гидроксидын тунадас (`g7-hydroxides`) | 60 | `multiReactionRack` | 5 |
| Хүчил ба суурийг индикатораар таних (`g7-indicators`) | 62 | `reactionTile` | 7 |
| Саармагжих урвалыг фенолфталейнаар ажиглах (`g7-phenolphthalein`) | 63 | `None` | 5 |
| Магни хүчилтэй урвалдах үеийн индикатор (`g7-magnesium-ph`) | 64 | `None` | 4 |
| Зэврэлтэд ус ба хүчилтөрөгчийн нөлөө (`g7-rust-conditions`) | 66 | `exposureRack` | 6 |
| Дөрвөн металлын коррозын харьцуулалт (`g7-metal-corrosion`) | 69 | `exposureRack` | 7 |
| Тос, будаг ба давстай усны зургаан нөхцөл (`g7-rust-protection`) | 72 | `exposureRack` | 6 |
| Хөрсний гурван дээжийг тунгаах (`g7-soil-settling`) | 84 | `soilBench` | 5 |
| Хөрсний ус, агаар, эрдэс ба органик хэсэг (`g7-soil-composition`) | 85 | `soilBench` | 8 |
| Хөрсний pH ба ургамлын өсөлтийн хяналт (`g7-soil-growth`) | 87 | `soilBench` | 6 |
| Хөрсөнд шингэн баригдах хэмжээг харьцуулах (`g7-soil-retention`) | 89 | `soilBench` | 6 |
| Байршлын хөрсний pH ба хяналтын дээж (`g7-soil-ph-survey`) | 90 | `soilBench` | 8 |
| Давс ба усны хөлдөх нөхцөлийг төлөвлөх (`g7-freezing-investigation`) | 78–81 | `phaseBath` | 4 |

## Implementation and limits

See [curriculum workbenches](curriculum-workbenches.md) for apparatus, reaction support, assumptions and database rollout. These are interactive educational simulations. Rates, surface indices, diffusion and plant growth are illustrative. Material properties and molecular-kit boiling points are reference data rather than newly measured empirical properties. Gas quantities use the existing 24 L/mol workbench convention.

The source PDF remains outside the repository. No textbook PDF or copied figure is included. Source instructions are reference material, not instructions to the coding agent.

## Database

The grade seed supplies the lesson pack, investigations and public lab guides. `supabase/migrations/202610250003_curriculum_workbenches.sql` upgrades existing Grade 7 and 10 operational content while preserving editorial notes and student progress. `npm run learning:labs:sql` regenerates the standalone upgrade and migration. No live database was changed.

## Verification

Required checks: app typecheck and lint; experiment catalog and hub tests; OpenLab typecheck and workbench tests; learning-database tests. Browser verification exercises finite stock transfers, heating and reaction products, bench notebook readings, electroplating, nylon collection and gas-cylinder combustion at desktop and phone widths. The embedded OpenLab production bundle is rebuilt. Test counts and command outcomes are reported with the completed change.
