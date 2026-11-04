// Citizen registry (data/citizens.json) - written by the ID bot, read by the Weapon bot
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "..", "data", "citizens.json");

function read() {
  try {
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(d.submissions)) d.submissions = [];
    return d;
  } catch {
    return { submissions: [] };
  }
}

function addSubmission(entry) {
  const data = read();
  data.submissions.push(entry);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function resolveCitizenName(s) {
  if (s.name && s.name !== "undefined" && typeof s.name === "string" && s.name.trim().length > 0) {
    return s.name.trim();
  }
  if (s.nickname && typeof s.nickname === "string") {
    const first = s.nickname.split("|")[0]?.trim();
    if (first && first !== "undefined" && first.length > 0) return first;
  }
  return null;
}

function findCitizen(query) {
  if (!query) return null;
  const raw = String(query).trim().replace(/^<@!?/, "").replace(/>$/, "");
  if (!raw) return null;

  const data = read();
  const list = data.submissions || [];
  let candidate = null;

  for (let idx = list.length - 1; idx >= 0; idx--) {
    const s = list[idx];
    if (String(s.characterId) === raw || String(s.userId) === raw) {
      const explicitName = resolveCitizenName(s);
      if (explicitName) {
        return {
          found: true,
          characterId: String(s.characterId),
          name: explicitName,
          userId: String(s.userId),
          username: s.username,
          nickname: s.nickname,
          guildId: s.guildId,
          createdAt: s.createdAt,
        };
      }
      if (!candidate) {
        candidate = {
          found: true,
          characterId: String(s.characterId),
          name: s.username || "Unknown",
          userId: String(s.userId),
          username: s.username,
          nickname: s.nickname,
          guildId: s.guildId,
          createdAt: s.createdAt,
        };
      }
    }
  }
  return candidate;
}

module.exports = { read, addSubmission, findCitizen, resolveCitizenName };
