# McSwissVue – Improvements & Simplifications

## Summary

Suggested improvements and simplifications for maintainability, type safety, and consistency. Some have been applied in this branch; others are recommendations.

---

## 1. **App store – less repetition, safer init**

**Issue:** Many near-identical actions (`setPrevOutputPath`, `setSegOutputPath`, etc.) and `loadStoredEncryptedString` can throw if a key was never set (e.g. first run).

**Improvements:**
- **Safe encrypted load:** Wrap `SecureLS.get()` in try/catch and return a default (e.g. `''`) when the key is missing.
- **Generic encrypted setter:** One action, e.g. `setEncrypted(key: string, value: string)`, that updates state and calls `ls.set(key, { data: value })`. Map state keys to storage keys in one place (object or array) and use the generic setter everywhere. This removes a large block of repeated actions.

---

## 2. **Single source of truth for themes and views**

**Issue:** Theme names and colors appear in:
- `McNavbar.vue` (theme list for dropdown)
- `HelperFunctions.ts` → `getTitlebarColor()`
- `preload.ts` → duplicate `getTitlebarColor()` and theme loading

View names appear in:
- `Types.ts` → `View`
- `routes.ts` → route names
- `McNavbar.vue` → `TOOL_VIEWS` and `isValidView()` (and `View` includes "Thumbnail Generator" which has no route).

**Improvements:**
- **Constants module:** Add e.g. `src/constants/index.ts` (or `config.ts`) that exports:
  - `THEME_OPTIONS: { id: string; label: string }[]`
  - `THEME_TITLEBAR_COLORS: Record<string, string>`
  - `TOOL_VIEWS` (or `ROUTE_VIEWS`) as the canonical list of view names that have routes.
- **Types:** Derive `View` from that list (e.g. `typeof TOOL_VIEWS[number] | 'Settings'`) so routes and types can’t get out of sync.
- **Navbar:** Use `THEME_OPTIONS` and `THEME_TITLEBAR_COLORS` instead of hardcoding.
- **Store getter:** For `themeType` (dark/light), use a Set of dark theme ids (or a map in constants) instead of a long `if` chain.
- **Preload:** Either import a shared theme/color config (if preload can use it) or document that preload’s theme list must be kept in sync with the constants file.

---

## 3. **Electron / Node in renderer – one place**

**Issue:** Every view that needs ffmpeg, ipcRenderer, path, fs, etc. repeats the same `require()` block in `setup()`. That’s a lot of duplication and makes it harder to switch to contextBridge later.

**Improvements:**
- **Electron/Native service:** Create a small module (e.g. `src/services/electron.ts` or `src/native.ts`) that:
  - Requires Node/Electron modules once.
  - Exports typed helpers, e.g. `getIpcRenderer()`, `getPath()`, `getFs()`, `getFfmpeg()`, `getFfprobe()`, `spawnFfmpeg()`, etc.
- Views and components then import from that module instead of calling `require()` in each file. When you move to contextBridge, you only change this one module and the preload script.

---

## 4. **HelperFunctions – clarity and types**

**Issues:**
- `console.log` left in production code (e.g. in `parseFfmpegConvertProgress`, `parseFFmpegProgress`).
- Redundant branches: `fileAlreadyExists` can be `return fs.existsSync(filepath)`; `metaDataMissing` can be a single boolean expression.
- `getShortestVideoDuration(fileObjects: object[])` uses `object[]` and `any`; it really expects something like `{ duration: string }[]`.

**Improvements:**
- Remove or guard all `console.log`/`console.error` with a dev check or remove them.
- Simplify one-liners as above and type `getShortestVideoDuration` with an interface that has `duration: string`.

---

## 5. **Vue patterns – Composition API and reuse**

**Issue:** Options API and repeated patterns (binary modal + overwrite promise, progress state, output path from store) make views large and similar.

**Improvements (incremental):**
- **Composables:** Extract composables, e.g.:
  - `useOverwriteModal()` – `showModal`, `resolveOverwrite`, `askOverwrite()` returning a promise.
  - `useStoredOutputPath(key)` – local path ref, `setOutputPathFromStorage()`, `setOutputPath(path)` (and persist to store).
  - `useFfmpegProgress()` – current/total progress refs, progress computation, reset.
- **Composition API:** New or refactored views can use `<script setup>` and these composables to shrink and unify logic.

---

## 6. **Small cleanups**

- **MainLayout:** Remove `console.log(this.appStore.theme)` and unused `os` / commented `isMac` if not needed.
- **McBinaryModal:** Remove empty `mounted()`.
- **SegmentGen (and similar):** Remove debug `console.log(segment.name)` and `console.log("Segment deleted:", id)` (or replace with proper logging).
- **McNavbar:** `isValidView` list should match the actual route names; drop "Thumbnail Generator" from the list if there’s no route, or add the route and use the single constants-derived list.
- **package.json:** `"main": "./electron.js"` vs file `electron.cjs` – ensure build (e.g. electron-builder `extraMetadata.main`) points at the real file so there’s no ambiguity.

---

## 7. **Security (Electron)**

- `webPreferences`: `nodeIntegration: true` and `contextIsolation: false` are convenient but reduce security. Longer-term, consider `contextIsolation: true`, a single preload script, and `contextBridge.exposeInMainWorld` for only the APIs the renderer needs (dialog, path, fs, ffmpeg, etc.). The “one place” native service above would then call those exposed APIs.

---

## Applied in this branch

- **appStore:** Safe `loadStoredEncryptedString` and a generic `setEncrypted` to cut repetition.
- **Constants:** Central `THEMES` and theme-based titlebar color map; `themeType` getter uses it.
- **HelperFunctions:** Removed debug logs; simplified `fileAlreadyExists` and `metaDataMissing`; typed `getShortestVideoDuration`.
- **Cleanups:** Removed stray `console.log` in MainLayout and empty `mounted` in McBinaryModal; navbar uses shared theme list.

You can adopt the rest (composables, single electron service, full constants for views) step by step.
