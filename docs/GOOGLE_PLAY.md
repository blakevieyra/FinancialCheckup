# Google Play Store — Financial Checkup (Android)

This guide walks you through building and submitting the Android app using **Capacitor** (native shell around the React web app).

## Prerequisites

1. **Google Play Developer account** — [play.google.com/console](https://play.google.com/console) ($25 one-time fee).
2. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio) (includes JDK 17+).
3. **Production API URL** — your Render API host, e.g. `https://financialcheckup-api.onrender.com`.

## One-time setup

```powershell
cd client
npm install
npm run build
npx cap add android
```

If `android/` already exists in the repo, skip `cap add android` and run `npm run build:mobile` instead.

## Configure production API for mobile builds

The mobile app bundles the web UI locally but calls your hosted API. Set the API URL **at build time**:

```powershell
cd client
$env:VITE_API_BASE_URL="https://YOUR-API-HOST.onrender.com"
npm run build:mobile
```

Or create `client/.env.production`:

```
VITE_API_BASE_URL=https://YOUR-API-HOST.onrender.com
```

Then run `npm run build:mobile`.

> **Important:** Ensure server CORS allows requests from the Capacitor WebView. Check `CLIENT_URL` and CORS settings in `server/index.js`.

## Open in Android Studio

```powershell
npm run android:open
```

In Android Studio:

1. Wait for Gradle sync to finish.
2. **Build → Generate Signed App Bundle / APK…**
3. Choose **Android App Bundle (AAB)** — required for Play Store.
4. Create or select a **upload keystore** (see below).
5. Build **release** variant.

Output: `client/android/app/release/app-release.aab`

## Upload keystore (keep this safe)

Generate once and store the `.jks` file and passwords in a password manager — **you cannot publish updates without it**.

```powershell
keytool -genkey -v -keystore financialcheckup-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

In Android Studio signed-bundle wizard, point to this keystore.

## Play Console checklist

### App content

| Item | Value / action |
|------|----------------|
| **App name** | Financial Checkup |
| **Package name** | `com.operone2i.financialcheckup` |
| **Category** | Finance |
| **Privacy policy URL** | `https://YOUR-WEB-HOST/privacy.html` |
| **Contact email** | support@financialcheckup.app (update if different) |

### Store listing assets

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 512×512 PNG | Use `client/public/logo.png` |
| Feature graphic | 1024×500 PNG | Store banner |
| Phone screenshots | 2+ | Login, score overview, finances |
| Short description | ≤ 80 chars | e.g. "Score your financial health in minutes." |
| Full description | ≤ 4000 chars | 6-dimension score, no bank login, action plan |

### Data safety form

- **Collected:** email, financial info user enters, basic app logs.
- **Not collected:** bank credentials, precise location.
- **Encrypted in transit:** Yes (HTTPS).
- **Deletion:** Yes (in-app + email support).

### Content rating

Complete the IARC questionnaire in Play Console.

## Versioning

Before each release:

1. `client/package.json` → bump `"version"`.
2. `client/android/app/build.gradle` → increment `versionCode`, update `versionName`.

Then `npm run build:mobile` and build signed AAB in Android Studio.

## Testing

```powershell
npm run android:run
```

Verify login, scoring, back button, and safe areas on a real device or emulator.

## Optional: Trusted Web Activity (TWA)

To load your hosted website instead of bundled assets (web updates without app resubmission), use [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) and host `/.well-known/assetlinks.json`. Capacitor is recommended for the first Play Store release.
