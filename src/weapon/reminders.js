// Weapon-holding reminders.
//  1) A weapon is still issued after `firstAlertHours` (24h)  -> ping the LC Staff role.
//  2) Nobody pressed "Taking Care" within `escalationHours` (8h) of that alert -> DM every Content Staff member.
// A weapon stops being tracked as soon as it is removed (Remove Weapon) or acknowledged by staff.
const config = require("../../config/config").weapon;
const db = require("./database");
const ui = require("./components");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = ({ rest, sendMessage, sendDM, listGuildMembers }) => {
  let guildId = null;
  let running = false;
  let retryAt = 0; // cool-down after a failed member lookup
  const warned = new Set();

  const warnOnce = (key, msg) => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(`[WEAPON] ${msg}`);
  };

  async function getGuildId() {
    if (guildId) return guildId;
    const res = await rest("GET", `/channels/${config.alertChannelId}`);
    if (res.ok) guildId = (await res.json()).guild_id;
    return guildId;
  }

  const holder = (cid, records) => ({
    cid,
    name: records[0].name,
    discordId: records[0].discordId,
    records,
  });

  // ---- step 1: ping LC Staff ----
  async function alertStaff(cid, now) {
    if (!config.lcStaffRoleId) return warnOnce("lc", "LC_STAFF_ROLE_ID is not set - 24h alerts are disabled.");
    const due = (r) => !r.ackAt && !r.alertedAt && now - r.at >= config.firstAlertHours * 3600;
    const records = db.get(cid).filter(due);
    if (!records.length) return;

    const res = await sendMessage(
      config.alertChannelId,
      ui.staffAlert({
        ...holder(cid, records),
        roleId: config.lcStaffRoleId,
        hours: config.firstAlertHours,
        escalationHours: config.escalationHours,
      })
    );
    if (res.ok) db.patch(cid, due, { alertedAt: now });
  }

  // ---- step 2: DM Content Staff ----
  async function escalate(cid, now) {
    if (!config.contentStaffRoleId) return warnOnce("content", "CONTENT_STAFF_ROLE_ID is not set - escalation DMs are disabled.");
    if (now < retryAt) return;
    const due = (r) => !r.ackAt && r.alertedAt && !r.escalatedAt && now - r.alertedAt >= config.escalationHours * 3600;
    const records = db.get(cid).filter(due);
    if (!records.length) return;

    const gid = await getGuildId();
    const members = gid ? await listGuildMembers(gid) : null;
    if (!members) {
      retryAt = now + 600;
      return console.error("[WEAPON] Could not list members (enable the Server Members Intent). Retrying in 10 minutes.");
    }
    const staff = members.filter((m) => !m.user.bot && m.roles.includes(config.contentStaffRoleId));

    const h = holder(cid, records);
    const content =
      `⚠️ **Weapon not retrieved | سلاح لم يتم استرجاعه**\n` +
      `مضى أكثر من ${config.firstAlertHours + config.escalationHours} ساعة ولم يستجب أحد من LC Staff.\n` +
      `Nobody from LC Staff responded in time.\n\n` +
      `- **Player:** <@${h.discordId}> (${h.name})\n- **Character Id:** \`${cid}\`\n` +
      records.map((r) => `- **Weapon:** \`${r.weapon}\` — issued <t:${r.at}:R>`).join("\n") +
      `\n\nhttps://discord.com/channels/${gid}/${config.alertChannelId}`;

    let sent = 0;
    for (const m of staff) {
      const res = await sendDM(m.user.id, { content, allowed_mentions: { parse: [] } });
      if (res && res.ok) sent++;
      await sleep(1200); // stay clear of DM rate limits
    }
    db.patch(cid, due, { escalatedAt: now });
    console.log(`[WEAPON] Escalated cid ${cid}: DMed ${sent}/${staff.length} Content Staff members.`);
  }

  async function tick() {
    if (running) return;
    running = true;
    try {
      const now = Math.floor(Date.now() / 1000);
      for (const cid of Object.keys(db.all())) {
        await alertStaff(cid, now);
        await escalate(cid, now);
      }
    } catch (err) {
      console.error("[WEAPON] Reminder check failed:", err);
    } finally {
      running = false;
    }
  }

  return {
    start() {
      setTimeout(tick, 5000);
      setInterval(tick, config.checkIntervalMs);
    },
  };
};
