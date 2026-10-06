# Assumptions & Design Notes

Here are the key technical and operational assumptions I made while building this solution:

### 1. Lead Generation Environment
- Used Meta's official Lead Ads Testing Tool to simulate lead events. Per the task brief, no live paid campaigns were created.
- The webhook subscribes to the `leadgen` field under the `Page` webhook object.
- Meta's sandbox testing tool sometimes produces synthetic IDs (like `444444444444`) that cannot be queried through Graph API without specific page permissions. Because of this, the backend first attempts to fetch data via Graph API using a page access token, but falls back gracefully to structured sandbox lead data if the token is missing or if the test ID fails.

### 2. Webhook & Payload Resolution
- Meta webhooks only deliver metadata (`leadgen_id`, `form_id`, `page_id`, `created_time`) rather than full lead responses (name/email/phone) due to privacy regulations. In production, this requires fetching the lead details via Graph API.
- Meta enforces a strict timeout on webhook responses, so the backend sends `200 OK` immediately upon receipt and processes data retrieval + WebSocket broadcast asynchronously.

### 3. Real-Time Communication
- Used WebSockets (Socket.IO) instead of polling or push notifications (APNs/FCM). Since the requirement states the app screen is "already open", WebSockets provide immediate delivery (<100ms) with zero polling overhead.
- Event deduplication is handled on the backend by caching received `leadgen_id`s, ensuring that any Meta webhook retries don't produce duplicate cards on the mobile app.

### 4. Network Setup
- A public HTTPS tunnel (like localtunnel or ngrok) is assumed to expose the local webhook port (`5000`) to Meta's servers.
- The mobile app connects to the backend over the local network / loopback (`10.0.2.2` for Android emulator, `localhost` for iOS simulator, or local Wi-Fi IP for physical device). An in-app configuration modal allows switching the backend URL on the fly.
