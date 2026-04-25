# Squad UP Arena APK Build & Publish Guide

This project is configured with **Capacitor** to allow generation of a native Android APK.

## 1. Project Configuration
- **Package ID**: `com.squadup.arena`
- **Build Tool**: Capacitor
- **Update System**: Firestore-driven (`system/config` collection)

## 2. How to Build the APK
To build the APK locally, follow these steps:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Build Web App**:
   ```bash
   npm run build
   ```
3. **Add Android Platform** (first time only):
   ```bash
   npx cap add android
   ```
4. **Sync Web Code to Android**:
   ```bash
   npx cap sync
   ```
5. **Generate APK with Android Studio**:
   - Open the `android` folder in Android Studio.
   - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - For a production release, use **Build > Generate Signed Bundle / APK**.

## 3. Mandatory Publish Workflow (Manual)
As requested, updates are **NOT** automatic. You must manually trigger an update notification for users.

### Step-by-Step Release:
1. **Prepare Build**: Incremenet `APP_VERSION_CODE` and `APP_VERSION_NAME` in `src/App.tsx`.
2. **Test**: Build the APK and test it on a device.
3. **Publish (Manual Command)**:
   - When you are ready to release, update the `system/config` document in Firebase:
     - `latestVersionCode`: Set to the new version code.
     - `latestVersionName`: Set to the new version name (e.g., "1.1.0").
     - `updateUrl`: Link to your new APK (e.g., Firebase App Distribution or GitHub Release).
     - `isUpdateMandatory`: Set `true` if you want to block the app until they update.
4. **Notification**: Once saved in Firestore, all users currently in the app will see the **"New Update Available"** screen instantly.

## 4. Distribution via Firebase
1. Go to **Firebase Console > App Distribution**.
2. Upload your generated `.apk`.
3. Add your testers/users and share the link.
4. Copy the download link and paste it into the `updateUrl` field in the `system/config` collection.

---
**Goal**: Stable, controlled releases with zero accidental updates.
