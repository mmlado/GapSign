# Retro Log

Post-task raw captures per `~/fieldcraft/protocols/wins-and-fails.md`.
Reshuffled weekly into `PROJECT_KNOWLEDGE.md` and `~/android-skills/`.

---

## 2026-05-06 — GapSign setup + system UI dark theme fix (PR #154)

### Wins

- [process] Incremental visual debugging via ADB screencap → Read tool: each change verified on real device before moving on. No guessing.
- [process] Root cause investigation before fixing: white line was two separate issues (native navigationBarDividerColor + JS SafeAreaProvider background). Fixed both cleanly.
- [project] Gradle 8.13 is the working floor for RN 0.83 — 9.x breaks IBM_SEMERU, <8.13 below AGP minimum. Documented in android-skills.
- [project] WiFi ADB reliable for screencaps/port-forward; unreliable for large APK installs. USB + adb install is the correct path.

### Fails

- [process] Triggered dev menu Reload while ReactInstance was null (error state) → white screen loop. Root cause: didn't know New Architecture has strict initialization order — force-stop + cold launch is the only safe recovery. Took extra round to diagnose.
- [process] Fixed navigationBarDividerColor in native config but didn't verify before moving on — went an extra round when white strip persisted from a separate JS-layer cause. Root cause: assumed one fix covered both symptoms without checking the screenshot first.
- [process] Used `npm run android` (Gradle install over WiFi) for first install — timed out at 17min. Root cause: didn't know Gradle's APK install goes over ADB. Should assemble + `adb install` separately.
