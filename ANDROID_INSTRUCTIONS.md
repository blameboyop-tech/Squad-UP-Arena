# Android APK Build Guide

Follow these steps to generate your APK:

### STEP 1: Export Source Code
1. Click on the **Settings** (gear icon) in the top right menu.
2. Select **Export to ZIP** or **Export to GitHub**.
3. Download and extract the files to your computer.

### STEP 2: Build Project
Open your terminal in the extracted project folder and run:
```bash
npm install
npm run build
```

### STEP 3: Sync with Android
Ensure the `android` folder exists (It is included in this export). Run:
```bash
npx cap sync
```

### STEP 4: Open in Android Studio
1. Open **Android Studio**.
2. Click **Open** and select the `android` folder inside your project.
3. Wait for Gradle to finish indexing.

### STEP 5: Generate APK
1. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
2. Once finished, a popup will appear at the bottom right. Click **locate**.

**APK Output Path:**
`android/app/build/outputs/apk/debug/app-debug.apk`

---

### Important Notes:
- **Testing**: This is a debug version for testing. Enable "Install unknown apps" on your Android device to install it.
- **Stable Setup**: The project is already pre-configured with Capacitor for Android.

