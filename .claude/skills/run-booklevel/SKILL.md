---
name: run-booklevel
description: run, start, screenshot, verify, launch, open Book Level app in browser (web), take screenshot of Book Level UI
---

Book Level is a React Native / Expo book-tracking app (authentication, book lists, groups, progress, rankings). For agent use it runs as a **web app** served by Expo Metro on `http://localhost:8082` and driven by Playwright via `.claude/skills/run-booklevel/driver.mjs`. The native iOS/Android path uses Expo Go on a physical device or emulator and is not automatable headlessly.

Paths below are relative to the project root (`C:\Users\wiege\BookLevel`).

## Prerequisites

```powershell
# Node 24+ and npm are required (already installed on this machine)
# react-dom and react-native-web must be installed for web support:
npm install react-dom@19.1.0 react-native-web@^0.21.0
```

Playwright is installed on demand by the driver into `C:\Temp\pw`. No manual step needed.

## Firebase patch (already applied)

`src/config/firebase.js` originally used `getReactNativePersistence(ReactNativeAsyncStorage)` which throws `is not a function` on web because the Firebase web bundle does not export that helper. The file was patched to use `Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(...)`. This is committed; native builds are unaffected.

## Run (agent path)

```powershell
# From project root — screenshot the login screen:
node .claude/skills/run-booklevel/driver.mjs screenshot my-screenshot.png

# Check the app renders with no errors (exit 1 on failure):
node .claude/skills/run-booklevel/driver.mjs check

# If server is already running on 8082, driver detects it and skips launch.
# PORT env var overrides (default 8082).
```

The driver:
1. Probes `localhost:${PORT}` — if open, reuses the running server.
2. If not open, spawns `npx expo start --web --port 8082 --no-dev` (hidden window, detached).
3. Waits up to 90 s for the port, then 15 s more for bundle compilation.
4. Opens Chromium via Playwright (390×844 viewport), waits for `networkidle` + 3 s, takes the screenshot.

First-run bundle compilation takes ~20-30 s. Subsequent runs reuse the warm cache and take ~5 s.

## Run (human path)

```powershell
npx expo start --web
```

Expo opens Chrome/Edge to `http://localhost:8082` automatically. Press `w` in the terminal to reopen the browser. Ctrl-C to stop. This path is not useful headlessly.

## Run (native, human only)

```powershell
npx expo start
# Scan the QR code with Expo Go on Android/iOS
# Press 'a' for Android emulator (requires Android Studio + AVD)
# Press 'i' for iOS simulator (macOS only)
```

## Gotchas

- **`getReactNativePersistence is not a function`** — happens when running web before the firebase.js patch is applied. Fix: see "Firebase patch" section above.
- **Port 8081 already in use** — the native Metro server occupies 8081. The web server uses 8082. Keep them separate.
- **`react-dom` / `react-native-web` not installed** — Expo aborts with `CommandError: It looks like you're trying to use web support but don't have the required dependencies installed`. Fix: `npm install react-dom@19.1.0 react-native-web@^0.21.0`.
- **Blank screenshot with no errors** — the virtual-time-budget Chrome flag does NOT wait for real HTTP requests (the JS bundle). Always use Playwright with `waitUntil: 'networkidle'`.
- **Bundle version warnings** — `expo@54.0.33` / `expo-image-picker@17.0.10` / `babel-preset-expo@55.0.11` are behind their expected patch versions. The app still runs; ignore these unless a dependency is actually broken.
- **`Input is required` / port conflict** — Expo in non-interactive mode refuses to auto-select an alternate port. Always specify `--port` explicitly.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `getReactNativePersistence is not a function` | Apply firebase.js patch (see above) and restart the server |
| App renders blank / `#root is empty` | Check browser console; usually a JS crash on startup |
| Port 8082 already listening but app won't load | Kill the stale process: `(netstat -ano \| Select-String ':8082.*LISTENING').Line.Split()[-1] \| ForEach-Object { Stop-Process -Id $_ -Force }` |
| Playwright install fails | Ensure npm can reach `cdn.playwright.dev`; corporate proxies block it |
| `Cannot find module 'playwright'` | Run the script from within `C:\Temp\pw`, or set `PW_DIR` env var |
