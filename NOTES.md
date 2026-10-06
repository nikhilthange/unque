# Demo Notes & Interview Talking Points

Personal reference notes for the assignment recordings.

---

## Part 1: Audio Notes (Non-Technical, ≥90s each)

### 1. Nerdy / Tedious part of life you find satisfying
- **Topic idea:** Deep Git history archaeology / resolving gnarly merge conflicts, or cleaning up dotfiles and terminal configurations.
- **Why most hate it:** People find git conflicts scary or tedious; they worry about losing work.
- **Why I find it satisfying:** Bringing clarity to complex divergence. Stepping through commits one by one, understanding intent, and making two parallel branches reconcile cleanly. It requires deep focus and systematic thinking.

### 2. Common opinion you strongly disagree with
- **Topic idea:** "Understanding low-level internals (networking, memory, raw protocols) doesn't matter anymore because high-level tools abstract it away."
- **Why I disagree:** High-level abstractions work great until there's an outage, memory leak, or latency spike. When real-time pipelines drop frames or sockets disconnect unpredictably, you need to understand how TCP handshakes, event loops, and memory buffers work. Fundamentals never go out of style.

### 3. Last time hours passed without noticing
- **Topic idea:** Debugging an asynchronous race condition / building a real-time event pipeline.
- **Key points:** Started working on getting websocket state sync working smoothly without lag. Got lost in profiling latency, optimizing re-renders, and making the state machine seamless. Looked at the clock and realized 4 hours had passed.

---

## Part 2: Loom Video 1 (Live Demo, <5 min)

### Flow:
1. Show screen layout:
   - Left: Meta Lead Ads Testing Tool (`developers.facebook.com/tools/lead-ads-testing`) with test page and form selected.
   - Right: React Native app running on simulator / phone with the leads list open (`LIVE` status indicator).
2. Hands off the phone / simulator.
3. Click "Create Lead" (or preview and submit form) in Meta's tool.
4. Show the lead popping up immediately at the top with the `NEW` tag without any refresh or touches.
5. Trigger a second test lead to demonstrate repeatability and counter incrementing.
6. Brief wrap-up.

---

## Part 2: Loom Video 2 (Code & Architecture)

### Key Points to Cover:
1. **Architecture overview:**
   - Meta Lead Testing Tool -> HTTPS tunnel -> Express server (`/webhook`) -> Meta Graph API -> Socket.IO -> React Native client.
2. **Backend highlights:**
   - `GET /webhook`: Verification handshake with `hub.challenge` and `hub.verify_token`.
   - `POST /webhook`: Fast 200 response to satisfy Meta's 20s timeout, followed by async lead resolution.
   - Graph API vs Fallback: Explaining why Meta doesn't send PII in the webhook body, and how sandbox test IDs are handled.
   - Deduplication: In-memory store using `leadgen_id` as key to prevent duplicate items during network retries.
3. **Mobile highlights:**
   - React Native with Socket.IO client.
   - `useEffect` socket connection listener.
   - Prepending new items to state array so the latest lead appears at the top.
   - Dynamic URL config switcher for testing on physical devices vs emulator.
4. **Why WebSockets:** Sub-50ms latency, zero manual polling, matches the requirement for an already-open screen.
