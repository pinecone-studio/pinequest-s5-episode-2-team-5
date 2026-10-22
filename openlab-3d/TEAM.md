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

### NaCl bench integration (2026-10-22)

**Current contract: free laboratory.** Walking is the default; no experiment selection
or ordered-step gate is required. `experiments/nacl/sandbox.ts` owns shared local vessel
contents. Live scene equipment uses `interaction/portable.ts`; physics-backed inventory
retains its inventory pipeline (`movable={false}` on its Interactable). E picks up,
Q places, R uses/pours, F inspects. Movable instruments keep their original use as
`InteractableEntry.onUse` (R). Shelves' bottles/glassware are individually interactable.
`bench` now means only an optional V orbit/zoom camera in the same room; it does not
activate the legacy engine step runner. Keep moving equipment outside static batching.
Warnings guide without locking pickup, mixing, spilling or movement. Restart resets the
chemistry and portable placements. See `src/experiments/nacl/README.md` for the full contract.

The earlier seated integration below is retained as history; its step-runner behavior
is superseded by the free laboratory contract above.

Shared `Mode` now includes `'bench'` for `src/experiments/nacl/` (Туршилт 1).
Owners 1/2/3: keep the station outside `StaticBatch`; its meshes animate.
While seated, OrbitControls owns the camera, walking inputs and normal HUD stay inactive,
and Escape calls `exitBench()`. Engine progress pauses on exit and resumes on re-entry.
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
- **Хүн 2:** химийн шинэ туршилт нэмэх (титрлэлт, pH индикатор, урвалын өнгө өөрчлөгдөх), багажны дуу/анимаци.
- **Хүн 3:** сургалтын (tutorial) горим, хүртээмжийн шалгалт, гар утасны UI-г сайжруулах. Интерфейс аль хэдийн монгол хэл дээр болсон; шинэ бичвэр нэмэхдээ монголоор бичнэ.
