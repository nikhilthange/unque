const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory leads array
let leads = [];

// Load existing leads from disk on startup
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    leads = JSON.parse(raw);
    console.log(`[Storage] Loaded ${leads.length} historical leads from disk.`);
  } else {
    leads = [];
  }
} catch (err) {
  console.warn('[Storage] Could not read leads.json, starting with empty store:', err.message);
  leads = [];
}

function saveToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error saving leads to disk:', err.message);
  }
}

function getAllLeads() {
  return [...leads];
}

function addLead(lead) {
  // Prevent duplicate leadgen_id entries if Meta retries
  const existingIndex = leads.findIndex((l) => l.leadgen_id === lead.leadgen_id);
  if (existingIndex !== -1) {
    // Update existing
    leads[existingIndex] = { ...leads[existingIndex], ...lead, updatedAt: new Date().toISOString() };
    saveToDisk();
    return { lead: leads[existingIndex], isNew: false };
  }

  // Prepend new lead so newest is first
  leads.unshift(lead);
  saveToDisk();
  return { lead, isNew: true };
}

function clearLeads() {
  leads = [];
  saveToDisk();
}

module.exports = {
  getAllLeads,
  addLead,
  clearLeads,
};
