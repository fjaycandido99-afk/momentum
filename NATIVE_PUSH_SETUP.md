# Native Push Notification Setup

This guide covers everything needed to configure APNs (iOS) and FCM (Android) push delivery for the Voxu app.

---

## iOS Setup (APNs)

### 1. Apple Developer Account

You need an active [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year).

### 2. Create an APNs Auth Key

1. Go to [Apple Developer Portal > Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** to create a new key
3. Name it (e.g. "Voxu Push Key")
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** then **Register**
6. **Download the `.p8` file** (you can only download it once)
7. Note the **Key ID** (10-character string shown on the key page)

### 3. Get your Team ID

1. Go to [Apple Developer > Membership](https://developer.apple.com/account/#/membership/)
2. Your **Team ID** is the 10-character alphanumeric string

### 4. Enable Push Notifications in Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the **App** target > **Signing & Capabilities**
3. Click **+ Capability** > **Push Notifications**
4. Ensure your Bundle Identifier matches `APNS_BUNDLE_ID` (default: `com.voxu.app`)

### 5. Set Environment Variables

```env
APNS_KEY_ID=ABC1234567          # 10-char Key ID from step 2
APNS_TEAM_ID=DEF1234567         # 10-char Team ID from step 3
APNS_AUTH_KEY=<base64>          # Base64-encoded .p8 file contents (see below)
APNS_BUNDLE_ID=com.voxu.app    # Must match Xcode bundle identifier
APNS_PRODUCTION=false           # Set to "true" for App Store / TestFlight builds
```

**Encoding the `.p8` file to base64:**

```bash
# macOS / Linux
base64 -i AuthKey_ABC1234567.p8 | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_ABC1234567.p8"))
```

Copy the output and set it as `APNS_AUTH_KEY`.

### 6. Sandbox vs Production

- **Sandbox** (`APNS_PRODUCTION=false`): Used for development builds and Xcode debug runs
- **Production** (`APNS_PRODUCTION=true`): Used for TestFlight and App Store builds

The server picks the correct APNs endpoint based on this flag.

---

## Android Setup (FCM)

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or use an existing one)
3. Follow the setup wizard

### 2. Add the Android App

1. In your Firebase project, click **Add app** > **Android**
2. Package name: `com.voxu.app`
3. Register the app
4. Download `google-services.json`
5. Place it at `android/app/google-services.json`

The `android/app/build.gradle` already conditionally loads this file (lines 47-54).

### 3. Generate a Service Account Key

1. In Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Extract these three values from the JSON:

| JSON field | Environment variable |
|-----------|---------------------|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

### 4. Set Environment Variables

```env
FIREBASE_PROJECT_ID=voxu-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@voxu-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

**Important:** The `FIREBASE_PRIVATE_KEY` value contains literal `\n` characters. When setting in Vercel, paste the key as-is from the JSON file (with the `\n` sequences). The server handles the conversion.

---

## Vercel Environment Variables Checklist

Add these in [Vercel Dashboard](https://vercel.com/dashboard) > Your Project > Settings > Environment Variables.

### Already Configured

| Variable | Purpose |
|----------|---------|
| `VAPID_PUBLIC_KEY` | Web push encryption (public) |
| `VAPID_PRIVATE_KEY` | Web push encryption (private) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client-side web push |
| `CRON_SECRET` | Secures cron endpoint calls |

### New - iOS APNs

| Variable | Purpose | Example |
|----------|---------|---------|
| `APNS_KEY_ID` | APNs Auth Key identifier | `ABC1234567` |
| `APNS_TEAM_ID` | Apple Developer Team ID | `DEF1234567` |
| `APNS_AUTH_KEY` | Base64-encoded `.p8` key contents | `LS0tLS1CRUdJ...` |
| `APNS_BUNDLE_ID` | iOS app bundle identifier | `com.voxu.app` |
| `APNS_PRODUCTION` | Use production APNs endpoint | `false` |

### New - Android FCM

| Variable | Purpose | Example |
|----------|---------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project identifier | `voxu-12345` |
| `FIREBASE_CLIENT_EMAIL` | Service account email | `firebase-adminsdk-xxx@...` |
| `FIREBASE_PRIVATE_KEY` | Service account private key | `-----BEGIN PRIVATE KEY-----\n...` |

---

## Testing

### Test APNs (iOS)

1. Set `APNS_PRODUCTION=false` in your environment
2. Build and run the app from Xcode on a physical device (push doesn't work on Simulator)
3. Grant notification permission when prompted
4. The app registers with APNs and sends the device token to `/api/notifications/subscribe`
5. Trigger a test notification:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/notifications?type=morning \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
6. You should receive a push notification on the device

### Test FCM (Android)

1. Ensure `google-services.json` is in `android/app/`
2. Build and run the app on a physical Android device or emulator with Google Play Services
3. Grant notification permission when prompted
4. The app registers with FCM and sends the token to `/api/notifications/subscribe`
5. Trigger a test notification using the same curl command above

### Verify Cron Jobs

The cron endpoints at `/api/cron/notifications` accept a `type` query parameter:

| Type | Endpoint |
|------|----------|
| Morning reminder | `?type=morning` |
| Streak at risk | `?type=streak` |
| Weekly review | `?type=weekly_review` |
| Weekly insight | `?type=insight` |

All require the `Authorization: Bearer <CRON_SECRET>` header.

### Graceful Degradation

If APNs or FCM credentials are not configured:
- The server logs a warning and skips native delivery
- Web push continues to work normally
- No crashes or errors — the system gracefully falls back

---

## Architecture Overview

```
Client (Capacitor)                    Server (Next.js / Vercel)
-------------------                   -------------------------
PushNotifications.register()
        |
        v
  APNs/FCM token
        |
  POST /api/notifications/subscribe
        |                             Saves to PushSubscription table
        |                                      |
        |                             Cron triggers sendPushToUser()
        |                                      |
        |                             +--------+--------+
        |                             |        |        |
        |                           Web    APNs     FCM
        |                          (VAPID) (HTTP/2) (Admin SDK)
        |                             |        |        |
        v                             v        v        v
  Notification received          Push delivered to device
```

### Key Files

| File | Role |
|------|------|
| `lib/apns.ts` | APNs JWT signing + HTTP/2 delivery |
| `lib/fcm.ts` | Firebase Admin init + FCM delivery |
| `lib/push-service.ts` | Orchestrates delivery across all platforms |
| `lib/push-notifications.ts` | Client-side registration (Capacitor) |
| `lib/notifications.ts` | Local notification scheduling (Capacitor) |
| `app/api/notifications/subscribe/route.ts` | Token registration endpoint |
| `app/api/cron/notifications/route.ts` | Scheduled notification triggers |
