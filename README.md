# pinequest-s5-episode-2-team-5

**ChemQuest** is a virtual chemistry lab built like a 2D game hub. Players walk around a campus with everyone else, enter buildings (hubs) and learn chemistry in three classes: Beginner, Medium and Hard.

Built with React Native + Expo (SDK 58), Expo Router, Reanimated and react-native-svg.

## Run it

```bash
npm install
npm run dev        # same as npx expo start
```

- **Phone:** install **Expo Go** and scan the QR code. Expo Go must support SDK 58.
- **Browser:** press `w` in the terminal.

Other scripts: `npm run lint`, `npm run typecheck`.

## What's in the app

| Screen | What it does |
| --- | --- |
| Welcome | Intro screen with a "Create account" or "Sign in" choice |
| Sign up | Email, password (with strength meter), nickname and **starting class**. Shows a live preview of your character |
| Sign in | Email + password |
| Hub (campus) | Tap to walk, and the camera follows you. Tap a building to walk to its door and go inside. Other players wander, chat and visit buildings. Tap a player to see their card and wave |
| Lessons Hall | Class tabs, a class banner with progress, and a zig-zag lesson path. Tap a lesson for details |
| Lesson | Short "lab notes" cards, then quiz questions. You get 1–3 stars and XP. Finishing a class unlocks the next one |
| Global Ranking | Podium for the top 3, then the full list, filters per class, and your own rank pinned at the bottom |
| Profile | Tap your chip in the hub for level, XP, lessons done and sign out |

## Game rules

- You start in the class you picked at sign-up. That class and every class below it are open.
- Lessons in your current class unlock one at a time. Classes below yours are fully open for review.
- Finishing every lesson in your current class unlocks the next class.
- Stars depend on quiz mistakes: 0 mistakes = 3 stars, 1 = 2 stars, 2 or more = 1 star. XP = the lesson's XP × 60% / 80% / 100% for 1 / 2 / 3 stars.
- Replaying a lesson only adds XP when you beat your best, so players can't farm the ranking.
- Every 250 XP is one level.

All of these rules are in `src/lib/progress.ts`.

## Project structure

```
src/
  app/                    Routes (Expo Router)
    _layout.tsx           Fonts, splash screen, auth guard (Stack.Protected)
    (auth)/               welcome, sign-up, sign-in
    (game)/               index (hub), lessons/, lessons/[lessonId], ranking
  components/
    ui/                   Design system: GameButton, TextField, ClassCard, BottomSheet…
    avatar/               The scientist character (SVG) + round portrait
    world/                Hub map: config, ground, buildings, scenery, walking, pathfinding
    hub/                  HUD, door transition, player card, profile sheet
    lessons/              Class tabs, lesson path, lesson sheet, quiz/info cards, completion
    ranking/              Podium, rank rows
  context/session.tsx     Signed-in user + signUp / signIn / signOut / completeLesson
  data/classes.ts         The 3 classes and all lesson content
  data/players.ts         Mock players for the hub and ranking
  services/               Mock backend (auth, leaderboard, presence)
  lib/                    Progress rules, validation, avatar look, haptics
  constants/theme.ts      Colors, fonts, radii, XP per level
```

## Common changes

**Add or edit a lesson:** edit `src/data/classes.ts`. A lesson is a list of steps:
- `info`: a lab-notes card with an icon, title and body
- `quiz`: a question, options and the index of the right answer

Icon names come from MaterialCommunityIcons ([icon search](https://icons.expo.fyi)).

**Add a hub building:** add an entry to `BUILDINGS` in `src/components/world/world-config.ts`, with the route it opens, its rect and its door point. Then draw a sprite for it in `buildings.tsx`. Pathfinding picks up new obstacles automatically.

**Move things around the map:** every tree, lamp, bench, path and building position is in `world-config.ts`. The world is 640 × 1100 dp.

## Backend (currently mocked)

There is no server yet. Accounts, progress and the ranking live in AsyncStorage on the device: `src/services/auth.ts`, `leaderboard.ts` and `presence.ts`. The rest of the app only calls these modules. To connect a real backend (Firebase, Supabase or your own API), re-implement their functions with the same signatures:

- `auth.ts`: sign up, sign in, sign out, restore the session, save the user. The mock hashes passwords locally only so they aren't stored in plain text. A real backend must handle passwords itself.
- `leaderboard.ts`: a server query sorted by XP.
- `presence.ts` + `components/world/remote-player.tsx`: real multiplayer. Stream other players' positions over a realtime channel (Socket.IO, Supabase Realtime…). Then drive each avatar with `walker.walk(findPath(...))` instead of the random wander loop.

## Design notes

- Font: **Fredoka** (`@expo-google-fonts/fredoka`). It has no Cyrillic glyphs. To translate the app into Mongolian, switch to a font that has them (for example Nunito or Rubik).
- Colors and class colors are in `src/constants/theme.ts` and `src/data/classes.ts`.
- All game art (buildings, trees, the scientist) is code-drawn SVG, so it stays sharp at any size and is easy to recolor.
- App icon sources are in `assets/icon-source/*.svg`. To re-export one: `rsvg-convert -w 1024 -h 1024 assets/icon-source/icon.svg -o assets/images/icon.png`.

## Next ideas

- A `lab` lesson step with interactive experiments (mix solutions, watch the pH indicator change color)
- Avatar customization (hair, goggles, coat badges)
- Daily challenges and weekly ranking
- Real backend + realtime presence in the hub
