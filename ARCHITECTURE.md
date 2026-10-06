# System Architecture & Technical Flow

This document outlines the architecture and data flow for the real-time Meta Lead Ads integration.

---

## 1. Architecture Overview

```mermaid
flowchart TD
    subgraph Meta ["Meta Platform"]
        TEST_TOOL["Lead Ads Testing Tool"]
        WEBHOOK["Page Webhooks Engine"]
        GRAPH["Graph API v21.0"]
        TEST_TOOL -->|Simulate Form Submit| WEBHOOK
    end

    subgraph Ingress ["Public Ingress"]
        TUNNEL["HTTPS Tunnel (localtunnel / ngrok)"]
    end

    subgraph BackendServer ["Node.js Backend"]
        RECEIVER["Express Webhook Handler"]
        RESOLVER["Lead Details Service"]
        CACHE["In-Memory Store (leads.json)"]
        WS_SERVER["Socket.IO Server"]

        RECEIVER -->|200 OK + Async Process| RESOLVER
        RESOLVER -->|Parsed Lead Record| CACHE
        CACHE -->|Emit 'new_lead'| WS_SERVER
    end

    subgraph Client ["React Native Mobile App"]
        WS_CLIENT["Socket.IO Client"]
        HOOK["React State Hook"]
        FEED["Leads List View"]

        WS_SERVER -.->|WebSocket Event| WS_CLIENT
        WS_CLIENT --> HOOK
        HOOK --> FEED
    end

    WEBHOOK -->|POST /webhook| TUNNEL
    TUNNEL --> RECEIVER
    RESOLVER -->|GET /{leadgen_id}| GRAPH
```

---

## 2. Event Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Evaluator as Tester
    participant MetaTool as Meta Testing Tool
    participant MetaServer as Meta Webhook
    participant Backend as Express Backend
    participant Graph as Graph API
    participant App as React Native App

    App->>Backend: Connect WebSocket (Handshake)
    Backend-->>App: Ack connection
    App->>Backend: GET /api/leads (fetch existing)
    Backend-->>App: Return initial list

    Evaluator->>MetaTool: Click "Create Lead"
    MetaTool->>MetaServer: Trigger lead event
    MetaServer->>Backend: POST /webhook (leadgen_id, form_id, page_id)
    Backend-->>MetaServer: 200 EVENT_RECEIVED

    alt Valid Page Access Token
        Backend->>Graph: GET /v21.0/{leadgen_id}
        Graph-->>Backend: Return lead fields
    else Sandbox Fallback
        Backend->>Backend: Map fallback sandbox values
    end

    Backend->>Backend: Store and deduplicate
    Backend->>App: Emit 'new_lead' via Socket.IO
    App->>App: Prepend lead to state & render card
```

---

## 3. Component Details

### Backend (`backend/src/server.js`)
- **Webhook Handshake (`GET /webhook`):** Validates `hub.mode` and `hub.verify_token` against the configured secret. Returns `hub.challenge` on success with HTTP 200.
- **Event Ingestion (`POST /webhook`):** Listens for events on `entry[].changes[].field === 'leadgen'`. Responds with 200 immediately to avoid Meta webhook retries and processing timeouts.
- **Lead Resolver (`backend/src/metaService.js`):** Queries Meta Graph API to resolve `field_data` (name, email, phone). If in sandbox mode without an active token, it falls back to structured dummy data.
- **Storage & Deduplication (`backend/src/leadsStore.js`):** Stores leads in memory with a JSON file backup. Prevents duplicate submissions using `leadgen_id`.

### Mobile Application (`mobile/App.js`)
- Built with React Native & Expo.
- Establishes a persistent Socket.IO connection on load.
- Listens for `new_lead` socket events and prepends incoming leads to state array.
- Highlights newly received leads with a brief active badge.
- Includes a configuration modal to switch between `localhost`, `10.0.2.2` (Android emulator), and LAN IP without rebuilding.

---

## 4. Design Decisions & Trade-offs

- **WebSockets vs HTTP Polling:** WebSockets were chosen because the requirement calls for the lead to appear without touching the device. Polling would waste battery and introduce unnecessary latency.
- **WebSockets vs Mobile Push Notifications (FCM/APNs):** Push notifications are better suited for background alerts when the app is closed. Since the assignment specifies an already-open screen, WebSockets provide immediate delivery without requiring external push credentials.
- **Idempotency:** Webhook deliveries can occasionally duplicate if network retries occur. Deduplication by `leadgen_id` prevents duplicate renders.
