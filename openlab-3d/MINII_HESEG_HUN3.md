# Хүн 3 — Удирдлага, UI ба апп-ын төлөв

Тоглогчийн хөдөлгөөн, бүх HUD/цонх, микроскопын харагдац, компьютерын апп, робот, тохиргоо, дуу, төслийн тохиргооны файлууд.

Энэ zip-д **зөвхөн таны хариуцах 49 файл** байна (код ~4101 мөр). Апп-ыг
ажиллуулахын тулд гурван хэсгийг нэг дор нийлүүлэх хэрэгтэй.

## ChemQuest repo-д оруулах

1. Repo-гийн хамгийн сүүлийн хувилбарыг татна: `git pull`
2. Энэ zip-ийг repo-гийн **үндсэн хавтсанд** (`pinequest-s5-episode-2-team-5/`) задална.
   Zip дотор `openlab-3d/` хавтас байгаа тул файлууд автоматаар
   `pinequest-s5-episode-2-team-5/openlab-3d/...` руу орно. Хуучин файлыг дарах эсэхийг
   асуувал "Yes" гэнэ (зөвхөн `TEAM.md` давхцана).
3. Commit хийж push хийнэ:

```bash
git add openlab-3d
git commit -m "Хүн 3 — Удирдлага, UI ба апп-ын төлөв"
git push
```

## Гурван хэсэг бүгд орсны дараа ажиллуулах

```bash
cd openlab-3d
npm install
npm run build:chemquest
cd ..
npm run web
```

Хаб дээрх **OpenLab** байшингийн хаалгаар ороход 3D лаборатори нээгдэнэ.
OpenLab-ийг дангаар нь турших бол `openlab-3d` дотор `npm run dev`.

Бусад хэсгүүд: **Хүн 1 — 3D орчин ба гүйцэтгэл**, **Хүн 2 — Тоног төхөөрөмж, харилцаа, туршилт**. Хэсэг хоорондын холбоос,
Git-ийн дүрмийг `TEAM.md`-ээс харна уу.

## Таны файлууд

| Файл | Мөр |
| --- | --- |
| `.gitignore` | 17 |
| `README.md` | 133 |
| `index.html` | 14 |
| `package-lock.json` | — |
| `package.json` | 39 |
| `postcss.config.js` | 6 |
| `src/App.tsx` | 89 |
| `src/controls/PhysicsDriver.tsx` | 28 |
| `src/controls/Player.tsx` | 253 |
| `src/controls/keyMap.ts` | 136 |
| `src/controls/useGameKeys.ts` | 224 |
| `src/controls/usePointerLock.ts` | 88 |
| `src/index.css` | 72 |
| `src/main.tsx` | 24 |
| `src/store/useGameStore.ts` | 178 |
| `src/store/useLoadingStore.ts` | 35 |
| `src/store/useSettingsStore.ts` | 83 |
| `src/ui/ControlsHelp.tsx` | 59 |
| `src/ui/Crosshair.tsx` | 16 |
| `src/ui/EndButton.tsx` | 48 |
| `src/ui/HUD.tsx` | 71 |
| `src/ui/InteractionPrompt.tsx` | 54 |
| `src/ui/LaptopScreen.tsx` | 287 |
| `src/ui/LoadingScreen.tsx` | 88 |
| `src/ui/MenuButton.tsx` | 22 |
| `src/ui/MenuPanel.tsx` | 172 |
| `src/ui/MicroscopeView.tsx` | 510 |
| `src/ui/Minimap.tsx` | 115 |
| `src/ui/NotesButton.tsx` | 24 |
| `src/ui/NotesPanel.tsx` | 116 |
| `src/ui/PauseMenu.tsx` | 43 |
| `src/ui/RobotAssistant.tsx` | 230 |
| `src/ui/RoomToast.tsx` | 59 |
| `src/ui/SettingsPanel.tsx` | 174 |
| `src/ui/SummaryScreen.tsx` | 96 |
| `src/ui/ToolTab.tsx` | 216 |
| `src/ui/TouchControls.tsx` | 110 |
| `src/utils/DebugBridge.tsx` | 106 |
| `src/utils/constants.ts` | 64 |
| `src/utils/device.ts` | 4 |
| `src/utils/fonts.ts` | 16 |
| `src/utils/lazy.ts` | 12 |
| `src/utils/sounds.ts` | 150 |
| `src/vite-env.d.ts` | 5 |
| `tailwind.config.js` | 25 |
| `tsconfig.app.json` | — |
| `tsconfig.json` | — |
| `tsconfig.node.json` | — |
| `vite.config.ts` | 24 |
