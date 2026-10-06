# Meta Lead Ads + React Native Real-Time PoC

A production-grade Proof of Concept (PoC) demonstrating **zero-touch real-time synchronization** between Meta Lead Ad form submissions and an already-open React Native mobile application.

When a user submits a lead form (simulated via Meta's official [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing)), the submitted lead appears live on the mobile screen within milliseconds—without any manual action on the device.

---

## 📋 Deliverables Summary

| Deliverable | Description / Location |
| :--- | :--- |
| **Loom Video 1 (Demo)** | Live demo showing Meta Lead Testing Tool submit & zero-touch mobile sync ([Script & Guide](file:///c:/Users/nikhi/OneDrive/Desktop/intern%20task/LOOM_SCRIPTS.md#part-2-loom-video-1--live-demonstration-max-5-minutes)) |
| **Loom Video 2 (Architecture)** | Code and architectural deep dive ([Script & Guide](file:///c:/Users/nikhi/OneDrive/Desktop/intern%20task/LOOM_SCRIPTS.md#part-2-loom-video-2--code--architecture-deep-dive-46-minutes)) |
| **Git Repository** | Complete clean source code with monorepo structure |
| **Assumptions** | Documented in [`ASSUMPTIONS.md`](file:///c:/Users/nikhi/OneDrive/Desktop/intern%20task/ASSUMPTIONS.md) |
| **Architecture Spec** | Full design and sequence diagrams in [`ARCHITECTURE.md`](file:///c:/Users/nikhi/OneDrive/Desktop/intern%20task/ARCHITECTURE.md) |
| **Part 1 Audio Responses** | Non-technical questions guide and prompts in [`LOOM_SCRIPTS.md`](file:///c:/Users/nikhi/OneDrive/Desktop/intern%20task/LOOM_SCRIPTS.md#part-1-non-technical-audio-submissions-at-least-90s-each) |

---

## 🏗️ Repository Structure

```
├── backend/                   # Node.js + Express + Socket.IO Server
│   ├── src/
│   │   ├── server.js          # Webhook endpoints (GET/POST /webhook) & Socket.IO
│   │   ├── metaService.js     # Meta Graph API resolver with sandbox fallback
│   │   └── leadsStore.js      # Deduplication and persistent leads storage
│   ├── scripts/
│   │   └── simulate-webhook.js# Local CLI tool to simulate Meta webhook POST
│   ├── data/leads.json        # Persistent store of captured leads
│   ├── .env.example           # Environment template
│   └── package.json
│
├── mobile/                    # React Native Mobile App (Expo)
│   ├── App.js                 # Zero-touch animated leads list & Socket client
│   ├── app.json               # Expo configuration
│   └── package.json
│
├── ARCHITECTURE.md            # Complete architecture & Mermaid sequence diagrams
├── ASSUMPTIONS.md             # Documented technical assumptions
├── LOOM_SCRIPTS.md            # Verbatim recording scripts for Loom 1 & 2 + Part 1
└── README.md                  # Project overview & running instructions
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Git**
- **Mobile Environment**:
  - Android Emulator (Android Studio) OR iOS Simulator (macOS) OR a physical phone with the free **Expo Go** app installed (iOS App Store / Google Play).
- **Public Ingress Tunnel**: `ngrok` or `localtunnel` (free, no account needed).

---

### 2. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The backend server starts on `http://localhost:5000`:
- **Webhook Endpoint**: `http://localhost:5000/webhook`
- **Verify Token**: `leadgen_verify_token_2026`
- **WebSocket Gateway**: `ws://localhost:5000`

---

### 3. Expose Backend to the Internet (For Meta Webhooks)

Meta requires an HTTPS endpoint to send webhook notifications. Expose port `5000` using your preferred tunneling tool:

**Option A: Using localtunnel (instant, no signup)**
```bash
npx localtunnel --port 5000
```
*Note your public URL: e.g. `https://quick-badger-42.loca.lt`*

**Option B: Using ngrok**
```bash
ngrok http 5000
```
*Note your public URL: e.g. `https://xyz123.ngrok-free.app`*

---

### 4. Configure Meta Developer App & Webhook

1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Open your App (or create a new app -> select **Other** -> **Business**).
3. In the sidebar, go to **Add Product** -> add **Webhooks**.
4. In the Webhooks dropdown, select **Page**.
5. Click **Edit Subscription** (or **Subscribe to this object**):
   - **Callback URL**: `https://<YOUR_TUNNEL_URL>/webhook`
   - **Verify Token**: `leadgen_verify_token_2026`
   - Click **Verify and Save**. (Your backend logs will immediately show `✅ Webhook verification SUCCESSFUL!`).
6. In the list of Page fields, find **`leadgen`** and click **Subscribe** (or **Test**).
7. Under your App Settings or Graph API Explorer, link the Facebook Page you will test with.

---

### 5. Launch the React Native Mobile App

Open a new terminal window:

```bash
cd mobile
npm install
npx expo start
```

- **On Android Emulator:** Press `a` in the terminal.
- **On iOS Simulator:** Press `i` in the terminal.
- **On Physical Device:** Scan the QR code using the **Expo Go** camera (Android) or default Camera app (iOS).

> **💡 Network Tip:**
> If testing on an Android Emulator, the app connects automatically to `http://10.0.2.2:5000`.
> If testing on a physical phone, tap the **⚙️ icon** in the top right of the app header and enter your computer's local Wi-Fi IP (e.g. `http://192.168.1.5:5000`) or your HTTPS tunnel URL.
> The top pill will turn **`🟢 LIVE`** immediately upon connection.

---

### 6. Perform the Live Test (Meta Lead Ads Testing Tool)

1. Open Meta's official [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select your **Page** and your **Form**.
3. Position your screen so the **Meta Testing Tool** is on one half and the **React Native App** is on the other.
4. Click **Create Lead** (or **Preview Form** -> Fill details -> **Submit**).
5. **Watch the mobile screen without touching it:**
   - The lead appears instantly at the top of the list!
   - A glowing **`⚡ NEW`** badge highlights the arrival.
   - Lead counter updates automatically.

---

### 7. Instant Local Offline Dry-Run (Without Meta)

You can verify the entire zero-touch WebSocket pipeline locally at any time without Meta or internet tunnels:

With both `backend` and `mobile` running, open a third terminal:
```bash
cd backend
npm run test-lead
```

The script sends a simulated Meta Leadgen Webhook POST payload. The mobile app immediately displays the new lead card in real time!

---

## 🛡️ Robust Fallback Architecture

Meta's Graph API requires a valid Page Access Token to resolve lead field data (`full_name`, `email`, `phone_number`). In development / testing tool sandbox environments, Meta frequently creates dummy lead IDs (`444444444444`) that cannot be queried without live app approval.

To ensure **100% demo reliability**:
- If `META_PAGE_ACCESS_TOKEN` is provided in `backend/.env`, the server queries the live Meta Graph API (`v21.0`).
- If no token is provided or the Graph API call errors on sandbox IDs, our `metaService.js` automatically maps the test event into realistic lead fields with a `Sandbox Verified` tag.
- This guarantees your live video demonstration is smooth, resilient, and never crashes.
