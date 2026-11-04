const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'data', 'assignments.json');
const channelsFile = path.join(__dirname, '..', '..', 'config', 'channels.json');

function load() {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

// Keeps a log of every role given: who, which role, which channel, by whom
function log(entry) {
  const all = load();
  all.push({ ...entry, at: new Date().toISOString() });
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
}

// Saves the whole channel -> role map back to config/channels.json
function saveChannelRoles(map) {
  fs.writeFileSync(channelsFile, JSON.stringify(Object.fromEntries(map), null, 2));
}

module.exports = { log, saveChannelRoles };
