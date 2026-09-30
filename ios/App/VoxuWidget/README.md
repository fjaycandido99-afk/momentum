# Voxu home-screen widget

Shows the era's day ("Day 9 of 30"), today's promise in the user's own words,
today's mission and the promise streak — on the home screen (small, medium) and
the lock screen (rectangular, circular). With no era it shows the daily quote.

## How it works

- `lib/widget-snapshot.ts` builds one dated JSON snapshot from the era.
- `hooks/useEra.ts` sends it on every era load/change via
  `WidgetBridge.write` (`ios/App/App/WidgetBridgePlugin.swift`), which stores
  it in the App Group `group.com.voxu.app` and reloads the widget.
- `VoxuWidget.swift` reads it, moves the day forward at midnight on its own,
  and never shows yesterday's promise as today's.

## What's already done (no Mac needed)

- The `VoxuWidget` app-extension target is in `App.xcodeproj` (added by hand;
  the app embeds it and depends on it). Bundle ID `com.voxu.app.VoxuWidget`,
  iOS 16+, manual signing with a profile named
  **"Voxu Widget App Store Distribution"**.
- `App.entitlements` and `VoxuWidget.entitlements` both claim
  `group.com.voxu.app`.
- `codemagic.yaml` installs the widget profile, checks the app profile carries
  the App Group, prints both targets' versions, and maps both bundle IDs in
  ExportOptions.

## One-time Apple setup (developer.apple.com — any browser, ~10 min)

1. **Identifiers → + → App Groups** → description "Voxu", identifier
   `group.com.voxu.app`.
2. **Identifiers → com.voxu.app → App Groups → Configure** → tick
   `group.com.voxu.app` → Save. (Apple will say existing profiles become
   invalid — expected.)
3. **Identifiers → + → App IDs → App** → description "Voxu Widget", bundle ID
   (explicit) `com.voxu.app.VoxuWidget` → enable **App Groups** → Continue →
   Register. Then open it → App Groups → Configure → tick `group.com.voxu.app`.
4. **Profiles → "Voxu App Store Distribution" → Edit → Save** (regenerates it
   with the App Group) → **Download**. Replace
   `ios/App/Voxu_App_Store_Distribution.mobileprovision` with it.
5. **Profiles → + → App Store Connect (Distribution)** → App ID
   `com.voxu.app.VoxuWidget` → the same distribution certificate the app uses →
   name it exactly **`Voxu Widget App Store Distribution`** → Download. Save as
   `ios/App/Voxu_Widget_App_Store_Distribution.mobileprovision`.
6. Commit both profiles on the `widget-native` branch, merge to master. Codemagic
   builds it and uploads to TestFlight.

## Checking it on a phone

Install the TestFlight build → open Voxu once (that writes the first snapshot)
→ long-press the home screen → **+** → search "Voxu". The lock-screen widgets
are under Customize on the lock screen.

If the widget shows only the quote while an era is running, the snapshot never
arrived: the App Group is missing from one of the two profiles (step 2/4 or 3/5).
