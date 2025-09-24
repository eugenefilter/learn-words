# Repository Guidelines

## Project Structure & Module Organization
- Routes: `app/` (expo-router). Tabs declared in `app/_layout.tsx`; tab stacks under `app/(tabs)/*`.
- Screens: `screens/` (list, main card, etc.).
- UI: `components/ui/*`; Cards: `components/card/*`; Library UI: `components/library/*`.
- Data: `database/` (SQLite init + migrations), `models/` (CRUD), `types/` (TS types), `context/AppContext.tsx` (current language/dictionary).
- Assets: `assets/` (images, fonts). Styles: `global.css`, `tailwind.config.js`.

## Build, Test, and Development Commands
- Run dev server: `npm run start` (Expo Dev, choose platform or use `npm run ios` / `npm run android` / `npm run web`).
- Lint: `npm run lint` (Expo ESLint rules).
- Tests: `npm test` (Jest + jest-expo, watch mode).
- Build (CI/EAS): `npm run build` (delegates to EAS CLI; configure in `eas.json`).

## Coding Style & Naming Conventions
- TypeScript strict; Components in PascalCase; hooks camelCase (e.g., `useDebounce`).
- Styling via NativeWind/Tailwind. Dark theme only: use `bg-primary-900/800/300`, borders `primary-200/300`, accents `accent-600/700`. No white panels.
- UI patterns (mandatory):
  - Confirmations: `components/ui/ConfirmDialog` (no system `Alert`). For info-only: `showCancel={false}` with “Понятно”.
  - Notifications: `components/ui/Toast` (`success|error|info`), not modals.
  - Fixed CTA buttons (Add/Edit): position above tab bar with `bottom = tabBarHeight + insets.bottom + 12`; add matching `paddingBottom` to content.
  - Keyboard: iOS forms use `KeyboardAvoidingView` with `behavior='padding'`.

## Testing Guidelines
- Framework: Jest (`jest-expo`). Run with `npm test`.
- Cover model logic (SQLite CRUD), multi-dictionary flows, and key UI paths (Add/Edit save + toasts, delete with ConfirmDialog, swipe navigation).
- Place tests adjacent or under `__tests__/` with matching filenames.

## Commit & Pull Request Guidelines
- Commits: imperative, concise, Conventional (e.g., `feat(library): add CSV import with dedupe`).
- PRs: summary, screenshots (UI), test steps, linked issues, and DB migration notes. Keep scope tight and follow UI/UX rules above.

## Architecture Notes
- Navigation: expo-router (Tabs + stack per tab). Screens: `app/index.tsx` → list, `app/card.tsx` → main card, `app/(tabs)/add.tsx`, `app/(tabs)/edit.tsx`, `app/(tabs)/library.tsx`.
- Data: SQLite tables — `languages`, `dictionaries`, `cards`, `examples`. Migrations and default seed (English + Default dictionary) in `initDatabase()`.
- Context: `AppContext` exposes `currentLanguageId/currentDictionaryId`. Always pass `dictionaryId` to `CardModel` queries.
- Flows: Add shows success toast then `router.replace('/')` (~600ms delay). Edit returns to card: `router.replace('/card?id=...')`.
