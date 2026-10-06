# Loom Video Scripts & Part 1 Audio Guide

This guide provides verbatim scripts, screen layouts, and talking points for all video and audio deliverables required by the assignment.

---

# Part 1: Non-Technical Audio Submissions (At least 90s each)

> **Important Instructions from PDF:**
> - Record ex-tempore (speak naturally like talking to a colleague, do not sound scripted or studio-polished).
> - Share audio files to: `krishna@unque.me`, `n.sarang@unque.me`, `nijam@unque.me`
> - Language allowed: English, Hindi, or Telugu.

---

### Question 1: *"What’s a 'nerdy' or tedious part of your life that most people hate, but you actually find deeply satisfying?"*
- **Target Duration:** 95 – 110 seconds
- **Idea 1 (Developer Workflow):** Deep Git reflog surgery, resolving intricate merge conflicts, or meticulously organizing dotfiles and bash aliases.
- **Idea 2 (System Organization):** Creating detailed personal budgeting spreadsheets or categorizing every digital folder and bookmark into strict taxonomy.
- **Outline & Flow:**
  1. **The Hook (0s – 20s):** Start with honesty. *"Most people dread opening terminal logs or untangling broken merge conflicts where 50 files have conflict markers. For me, that’s actually one of the most therapeutic moments in engineering..."*
  2. **The Process & Detail (20s – 65s):** Describe what you actually do. Explain the tactile feeling of understanding every line of code, seeing two divergent histories reconcile cleanly, or tracing a git commit back 8 months to find the exact root cause of a regression. Talk about the focus required—no distractions, just pure logic and state transitions.
  3. **Why it’s Satisfying (65s – 95s+):** Contrast chaos with order. Most people hate it because it requires patience, but bringing order out of absolute entropy gives a sense of craft that superficial coding rarely provides.

---

### Question 2: *"What is a common opinion in the world around you that you strongly disagree with?"*
- **Target Duration:** 95 – 115 seconds
- **Idea 1:** *"The belief that more code and complex abstractions make a better engineer."*
- **Idea 2:** *"The culture of immediate responsiveness—that being busy and replying in 2 minutes equals high productivity."*
- **Idea 3:** *"The hype that AI means programmers don't need to understand low-level fundamentals anymore."*
- **Outline & Flow:**
  1. **The Opinion (0s – 25s):** Clearly state what people around you commonly say and why you hear it often. E.g.: *"Around me, especially in tech circles, there's a strong sentiment right now that understanding the deep fundamentals—like operating systems, networking, raw protocols, or state lifecycles—is becoming obsolete because high-level tools and AI can generate anything in seconds."*
  2. **Why You Disagree (25s – 70s):** Give a concrete counter-argument. Tools only automate the synthesis; when production breaks, when latency spikes by 400ms, or when a distributed system experiences split-brain, prompt engineering doesn't fix it. Only deep mental models of how memory, sockets, and networks work allow you to diagnose and solve novel problems.
  3. **The Core Takeaway (70s – 100s+):** Share how this contrarian perspective shapes your daily decisions and learning habits.

---

### Question 3: *"When was the last time you were working on something and realized hours had passed without you noticing?"*
- **Target Duration:** 95 – 115 seconds
- **Idea:** A deep debugging session where you chased a ghost bug, or building a prototype from 0 to 1 where you completely lost sense of time.
- **Outline & Flow:**
  1. **Setting the Scene (0s – 25s):** *"It happened just recently when I was building an end-to-end real-time communication pipeline. I sat down at 8 PM intending to do a quick 30-minute test..."*
  2. **The Rabbit Hole / Flow State (25s – 70s):** Describe how one problem led to another interesting puzzle. You noticed a subtle 200ms latency jitter between WebSocket frame delivery and client render. You opened network inspectors, inspected frame timings, refactored the listener hooks, and iterated on visual micro-interactions.
  3. **The Snap Back to Reality (70s – 100s+):** *"Next thing I knew, I looked at the clock and it was 1:30 AM. My tea had gone completely cold hours ago, but the pipeline was buttery smooth, handling live payloads instantly. That state of hyper-focus—where the outside world fades and it's just you and the problem space—is the reason I love building software."*

---

# Part 2: Loom Video 1 — Live Demonstration (Max 5 minutes)

### Screen Setup & Layout
- **Left 50% of Screen:** Web Browser opened to **Meta Lead Ads Testing Tool** (`developers.facebook.com/tools/lead-ads-testing`) with the Page & Lead Form selected.
- **Right 50% of Screen:** React Native App running on **Android/iOS Simulator or physical phone mirrored** (via scrcpy / QuickTime), with the Leads List screen **already open and live**.
- **Bottom Corner:** Webcam visible showing you speaking and clearly **not touching the phone/device**.

### Verbatim Recording Script (Total time: ~3.5 minutes)

#### [0:00 – 0:40] Introduction & Setup
> *"Hi everyone, this is [Your Name]. This is my demonstration for the Meta Lead Ads and React Native real-time integration Proof of Concept.*
>
> *As you can see on the right side of my screen, I have our React Native mobile application running on the simulator. The leads screen is already open, showing our real-time connection status badge: 'Live Connected'.*
>
> *On the left side of my screen, I have Meta's official Lead Ads Testing Tool open, configured with our test Facebook Page and instant lead ad form.*
>
> *The goal here is zero-touch synchronization: when I submit a lead form through Meta's testing tool, it must immediately appear on the phone screen without any manual refresh or touch on the device."*

#### [0:40 – 1:45] The First Live Trigger (Zero-Touch)
> *"Now, let's trigger our first submission. In Meta's Lead Ads Testing Tool, I'll click 'Preview Form'.*
>
> *I'll fill in some test information: full name 'Alex Rivera', email 'alex.rivera@example.com', and phone '+1 555-0199'.*
>
> *Watch the mobile screen on the right carefully. My hands are completely off the mobile simulator.*
>
> *I click 'Submit' on the Meta tool now..."*
>
> **[Action: Lead pops up at the top of the mobile screen within ~200ms with a glowing 'NEW' badge!]**
>
> *"And there it is! Within milliseconds, the lead appeared at the very top of our list. You can see the full name, email, phone number, timestamp, and Meta Leadgen ID, all rendered automatically with zero manual interaction."*

#### [1:45 – 2:45] Verifying Repeatability & Backend Logs
> *"To prove that this isn't a one-off and is driven by an actual asynchronous event loop, let's fire a second test lead.*
>
> *Let's delete the previous lead in Meta's testing tool and hit 'Create Lead' again.*
>
> *Watch the mobile screen once more..."*
>
> **[Action: Click Create Lead in Meta Testing Tool. Second lead animates to the top instantly!]**
>
> *"Instantly, the second lead arrives. The list count updates from 1 to 2, and the new lead is highlighted.*
>
> *Over in my terminal backend logs, you can see the entire lifecycle: Meta sent an HTTPS POST request to `/webhook`, our server returned a 200 OK acknowledgment, resolved the lead details, and broadcasted a `new_lead` event over WebSocket directly to the React Native app."*

#### [2:45 – 3:30] Wrap-up
> *"This confirms all requirements of Part 2: Meta Lead Testing Tool integration, zero-touch real-time delivery, and clean React Native UI state updates. In the second video, I'll walk you through the codebase and architecture. Thank you!"*

---

# Part 2: Loom Video 2 — Code & Architecture Deep Dive (~4–6 minutes)

### Screen Setup & Layout
- VS Code / IDE displaying the project folder (`backend/` and `mobile/`).
- Architecture diagram or `ARCHITECTURE.md` open.

### Walkthrough Outline & Script

#### 1. Architectural Philosophy (1 min)
- Explain the decoupled micro-architecture: Meta Cloud -> Webhook Ingress -> Node.js Express -> Meta Graph API -> Socket.IO -> React Native App.
- Highlight why **WebSockets** were chosen over HTTP polling: polling wastes battery and introduces latency; WebSockets provide instant, sub-50ms reactive delivery.

#### 2. Backend Code Walkthrough (2 mins)
- Open `backend/src/server.js`:
  - Show `GET /webhook`: explain Meta's `hub.mode`, `hub.verify_token`, and `hub.challenge` handshake.
  - Show `POST /webhook`: explain why we immediately return `200 EVENT_RECEIVED` to prevent Meta from timing out after 20 seconds.
- Open `backend/src/metaService.js`:
  - Explain why Meta webhooks do not contain raw PII (for GDPR and security).
  - Show the Meta Graph API request (`GET /{leadgen_id}`) to fetch `field_data`.
  - Point out the robust fallback handler that protects against test token expirations.
- Open `backend/src/leadsStore.js`:
  - Explain deduplication using `leadgen_id` to handle Meta's retry policy without duplicate UI entries.

#### 3. React Native Mobile App Walkthrough (1.5 mins)
- Open `mobile/App.js`:
  - Show the `useEffect` hook initializing the `socket.io-client` connection.
  - Show the event listener: `socket.on('new_lead', (newLead) => setLeads(prev => [newLead, ...prev]))`.
  - Explain how React's state management seamlessly re-renders the list and animates the new card into view without touching the screen.
  - Show the server URL switcher for testing on physical devices vs simulators.

#### 4. Summary & Assumptions (30s)
- Briefly mention the assumptions recorded in `ASSUMPTIONS.md`.
- Conclude with confidence.
