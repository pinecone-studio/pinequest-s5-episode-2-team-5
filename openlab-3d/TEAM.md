# OpenLab 3D — багийн ажлын хуваарь

Төсөл нь нэг бүхэл React апп тул **хүн бүр бүтэн төслийг татаж ажиллуулна**. Харин өөрт
оноогдсон хавтас, файлуудаа "эзэмшинэ" (засвар, шинэ функцийг тэр хүн хариуцна).
Одоо апп-д зөвхөн **химийн лаборатори** үлдсэн бөгөөд нийт ~7,400 мөр код байна.

## Хүн 1 — 3D орчин ба гүйцэтгэл (~2,500 мөр)

Лабораторийн өрөө, тавилга, гэрэлтүүлэг, дүрслэлийн чанар.

| Хавтас / файл | Юу хийдэг |
| --- | --- |
| `src/world/architecture/` | Хана (нэгтгэсэн mesh), цонх, шал, тааз, таазны гэрэл |
| `src/world/furniture/` | Лабораторийн ширээ (шургуулга/хаалга), угаалтуур, татах шүүгээ (fume hood), тавиур, сандал, самбар, аюулгүйн шүршүүр, гал унтраагуур, зурагт хуудас |
| `src/world/rooms/ChemistryLab.tsx` | Химийн лабын байршил: арлын ширээнүүд, горелкууд, жин, тавиурууд |
| `src/world/layout.ts`, `itemsLayout.ts` | Өрөөний план, хана/цонх, эд зүйлсийн анхны байрлал |
| `src/world/Lab.tsx`, `Lighting.tsx`, `SkyDome.tsx`, `Effects.tsx` | Угсралт, гэрэл, тэнгэр, постпроцесс (AO, Bloom, SMAA) |
| `src/world/Performance.tsx`, `StaticBatch.tsx` | DPR тохируулга, сүүдэр, шилний LOD, mesh нэгтгэл |
| `src/utils/textures.ts` | Шалны хавтан, зурагт хуудас, самбар, шошго, тэмдгийн (`signTexture`) CanvasTexture |

## Хүн 2 — Тоног төхөөрөмж ба харилцаа (~2,000 мөр)

3D багаж хэрэгслийн загвар, барих/тавих/шалгах систем, лабын төлөв.

| Хавтас / файл | Юу хийдэг |
| --- | --- |
| `src/equipment/` | Химийн багажны загварууд (аяга, колбо, туршилтын хоолой, горелка, жин …), `equipmentCatalog.ts`, `registry.tsx`, `ModelOr.tsx` (GLTF солих), `FittedModel.tsx` |
| `src/materials/` | Шил, хуванцар, металл, шингэний материал |
| `src/interaction/` | `Interactable` (тодруулга/prompt), төвийн raycast, барих/тавих (`Pickable`, `HeldItem`), F-ээр шалгах (`InspectMode`), гадаргуу, гаргах (`spawn`) |
| `src/store/useExperimentStore.ts`, `useInventoryStore.ts` | Горелка, татах шүүгээ, жингийн төлөв ба "лабын дадал"; дэлхий дээрх/гарт байгаа эд зүйлс |

### Химийн хөдөлгүүр ба лабораторийн физик (Хүн 2-т хамаарна)

| Хавтас / файл | Юу хийдэг |
| --- | --- |
| `src/chemistry/` | Бодисын сан (`species.ts`, `reagents.ts`), холимгийн загвар (моль), pH ба Ksp тэнцвэр (`equilibrium.ts`), хурдны урвал, халаалт, буцалгалт, гал (`kinetics.ts`), өнгө (`color.ts`), монгол тайлбар (`describe.ts`) |
| `src/lab/` | Лабораторийн үзэгдлийн шугам (`events.ts`), урвал ажиглагч, мэдэгдэл/робот (`announcer.ts`), асгаралт, 14 туршилтын заавар (`experiments.ts`) |
| `src/physics/breakage.ts` | Шил хагарах, мөргөлдөх дуу |
| `src/interaction/actions.ts` | R товчны бүх үйлдэл: асгах, дусаах, халбагадах, хутгах, хэмжих, шүүх, дөлийн сорил, халаах, гал унтраах |
| `src/interaction/holders.ts`, `StoredItems.tsx`, `storage.ts` | Шургуулга, шүүгээ, хуруу шилний тавиурын агуулга ба ангилал |
| `src/world/ChemSim.tsx`, `LabFx.tsx` | Секундэд 10 удаагийн химийн/дулааны симуляц, асгарсан шалбааг, шилний хэлтэрхий |
| `src/store/useChemStore.ts`, `useLabStore.ts` | Сав бүрийн агуулга, багажны заалт, туршилтын явц |

## Хүн 3 — Удирдлага, UI ба апп-ын төлөв (~3,000 мөр)

Тоглогчийн хөдөлгөөн, бүх HUD/цонх, тохиргоо, дуу.

| Хавтас / файл | Юу хийдэг |
| --- | --- |
| `src/controls/` | Тоглогчийн контроллер (rapier), физикийн алхам, товчлуурын зураглал, pointer lock, глобал товч/хулганы удирдлага |
| `src/ui/` | HUD, цэс, тохиргоо, тэмдэглэл, End/тайлан, Tools шургуулга, робот туслах, жижиг газрын зураг, ачааллын дэлгэц, гар утасны удирдлага |
| `src/store/useGameStore.ts`, `useSettingsStore.ts`, `useLoadingStore.ts` | Горим, панел, робот, тохиргоо (localStorage), ачааллын явц |
| `src/utils/sounds.ts`, `fonts.ts`, `constants.ts`, `device.ts`, `lazy.ts`, `DebugBridge.tsx` | Дуу, фонт, тогтмолууд, тест хийх debug гүүр |
| `src/App.tsx`, `src/main.tsx`, `src/index.css`, `tailwind.config.js` | Апп-ын угсралт, загвар |

## Хэсэг хоорондын "гэрээ" (өөрчлөхөөсөө өмнө ярилцах)

### Workbench round 2 (2026-10-22) — current contract

The bench now displays only the explicitly chosen experiment (`useLabStore.active`).
No proximity lesson trigger or automatic next-lesson choice. Selection/guide progress
use `openlab3d-experiments` v2; migration keeps progress and clears v1's potentially
auto-assigned selection once. Preparation and physical contents remain tab-local.

`Mode` and `Panel` unions are unchanged. The seated Tab drawer and F live-inspection
subview keep `mode: bench`; closing them never calls `resumeWalk` or pointer lock.
Walking tools and ordinary F inspect retain their original routing.

**Shared settings change:** `SettingsState.reactionAutoZoom: boolean` defaults true.
Low quality/reduced motion disables automatic camera motion and reduces molecular
particle count to 40 (otherwise capped at 150). New synthesized sounds use master audio.

NaCl's canonical chemistry is still owned by `useChemStore`; `sandbox.ts` publishes
transient vessel/rate/temperature metadata. Prepared experiments pause while walking.
The physical station's old scripted `goto` runner remains unused. Drawer preparation
reveals its original meshes, preserving free placement and live contents; no new Rapier
bodies are created for the special NaCl glassware. Other guide recipes retain the normal
inventory pipeline. The built-in local lesson id `nacl` is always in the guide menu.
No new Expo/iframe/URL contract or database change.

See `WORKBENCH-ROUND2.md` for the complete file ownership/change list and checks.
This is an in-repository team notice; no external teammate message was sent.

### Workbench round 3 (current contract)

The nearby walking and seated bench share one all-supplies drawer. Required supplies
are pinned; browsing/spawning never completes preparation. Actual pickup plus placement
on the `chem-n4` worktop completes an item, including shelf/storage objects. Wrong items
remain usable. Guide-step credit waits for preparation; real observations and measurements still record. Teacher bypass is a small explicit link. Selection survives approach and
the bench waypoint; NaCl selection is a separate menu action.

`chemistry/reaction-view.ts` observes actual equilibrium/kinetics changes;
`lab/reaction-view.ts` owns only transient vessel reaction display metadata. One generic
lens in `HUD.tsx` covers walking, bench and ordinary inspection. `useChemStore` remains
the sole source of material contents. Ordinary inspect advances chemistry at 10 Hz while
its background canvas is frozen. No shared `Mode`/`Panel` union changed in this round.
See `WORKBENCH-ROUND3.md` for changes and concrete embedded-build verification.
This is an in-repository team notice; no external teammate message was sent.

### Earlier NaCl bench integration (history; superseded by round 2)



**Earlier contract: free laboratory.** Walking is the default; no experiment selection
or ordered-step gate is required. `store/useChemStore.ts` owns shared local vessel contents; `experiments/nacl/chemistry.ts` projects those contents for the textbook view. `sandbox.ts` advances only NaCl apparatus; the room’s `ChemSim` advances ordinary vessels. Live scene equipment uses `interaction/portable.ts`; physics-backed inventory retains its inventory pipeline (`movable` defaults to false). E picks up ordinary items or operates an instrument; G always grabs inventory instruments. Q places, R uses/pours, F inspects. Movable instruments keep their original use as
`InteractableEntry.onUse` (R). Shelves' bottles/glassware are individually interactable.
`bench` means an optional V work/detail camera in the same room; it does not
activate the legacy engine step runner. Keep moving equipment outside static batching.
Warnings guide without locking pickup, mixing, spilling or movement. Restart resets the
chemistry and portable placements. See `src/experiments/nacl/README.md` for the full contract.

The earlier seated integration below is retained as history; its step-runner behavior
is superseded by the free laboratory contract above.

Shared `Mode` now includes `'bench'` for `src/experiments/nacl/` (Туршилт 1).
Owners 1/2/3: keep the station outside `StaticBatch`; its meshes animate.
While seated, OrbitControls owns the camera, walking inputs and normal HUD stay inactive,
and Escape calls `exitBench()`. Textbook reaction progress continues while walking; menus pause it.
This is local tab state; no ChemQuest XP or Supabase result is written.
This note records the contract change; no external teammate message was sent.

- **1 ↔ 2:** Лаб багажийг `<BunsenBurner />`, `<Scale />` гэх мэт компонентоор
  байрлуулна. Ширээнүүд `registerSurface()`-ээр гадаргуугаа бүртгүүлж, шургуулга/хаалганууд
  `<Interactable>` ашиглана. Багажны байрлалыг `itemsLayout.ts`-д тохирно.
- **2 ↔ 3:** UI нь `useExperimentStore` (лабын дадал `SKILLS`), `useInventoryStore`-ийг уншина.
  Товчлуурын удирдлага (`useGameKeys.ts`) нь `interactables` бүртгэл болон `heldApi`-г дууддаг.
- **1 ↔ 3:** Чанарын тохиргоо (`QUALITY_PRESETS`) нь Effects/Lighting/Performance-д нөлөөлнө.
  Газрын зураг (`Minimap`) нь `layout.ts`-ийн `LAB_BOUNDS`, `WALLS`-ыг ашиглана.
- Store-ийн бүтэц, `layout.ts`-ийн координат, `equipmentCatalog.ts`-ийн `EquipmentKind`
  гэх мэт **дундын төрлийг** өөрчлөх бол бусаддаа урьдчилан хэлнэ.

## Хамтран ажиллах дүрэм (Git)

1. Нэг хүн GitHub дээр repo үүсгэж, бусад хоёрыг collaborator болгон нэмнэ.
2. `main` салбарт шууд push хийхгүй. Хүн бүр өөрийн салбар дээр ажиллана:
   `world/...`, `equipment/...`, `ui/...` (жишээ: `ui/mongolian-language`).
3. Pull Request нээж, өөр нэг гишүүнээр шалгуулаад merge хийнэ.
4. Merge хийхээс өмнө `npm run build` алдаагүй гарах ёстой.
5. Өдөр бүр `main`-ийг өөрийн салбарт татаж (`git pull origin main`) зөрчил багасгана.

## Ажиллуулах

OpenLab нь ChemQuest repo-ийн `openlab-3d/` хавтсанд байрладаг тусдаа вэб апп.

```bash
cd openlab-3d
npm install
npm run dev                 # OpenLab-ийг дангаар нь: http://localhost:5173
npm run build:chemquest     # ChemQuest-д зориулж ../public/openlab руу build хийнэ
```

Дараа нь repo-ийн үндсэн хавтсанд `npm run web` ажиллуулаад хаб дээрх **OpenLab**
байшингийн хаалгаар орно. Гурван хэсэг (Хүн 1, 2, 3) бүгд `openlab-3d/` дотор орсон
байх ёстой, эс бөгөөс build амжилтгүй болно.

## Цааш хийж болох ажлын санаа

- **Хүн 1:** ширээн дээр илүү нарийн чимэглэл, бодит GLTF загвар оруулах, гэрэлтүүлэг/материалыг сайжруулах, Low тохиргоонд гүйцэтгэлийг дахин шалгах.
- **Хүн 2:** шинэ урвал нэмэхдээ `species.ts` (бодис), `reagents.ts` (лонх), `kinetics.ts` эсвэл `equilibrium.ts` (урвал), `describe.ts` (монгол тайлбар), `experiments.ts` (туршилтын алхам)-ыг өргөтгөнө.
- **Хүн 3:** сургалтын (tutorial) горим, хүртээмжийн шалгалт, гар утасны UI-г сайжруулах. Интерфейс аль хэдийн монгол хэл дээр болсон; шинэ бичвэр нэмэхдээ монголоор бичнэ.
