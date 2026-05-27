# Voxu iOS Home‑Screen Widget

Scaffolded WidgetKit extension. The **daily‑quote widget works with no web
changes** (it fetches the public `/api/widget?type=quote`). The **streak +
journey** line is an optional enhancement that reads from an App Group the app
writes to.

These Swift/plist files are ready — but a Widget Extension is a **separate
target**, which must be added in Xcode (the `.xcodeproj` can't be hand‑edited
safely). One‑time setup below; after that, Codemagic builds it automatically.

---

## 1. Add the Widget Extension target (Xcode, ~5 min)

1. Open `ios/App/App.xcworkspace` in Xcode.
2. **File → New → Target… → Widget Extension.**
   - Product Name: **VoxuWidget**
   - Uncheck "Include Configuration App Intent" (we use a static config).
   - Embed in: **App**.
3. Xcode generates a default `VoxuWidget` group with its own files. **Delete the
   auto‑generated `.swift` and `Info.plist`**, then **drag in the files from
   this folder** (`VoxuWidget.swift`, `Info.plist`, `VoxuWidget.entitlements`) —
   "Add to target: VoxuWidget".
4. Select the **VoxuWidget** target → **General**:
   - Bundle Identifier: **`com.voxu.app.VoxuWidget`**
   - Deployment target: iOS 16.0+ (17 recommended).
5. Build & run on a device → long‑press home screen → **+** → search "Voxu".
   You should see the daily‑quote widget. ✅ (Streak line stays hidden until
   step 3 of the optional section.)

## 2. Provisioning for App Store / Codemagic

The widget ships as its own bundle, so it needs its own profile.

1. Apple Developer portal → **Identifiers** → add App ID **`com.voxu.app.VoxuWidget`**.
2. Create an **App Store distribution provisioning profile** for it.
3. In **Codemagic** (`codemagic.yaml` → "Install Provisioning Profile" step), add
   the widget profile alongside the app's (the build embeds both). Codemagic's
   `xcodebuild -scheme App` already compiles + embeds the widget once the target
   exists — no scheme change needed, just the extra profile.

> If you use Codemagic **automatic** code signing, just add the
> `com.voxu.app.VoxuWidget` bundle ID to the workflow's signing config.

---

## 3. (Optional) Light up the streak + journey line — App Group

The quote works without this. To show **"Day 12 · Building Momentum"**, the app
and widget share data via an App Group.

**The web side is already done** — `@capacitor/preferences` is installed and
`lib/widget-sync.ts` writes `widget_streak` + `widget_stage` from the home screen
(`syncWidgetData` in `ImmersiveHome`). Only the native App Group wiring remains:

1. Apple Developer → **App Groups** → create **`group.com.voxu.app`**.
2. Enable the **App Groups** capability for **both** `com.voxu.app` and
   `com.voxu.app.VoxuWidget`, adding `group.com.voxu.app` to each. Regenerate the
   provisioning profiles.
3. Add the group to the **app's** entitlements (`ios/App/App/App.entitlements`):
   ```xml
   <key>com.apple.security.application-groups</key>
   <array><string>group.com.voxu.app</string></array>
   ```
   (The widget's `VoxuWidget.entitlements` already has it.)
4. Point Preferences at the group in `capacitor.config.ts`:
   ```ts
   plugins: { Preferences: { group: 'group.com.voxu.app' } }
   ```
5. `npx cap sync ios`, rebuild via Codemagic. The widget reloads streak/journey
   within a few hours (or immediately if you add a
   `WidgetCenter.shared.reloadAllTimelines()` call to a small native bridge).

### Keys the widget reads (App Group `group.com.voxu.app`)
| Key | Example | Source |
|---|---|---|
| `widget_streak` | `"12"` | gamification streak |
| `widget_stage` | `"Building Momentum"` | `getJourney().stage` (`lib/journey.ts`) |
| `widget_quote` | overrides the fetched quote (optional) | `getDailyMindsetQuote` |
| `widget_author` | optional | — |

The widget tries both `widget_streak` and `CapacitorStorage.widget_streak`, so
it's robust to Capacitor's key prefix.
