This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Grade 8 revision hub

- Install: `npm ci`. Checks: `npm run typecheck`, `npm run lint`,
  `npm run test:experiments && npm run test:hub`.
- E2E and local Supabase are not configured yet; choose E2E tooling in Phase 7.
- Implement phases sequentially. Phase 1 adds content and validation only, no UI.
- Reference: `docs/hub-g8/README.md` and `docs/hub-g8/chemquest-g8-hub.html`.
  Port behavior to React Native; do not embed the HTML in a WebView.
- Source content: `docs/hub-g8/grade8-chemistry.content.json`; app copy:
  `src/data/revision-hub/g8-chem/content.json`, types in `src/data/revision-hub/types.ts`.
  Preserve field names and Mongolian content. Content never contains HTML.
- Reuse existing design tokens and UI components. Use `react-native-svg` for figures.
  One shared rich-text renderer handles bold, italic, subscripts, superscripts and nuclides.
- No entitlement gate until the school licensing model exists.
- Hub progress belongs in the `hub` schema with own-row RLS. Add new numbered migrations;
  never edit applied migrations. Writes must be idempotent and merge-safe: max scores,
  union sets, latest ratings, never blind overwrite.
- Off-limits: `openlab-3d/`, `public/openlab/`, `src/components/openlab/`,
  `src/app/(game)/openlab.tsx`, `src/hooks/use-openlab-catalog.ts`,
  `src/services/experiments.ts`, existing experiment SQL and migrations.
  Do not import the lab's Zustand stores. Link practicals only by their lab identifier;
  confirm the route format before implementing deep links.
- `docs/hub-g8/source/` is private: never commit or quote textbook PDFs.
- Run all checks and report their output before declaring a phase complete.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
