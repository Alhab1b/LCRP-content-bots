// All settings for all three bots. Secrets/IDs come from .env.
const channelRoles = require("./channels.json"); // { "channelId": "roleId" } -> Role bot

const main = process.env.DISCORD_TOKEN;

module.exports = {
  apiBase: "https://discord.com/api/v10",
  gatewayUrl: "wss://gateway.discord.gg/?v=10&encoding=json",
  // GUILDS (1) | GUILD_MESSAGES (512) | MESSAGE_CONTENT (32768)
  intents: 1 | 512 | 32768,

  // ---------------- ID bot (!lcrp, !test) ----------------
  id: {
    token: process.env.ID_BOT_TOKEN || main,
    prefix: "!",
    commandName: "lcrp", // matched case-insensitively
    logChannelId: "1565470182833389589",
    emoji: { name: "LC", id: "1565460716620619776" },
    accentColor: 0x5865f2,
    maxInputLength: 60,

    // &create -> asks for the gang name, then makes a voice + text channel inside the fixed category
    createCommand: "&create",
    createCategoryId: "1559777994296524823",
    createVoicePrefix: "فـويـس・", // + the gang name, stretched automatically
    createTextPrefix: "عـصـابـة・",
  },

  // ---------------- Weapon bot (!weapon) ----------------
  weapon: {
    token: process.env.WEAPON_BOT_TOKEN || main,
    logChannelId: process.env.LOG_CHANNEL_ID || "1560295097298456637",
    weaponRoleId: process.env.WEAPON_ROLE_ID || "1560323930991099935",
    command: "!weapon", // not case sensitive
    emoji: { name: "LCC", id: "1565464044268429514" },
    emojiText: "<:LCC:1565464044268429514>",
    colors: { panel: 0x2b2d31, add: 0x57f287, remove: 0xed4245, info: 0x5865f2 },
  },

  // ---------------- Role bot (channel -> role) ----------------
  role: {
    token: process.env.ROLE_BOT_TOKEN || main,
    channelRoles: new Map(Object.entries(channelRoles)),
    requireManageRoles: (process.env.REQUIRE_MANAGE_ROLES ?? "true") === "true",
    deleteMessage: (process.env.DELETE_MESSAGE ?? "false") === "true",

    // &assign -> opens a form to link a new channel to a role (needs assignRoleId)
    assignCommand: "&assign",
    assignRoleId: process.env.ASSIGN_ROLE_ID || "1567636671565008907",
    emoji: "<:LC:1565460716620619776>",
    accentColor: 0x5865f2,
  },
};
