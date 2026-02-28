# Android Build Guide

## Requirements
- Node.js 18+ (recommended: latest LTS)
- npm
- Expo account
- `eas-cli`

## 1. Install dependencies
```bash
cd /Users/eugene/Documents/app/VocabCardsApp
npm install
```

## 2. Login to Expo
```bash
npx expo login
```

## 3. Install EAS CLI
If `eas` is not installed globally:
```bash
npm i -g eas-cli
```

## 4. Configure EAS (first time only)
```bash
eas build:configure
```
This creates/updates `eas.json` and links your project to Expo.

## 5. Build Android APK (internal testing)
```bash
eas build -p android --profile preview
```
- Use this for direct install/testing on devices.
- After build completes, Expo returns a download link/QR.

## 6. Build Android AAB (Google Play)
```bash
eas build -p android --profile production
```
- Use this artifact for Google Play Console upload.

## Optional: local dev run on Android emulator/device
```bash
npm run android
```

## Useful commands
- Check project/build setup:
```bash
eas diagnostics
```
- See recent builds:
```bash
eas build:list -p android
```
- Download a specific build:
```bash
eas build:view <BUILD_ID>
```

## Notes
- If `preview` / `production` profiles are missing, add them in `eas.json`.
- For release builds, keep versioning updated in `app.json` (`version`, `android.versionCode`).
- First production build may ask to generate/upload Android credentials (keystore). Prefer Expo-managed credentials unless you already manage your own.
