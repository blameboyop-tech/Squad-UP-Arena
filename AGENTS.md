# Project Governance - Squad UP Arena

## 1. Manual Publish Rule
- **STRICT REQUIREMENT**: Do NOT increment the `APP_VERSION_CODE` in code or update the `system/config` collection in Firestore unless the user explicitly says: **"Publish this update"**.
- All feature additions should be kept as "Draft" states (i.e., not triggering update prompts) until a manual publish command is given.

## 2. UI Constraints
- Design for **Native Mobile (Android)** first.
- Use `100dvh` for root height to avoid browser chrome artifacts.
- Navigation should feel like a native app (Bottom bar is fixed).
