# Meta Lead Ads -> React Native Real-Time PoC

Proof of concept demonstrating real-time synchronization between Meta Lead Ad form submissions and an active React Native app screen.

When a user submits a test lead form using Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing), the submitted lead appears on the mobile screen in real time without any user interaction (no pull-to-refresh or taps required).

---

## Deliverables & Documentation

- **Live Demonstration:** [Video Link Placeholder - see NOTES.md](./NOTES.md)
- **Code & Architecture Walkthrough:** [Video Link Placeholder - see NOTES.md](./NOTES.md)
- **Architecture Details & Sequence Diagrams:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Assumptions:** [ASSUMPTIONS.md](./ASSUMPTIONS.md)
- **Interview & Demo Notes:** [NOTES.md](./NOTES.md)

---

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO, Axios
- **Mobile:** React Native (Expo), `socket.io-client`
- **Testing & Tooling:** Meta Lead Ads Testing Tool, localtunnel / ngrok

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app, Meta webhook endpoints, Socket.IO
│   │   ├── metaService.js     # Meta Graph API client & test fallback parser
│   │   └── leadsStore.js      # Lead cache with disk persistence & deduplication
│   ├── scripts/
│   │   └── simulate-webhook.js# Local test script to simulate Meta POST requests
│   ├── package.json
│   └── .env.example
│
├── mobile/
│   ├── App.js                 # React Native dashboard with real-time socket updates
│   ├── app.json
│   └── package.json
│
├── ARCHITECTURE.md            # System diagrams and technical flow
├── ASSUMPTIONS.md             # Key assumptions made during implementation
├── NOTES.md                   # Video demo notes and talking points
└── README.md
```

---

## Getting Started

### 1. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The server will start on port `5000`:
- Webhook URL: `http://localhost:5000/webhook`
- Verify Token: `leadgen_verify_token_2026`

### 2. Expose the Webhook Endpoint (Tunnel)

Meta requires a public HTTPS URL to deliver webhook notifications. You can use any tunnel:

```bash
# Using localtunnel
npx localtunnel --port 5000

# Or using ngrok
ngrok http 5000
```

Copy the generated HTTPS URL (e.g. `https://your-tunnel-url.loca.lt`).

### 3. Configure Meta Webhooks

1. Go to the [Meta Developer Dashboard](https://developers.facebook.com/) and open your App.
2. Under **Webhooks**, select **Page**.
3. Set your callback:
   - **Callback URL:** `https://your-tunnel-url.loca.lt/webhook`
   - **Verify Token:** `leadgen_verify_token_2026`
4. Click **Verify and Save**.
5. Subscribe to the **`leadgen`** field.

### 4. Run the Mobile App

In a separate terminal:

```bash
cd mobile
npm install
npx expo start
```

- Run on Android emulator by pressing `a`, or iOS simulator by pressing `i`.
- To run on a physical phone, scan the QR code with the **Expo Go** app.
- If running on a physical phone, tap **Config** in the app header and set your computer's local network IP (e.g. `http://192.168.1.X:5000`) or tunnel URL.

### 5. Trigger a Lead Submission

1. Open Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select your test Page and Form.
3. Click **Create Lead** (or **Preview Form** -> Submit).
4. Watch the mobile app screen: the new lead appears at the top automatically with a `NEW` badge.

### 6. Local Simulation (Without Meta)

To test the socket flow locally without configuring Meta:

```bash
cd backend
npm run test-lead
```

This sends a mock webhook payload directly to the server, which immediately triggers the mobile UI update.
