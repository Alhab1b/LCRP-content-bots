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
    logChannelId: process.env.LOG_CHANNEL_ID || "1559778072213852292",
    weaponRoleId: process.env.WEAPON_ROLE_ID || "1565477216131878912",
    command: "!weapon", // not case sensitive
    emoji: { name: "LC", id: "1565460716620619776" },
    emojiText: "<:LC:1565460716620619776>",
    colors: { panel: 0x2b2d31, add: 0x57f287, remove: 0xed4245, info: 0x5865f2, warn: 0xfee75c },

    // Two log types: "add weapon" and "delete weapon" (each can go to its own channel, default = logChannelId)
    logChannels: {
      add: process.env.ADD_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID || "1559778072213852292",
      remove: process.env.REMOVE_LOG_CHANNEL_ID || process.env.LOG_CHANNEL_ID || "1559778072213852292",
    },

    // Weapon-holding reminders
    lcStaffRoleId: process.env.LC_STAFF_ROLE_ID || "", // pinged after firstAlertHours
    contentStaffRoleId: process.env.CONTENT_STAFF_ROLE_ID || "", // DMed after escalationHours
    alertChannelId: process.env.ALERT_CHANNEL_ID || process.env.LOG_CHANNEL_ID || "1559778072213852292",
    firstAlertHours: Number(process.env.FIRST_ALERT_HOURS || 24),
    escalationHours: Number(process.env.ESCALATION_HOURS || 8), // counted from the first alert
    checkIntervalMs: 60 * 1000,
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
