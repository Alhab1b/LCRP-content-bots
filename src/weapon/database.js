// Tiny JSON database: { [characterId]: [ record, ... ] }
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "data", "weapons.json");

function loadDb() {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  } catch (err) {
    console.error("[DATABASE] Error reading weapons.json:", err.message);
  }
  return {};
}

let db = loadDb();

const save = () => {
  try {
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("[DATABASE] Error saving weapons.json:", err.message);
  }
};

module.exports = {
  add(cid, record) {
    db = loadDb();
    const strCid = String(cid);
    (db[strCid] ||= []).push(record);
    save();
    return record;
  },

  get(cid) {
    db = loadDb();
    return db[String(cid)] || [];
  },

  getByDiscordId(discordId) {
    db = loadDb();
    const targetDiscordId = String(discordId).replace(/^<@!?/, "").replace(/>$/, "");
    for (const [cid, weapons] of Object.entries(db)) {
      if (Array.isArray(weapons) && weapons.some((w) => String(w.discordId) === targetDiscordId)) {
        return { cid, weapons };
      }
    }
    return null;
  },

  find(query) {
    db = loadDb();
    const raw = String(query).trim().replace(/^<@!?/, "").replace(/>$/, "");
    if (db[raw] && db[raw].length > 0) {
      return { cid: raw, weapons: db[raw] };
    }
    return this.getByDiscordId(raw);
  },

  remove(cid) {
    db = loadDb();
    const strCid = String(cid);
    const old = db[strCid] || [];
    delete db[strCid];
    save();
    return old;
  },

  removeByAnyId(query) {
    db = loadDb();
    const raw = String(query).trim().replace(/^<@!?/, "").replace(/>$/, "");
    if (db[raw]) {
      const old = db[raw];
      delete db[raw];
      save();
      return { cid: raw, removed: old };
    }
    const match = this.getByDiscordId(raw);
    if (match) {
      delete db[match.cid];
      save();
      return { cid: match.cid, removed: match.weapons };
    }
    return { cid: raw, removed: [] };
  },

  all() {
    return loadDb();
  },
};
