const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let leads = [];

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    leads = JSON.parse(raw);
  }
} catch (err) {
  leads = [];
}

function saveToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist leads:', err.message);
  }
}

function getAllLeads() {
  return [...leads];
}

function addLead(lead) {
  const idx = leads.findIndex((l) => l.leadgen_id === lead.leadgen_id);
  if (idx !== -1) {
    leads[idx] = { ...leads[idx], ...lead, updatedAt: new Date().toISOString() };
    saveToDisk();
    return { lead: leads[idx], isNew: false };
  }

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
