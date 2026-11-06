const config = require("../../config/config").weapon;
const db = require("./database");
const citizenStore = require("../shared/citizens");
const ui = require("./components");

const logs = require("./logs");

module.exports = (api) => {
const { interactionCallback, addMemberRole, removeMemberRole } = api;
const E = config.emojiText;

// ---- !weapon command ----
function onMessage(msg) {
  if (msg.author && msg.author.bot) return;
  if (msg.content && msg.content.trim().toLowerCase() === config.command) {
    api.sendMessage(msg.channel_id, ui.mainPanel());
  }
}

// ---- helpers ----
const readFields = (i) => {
  const out = {};
  if (i.data && Array.isArray(i.data.components)) {
    for (const row of i.data.components) {
      if (Array.isArray(row.components)) {
        for (const c of row.components) {
          out[c.custom_id] = (c.value || "").trim();
        }
      }
    }
  }
  return out;
};

const reply = (i, content) => interactionCallback(i, 4, ui.ephemeralReply(content));

// ---- "Taking Care" button on the 24h staff alert ----
async function onAck(i) {
  const user = (i.member && i.member.user) || i.user;
  const roles = (i.member && i.member.roles) || [];
  const isAdmin = (BigInt(i.member?.permissions || 0) & 8n) !== 0n;
  if (!isAdmin && !(config.lcStaffRoleId && roles.includes(config.lcStaffRoleId))) {
    return reply(i, `${E} ❌ هذا الزر لفريق LC Staff فقط. | LC Staff only.`);
  }

  const cid = i.data.custom_id.slice(ui.ACK_PREFIX.length);
  const now = Math.floor(Date.now() / 1000);
  const n = db.patch(cid, (r) => !r.ackAt, { ackAt: now, ackBy: user.id });
  const records = db.get(cid);
  if (!n || !records.length) return reply(i, `${E} ℹ️ تم التعامل مع هذه الحالة مسبقاً. | Already handled.`);

  // Edit the alert message: remove the button, show who is handling it
  return interactionCallback(
    i,
    7,
    ui.staffAlert({
      cid,
      name: records[0].name,
      discordId: records[0].discordId,
      records,
      ackedBy: user.id,
      now,
    })
  );
}

// ---- buttons / modals ----
async function onInteraction(i) {
  // Buttons
  if (i.type === 3) {
    if (i.data.custom_id === "weapon_add") return interactionCallback(i, 9, ui.addModal());
    if (i.data.custom_id === "weapon_remove") return interactionCallback(i, 9, ui.removeModal());
    if (i.data.custom_id === "weapon_check") return interactionCallback(i, 9, ui.checkModal());
    if (i.data.custom_id.startsWith(ui.ACK_PREFIX)) return onAck(i);
    return;
  }

  // Modal submits
  if (i.type !== 5) return;
  const user = (i.member && i.member.user) || i.user;
  const f = readFields(i);
  const now = Math.floor(Date.now() / 1000);

  // ---- 1) Add Weapon ----
  if (i.data.custom_id === "modal_add") {
    const targetInput = f.target_id || f.cid;
    const weapon = (f.weapon || "").trim();

    if (!targetInput) {
      return reply(i, `${E} ⚠️ يرجى إدخال ايدي الشخصية أو ايدي الديسكورد.`);
    }
    if (!weapon) {
      return reply(i, `${E} ⚠️ يرجى كتابة اسم السلاح.`);
    }

    // Lookup in ID-lcrp
    const citizen = citizenStore.findCitizen(targetInput);
    if (!citizen) {
      return reply(
        i,
        `${E} ❌ **لم يتم العثور على هذا الشخص في بوت الهويات (ID-lcrp)!**\n` +
          `• تأكد من إدخال ايدي الشخصية أو ايدي الديسكورد بشكل صحيح.\n` +
          `• يجب على العضو تسجيل هويته أولاً في السيرفر عبر \`!lcrp\`.`
      );
    }

    const cid = citizen.characterId;
    const name = citizen.name;
    const discordId = citizen.userId;

    // Save to database
    db.add(cid, {
      cid,
      name,
      weapon,
      discordId,
      givenBy: user.id,
      at: now,
    });

    // Give Discord role if configured
    if (i.guild_id && config.weaponRoleId && discordId) {
      try {
        await addMemberRole(i.guild_id, discordId, config.weaponRoleId);
      } catch (err) {
        console.error(`[ROLE] Failed to add role to ${discordId}:`, err);
      }
    }

    // Ephemeral response to admin
    await reply(
      i,
      `${E} ✅ **تم إضافة السلاح بنجاح!**\n` +
        `- **الشخصية:** ${name} (\`${cid}\`)\n` +
        `- **الديسكورد:** <@${discordId}>\n` +
        `- **السلاح:** \`${weapon}\``
    );

    // Log type 1: weapon added
    return logs.logAdded(api, { user, discordId, cid, name, weapon, now });
  }

  // ---- 2) Remove Weapon ----
  if (i.data.custom_id === "modal_remove") {
    const targetInput = f.target_id || f.cid;
    if (!targetInput) {
      return reply(i, `${E} ⚠️ يرجى إدخال ايدي الشخصية أو ايدي الديسكورد.`);
    }

    const citizen = citizenStore.findCitizen(targetInput);
    let targetCid = citizen ? citizen.characterId : targetInput.trim().replace(/^<@!?/, "").replace(/>$/, "");

    let existing = db.get(targetCid);
    if (!existing.length) {
      const match = db.getByDiscordId(targetInput);
      if (match) {
        targetCid = match.cid;
        existing = match.weapons;
      }
    }

    if (!existing.length) {
      return reply(i, `${E} ❌ **لا توجد أي أسلحة مسجلة لهذا الايدي (\`${targetInput}\`)!**`);
    }

    const removed = db.remove(targetCid);
    const targetDiscordId = citizen?.userId || removed[0]?.discordId;
    const targetName = removed[0]?.name || citizen?.name || "N/A";

    // Remove role from member
    if (i.guild_id && config.weaponRoleId && targetDiscordId) {
      try {
        await removeMemberRole(i.guild_id, targetDiscordId, config.weaponRoleId);
      } catch (err) {
        console.error(`[ROLE] Failed to remove role from ${targetDiscordId}:`, err);
      }
    }

    await reply(
      i,
      `${E} ✅ **تم حذف أسلحة الشخصية بنجاح!**\n` +
        `- **ايدي الشخصية:** \`${targetCid}\`\n` +
        `- **الاسم:** ${targetName}\n` +
        `- **عدد الأسلحة المحذوفة:** ${removed.length}`
    );

    // Log type 2: weapon deleted
    return logs.logRemoved(api, { user, targetDiscordId, cid: targetCid, name: targetName, removed, now });
  }

  // ---- 3) Check Weapons ----
  if (i.data.custom_id === "modal_check") {
    const targetInput = f.target_id || f.cid;
    if (!targetInput) {
      return reply(i, `${E} ⚠️ يرجى إدخال ايدي الشخصية أو ايدي الديسكورد.`);
    }

    const citizen = citizenStore.findCitizen(targetInput);
    let targetCid = citizen ? citizen.characterId : targetInput.trim().replace(/^<@!?/, "").replace(/>$/, "");

    let weapons = db.get(targetCid);
    if (!weapons.length) {
      const match = db.getByDiscordId(targetInput);
      if (match) {
        targetCid = match.cid;
        weapons = match.weapons;
      }
    }

    const targetDiscordId = citizen?.userId || weapons[0]?.discordId;
    const targetName = citizen?.name || weapons[0]?.name || "N/A";

    if (!weapons.length) {
      return reply(
        i,
        `${E} ℹ️ **لا توجد أي أسلحة مسجلة لهذا الشخص:**\n` +
          `- **ايدي الشخصية:** \`${targetCid}\`\n` +
          (citizen
            ? `- **الاسم في الهويات:** ${targetName}\n- **حساب الديسكورد:** <@${citizen.userId}>`
            : `- **المدخل:** \`${targetInput}\``)
      );
    }

    const lines = [
      `### ${E} تفاصيل الأسلحة المسجلة:`,
      `- **ايدي الشخصية:** \`${targetCid}\``,
      `- **الاسم:** ${targetName}`,
      `- **حساب الديسكورد:** ${targetDiscordId ? `<@${targetDiscordId}>` : "غير معروف"}`,
      `- **عدد الأسلحة:** ${weapons.length}`,
      `\n**قائمة الأسلحة:**`,
      ...weapons.map(
        (r, n) => `• **#${n + 1}** \`${r.weapon}\` — أضافه: <@${r.givenBy}> (<t:${r.at}:d> <t:${r.at}:R>)`
      ),
    ];
    return reply(i, lines.join("\n"));
  }
}

return { onMessage, onInteraction };
};
