require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const leadsStore = require('./leadsStore');
const metaService = require('./metaService');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for local dev / mobile emulator / physical device
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Request logger for visibility
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// Meta Webhooks Endpoints
// ==========================================

/**
 * 1. Webhook Verification (GET /webhook)
 * When you configure your webhook callback URL in the Meta App Dashboard,
 * Meta sends a GET request to verify that you own the server.
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_VERIFY_TOKEN || 'leadgen_verify_token_2026';

  console.log('[Webhook Verification] Incoming verification request:');
  console.log(`  - mode: ${mode}`);
  console.log(`  - token: ${token}`);
  console.log(`  - expected: ${expectedToken}`);

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ [Webhook Verification] Verification SUCCESSFUL! Responding with challenge.');
    return res.status(200).send(challenge);
  } else {
    console.warn('❌ [Webhook Verification] Verification FAILED! Tokens do not match.');
    return res.status(403).send('Forbidden: Token mismatch');
  }
});

/**
 * 2. Webhook Event Notification (POST /webhook)
 * Triggered whenever a user submits a lead form or when a test submission
 * is triggered via Meta's Lead Ads Testing Tool.
 */
app.post('/webhook', async (req, res) => {
  const body = req.body;

  console.log('\n📥 [Webhook Event] Received POST /webhook from Meta:');
  console.log(JSON.stringify(body, null, 2));

  // Meta requires an HTTP 200 response quickly (within 20s), so acknowledge immediately
  res.status(200).send('EVENT_RECEIVED');

  // Verify this is a page subscription
  if (body.object === 'page') {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field === 'leadgen') {
          const value = change.value || {};
          const leadgenId = value.leadgen_id;
          const formId = value.form_id;
          const pageId = value.page_id;
          const createdTime = value.created_time;

          console.log(`\n🎯 [New Lead Event Detected]`);
          console.log(`   - leadgen_id: ${leadgenId}`);
          console.log(`   - form_id:    ${formId}`);
          console.log(`   - page_id:    ${pageId}`);

          try {
            // Fetch lead fields (via Graph API or robust test fallback)
            const leadDetails = await metaService.fetchLeadDetails({
              leadgenId,
              formId,
              pageId,
              createdTime,
            });

            // Store in leads store
            const { lead, isNew } = leadsStore.addLead(leadDetails);

            console.log(`🚀 [Broadcasting] Emitting 'new_lead' via WebSocket to connected clients:`);
            console.log(`   - Name:  ${lead.fullName}`);
            console.log(`   - Email: ${lead.email}`);
            console.log(`   - Phone: ${lead.phoneNumber}`);
            console.log(`   - Connected Sockets: ${io.engine.clientsCount}\n`);

            // Emit to all connected React Native clients in real time
            io.emit('new_lead', lead);
          } catch (error) {
            console.error('❌ [Lead Processing Error]:', error.message);
          }
        }
      }
    }
  } else {
    console.log(`[Webhook Event] Ignored event for object type: ${body.object}`);
  }
});

// ==========================================
// REST API for React Native App & Testing
// ==========================================

/**
 * GET /api/leads - Returns all leads for initial screen load
 */
app.get('/api/leads', (req, res) => {
  const leads = leadsStore.getAllLeads();
  res.json({
    success: true,
    count: leads.length,
    leads,
  });
});

/**
 * DELETE /api/leads - Clears leads (useful before starting video recording)
 */
app.delete('/api/leads', (req, res) => {
  leadsStore.clearLeads();
  io.emit('leads_cleared');
  console.log('🧹 [Leads Store] Cleared all leads.');
  res.json({ success: true, message: 'All leads cleared.' });
});

/**
 * POST /api/simulate-lead - Simulates a Meta lead payload locally
 */
app.post('/api/simulate-lead', async (req, res) => {
  const customData = req.body || {};
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  const mockLead = {
    leadgen_id: `SIM_${Date.now()}`,
    form_id: customData.form_id || 'FORM_TEST_LOCAL',
    page_id: customData.page_id || 'PAGE_TEST_LOCAL',
    ad_id: null,
    created_time: new Date().toISOString(),
    received_at: new Date().toISOString(),
    fullName: customData.fullName || `Simulated Lead ${randomSuffix}`,
    email: customData.email || `lead${randomSuffix}@example.com`,
    phoneNumber: customData.phoneNumber || `+1 (555) 987-${randomSuffix}`,
    customFields: customData.customFields || {
      note: 'Simulated from local test trigger',
      role: 'Software Engineer',
    },
    source: 'Local Simulator (Test Trigger)',
    isSimulated: true,
  };

  const { lead } = leadsStore.addLead(mockLead);
  io.emit('new_lead', lead);

  console.log(`⚡ [Simulated Lead Broadcasted]: ${lead.fullName} (${lead.email})`);
  res.json({ success: true, lead });
});

/**
 * GET /health - Server health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount,
    totalLeads: leadsStore.getAllLeads().length,
  });
});

// ==========================================
// WebSocket Connection Lifecycle
// ==========================================
io.on('connection', (socket) => {
  console.log(`🔌 [WebSocket] Client connected: ${socket.id} (Total: ${io.engine.clientsCount})`);

  socket.emit('connected_ack', {
    message: 'Connected to Meta LeadAds Real-Time Server',
    serverTime: new Date().toISOString(),
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ [WebSocket] Client disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🌟 Meta LeadAds Webhook Server is LIVE on port ${PORT}`);
  console.log(`📡 Local Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔑 Verification Token: ${process.env.META_VERIFY_TOKEN || 'leadgen_verify_token_2026'}`);
  console.log(`🔌 WebSocket Server:  ws://localhost:${PORT}`);
  console.log(`📊 Health Endpoint:   http://localhost:${PORT}/health`);
  console.log('====================================================\n');
});
