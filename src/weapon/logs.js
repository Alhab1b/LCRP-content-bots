// The two weapon log types: 1) weapon ADDED  2) weapon DELETED
const config = require("../../config/config").weapon;
const ui = require("./components");

const logAdded = (api, { user, discordId, cid, name, weapon, now }) =>
  api.sendMessage(
    config.logChannels.add,
    ui.logMessage("Weapon Added | إضافة سلاح", config.colors.add, [
      `- **Given By | تم الإعطاء بواسطة:** <@${user.id}>`,
      `- **Received By | المستلم:** <@${discordId}>`,
      `- **Character Id | ايدي الشخصية:** \`${cid}\``,
      `- **Name | الاسم:** ${name}`,
      `- **Weapon | السلاح:** ${weapon}`,
      `- **Time | الوقت:** <t:${now}:F>`,
    ])
  );

const logRemoved = (api, { user, targetDiscordId, cid, name, removed, now }) =>
  api.sendMessage(
    config.logChannels.remove,
    ui.logMessage("Weapon Removed | حذف سلاح", config.colors.remove, [
      `- **Removed By | تم الحذف بواسطة:** <@${user.id}>`,
      `- **Target | المستهدف:** ${targetDiscordId ? `<@${targetDiscordId}>` : `\`${cid}\``} (${name})`,
      `- **Character Id | ايدي الشخصية:** \`${cid}\``,
      `- **Weapons Removed | الأسلحة المحذوفة:**`,
      ...removed.map((r, n) => `  • **#${n + 1}** \`${r.weapon}\` — أضافه <@${r.givenBy}> <t:${r.at}:R>`),
      `- **Time | الوقت:** <t:${now}:F>`,
    ])
  );

module.exports = { logAdded, logRemoved };
