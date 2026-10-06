# Project Assumptions

This document outlines all technical and operational assumptions made while designing and implementing the **Meta Lead Ads + React Native Real-Time PoC**.

---

### 1. Meta Sandbox & Lead Ads Testing Tool
- **No Real Ad Spend Needed:** Per the assignment guidelines, Meta's official [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) is used to simulate lead submissions. No real ad campaigns or credit cards are required.
- **Webhook Subscription:** We assume the Meta App has subscribed to the `leadgen` field under the `Page` webhook object, and the Facebook Page used for testing is linked to the app in the Meta App Dashboard.
- **Dummy Lead IDs in Testing:** In some Meta Developer test setups, the testing tool may generate synthetic test IDs (e.g., `444444444444`). While a live Meta Graph API call (`GET /{leadgen_id}`) requires an active `Page Access Token` with `leads_retrieval` permission, our backend assumes a resilient architecture: it attempts to fetch from Graph API if a token is supplied, and gracefully falls back to structured test data if the sandbox test ID is not queryable.

---

### 2. Webhook Architecture & Data Privacy (PII)
- **Two-Step Lead Ingestion:** Meta does not send user PII (Full Name, Email, Phone Number) directly in the webhook POST body for security and GDPR compliance. Instead, the webhook delivers a lightweight notification containing `{ "leadgen_id", "form_id", "page_id", "created_time" }`. The backend is assumed to handle the secondary step of fetching the lead's form responses via Graph API.
- **Immediate Webhook Acknowledgment:** Meta enforces a 20-second timeout on webhook responses. Our server assumes an asynchronous processing model: it responds with `HTTP 200 OK` immediately upon payload validation, and handles lead fetching and WebSocket broadcasting asynchronously.

---

### 3. Real-Time Transport Protocol
- **WebSockets over Polling:** To satisfy the strict requirement that the lead appears *"without any manual action on the device"*, we chose **WebSockets (Socket.IO)** over HTTP polling or manual pull-to-refresh. This provides sub-second latency, bidirectional heartbeat checks, and automatic reconnection if the network fluctuates.
- **Push Notification Alternative:** While Firebase Cloud Messaging (FCM) / Apple Push Notifications (APNs) are standard for background notifications, the assignment specifically targets an *"already-open React Native app screen"*. WebSockets are ideal for foreground real-time state synchronization without external push service overhead.

---

### 4. Network & Device Connectivity
- **Public Ingress for Meta:** Meta's servers require a publicly accessible HTTPS URL for webhook verification and delivery. We assume an HTTPS tunneling tool such as `ngrok`, `localtunnel`, or `Cloudflare Tunnel` is used to expose the local backend during development and demonstration.
- **Device-to-Backend Resolution:** Depending on whether the app is tested on:
  - **Physical Device:** Connects via LAN IP (e.g., `http://192.168.1.X:5000`) or the tunnel URL.
  - **Android Emulator:** Connects via `http://10.0.2.2:5000`.
  - **iOS Simulator:** Connects via `http://localhost:5000`.
  To ensure seamless testing in any environment, an in-app server URL switcher is built into the mobile app header.

---

### 5. State Management & Deduplication
- **Deduplication:** Meta webhooks may retry if network conditions jitter. The backend implements deduplication using `leadgen_id` to ensure duplicate entries are never broadcast to the device.
- **Initial Load & History:** When the mobile app mounts, it fetches previous leads via `GET /api/leads` and then stays subscribed to the `new_lead` WebSocket event for incoming live additions.
- **Zero-Touch Animation:** New leads are prepended to the top of the list with a high-visibility badge ("NEW") and visual highlighting so viewers immediately notice the update without touching the screen.
