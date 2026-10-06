require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const leadsStore = require('./leadsStore');
const metaService = require('./metaService');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// Meta webhook verification challenge
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_VERIFY_TOKEN || 'leadgen_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[webhook] Verification successful, returning challenge');
    return res.status(200).send(challenge);
  }

  console.warn('[webhook] Verification failed - token mismatch or invalid mode');
  return res.status(403).send('Forbidden');
});

// Meta leadgen webhook listener
app.post('/webhook', async (req, res) => {
  const payload = req.body;

  // Acknowledge quickly so Meta doesn't timeout
  res.status(200).send('EVENT_RECEIVED');

  if (payload.object !== 'page' || !Array.isArray(payload.entry)) {
    return;
  }

  for (const entry of payload.entry) {
    if (!Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      if (change.field === 'leadgen' && change.value) {
        const { leadgen_id, form_id, page_id, created_time } = change.value;

        console.log(`[webhook] Incoming leadgen event: id=${leadgen_id}, form=${form_id}`);

        try {
          const lead = await metaService.fetchLeadDetails({
            leadgenId: leadgen_id,
            formId: form_id,
            pageId: page_id,
            createdTime: created_time,
          });

          const saved = leadsStore.addLead(lead);

          // Broadcast to connected mobile app instances
          io.emit('new_lead', saved.lead);
          console.log(`[ws] Broadcasted lead ${saved.lead.leadgen_id} to ${io.engine.clientsCount} client(s)`);
        } catch (err) {
          console.error('[webhook] Failed to process lead:', err.message);
        }
      }
    }
  }
});

// Get all stored leads
app.get('/api/leads', (req, res) => {
  const leads = leadsStore.getAllLeads();
  res.json({ success: true, count: leads.length, leads });
});

// Reset leads (useful for testing)
app.delete('/api/leads', (req, res) => {
  leadsStore.clearLeads();
  io.emit('leads_cleared');
  res.json({ success: true, message: 'Leads cleared' });
});

// Quick endpoint to simulate an incoming lead locally
app.post('/api/simulate-lead', async (req, res) => {
  const custom = req.body || {};
  const rand = Math.floor(100 + Math.random() * 900);

  const mock = {
    leadgen_id: `SIM_${Date.now()}`,
    form_id: custom.form_id || 'LOCAL_FORM_01',
    page_id: custom.page_id || 'LOCAL_PAGE_01',
    created_time: new Date().toISOString(),
    received_at: new Date().toISOString(),
    fullName: custom.fullName || `John Doe ${rand}`,
    email: custom.email || `johndoe${rand}@example.com`,
    phoneNumber: custom.phoneNumber || `+1 (555) 234-${rand}`,
    customFields: custom.customFields || { interest: 'Product Demo' },
    source: 'Local Simulator',
    isSimulated: true,
  };

  const { lead } = leadsStore.addLead(mock);
  io.emit('new_lead', lead);

  res.json({ success: true, lead });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: io.engine.clientsCount,
    totalLeads: leadsStore.getAllLeads().length,
  });
});

io.on('connection', (socket) => {
  console.log(`[ws] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  socket.on('disconnect', (reason) => {
    console.log(`[ws] Client disconnected: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Webhook callback: http://localhost:${PORT}/webhook`);
});
