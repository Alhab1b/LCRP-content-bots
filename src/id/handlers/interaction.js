const config = require("../../../config/config").id;
const store = require("../../shared/citizens");
const { stretchName } = require("../arabic");
const C = require("../components");

const langOf = (id) => (id.endsWith("_ar") ? "ar" : "en");

module.exports = ({ respond, sendMessage, setMemberNick, rest }) => async function onInteraction(i) {
  // Buttons
  if (i.type === 3) {
    const id = i.data.custom_id;
    if (id === "lang_ar" || id === "lang_en") {
      const lang = id === "lang_ar" ? "ar" : "en";
      return respond(i, 4, { flags: C.FLAGS.V2 | C.FLAGS.EPHEMERAL, components: C.enterPanel(lang) });
    }
    if (id === "enter_ar" || id === "enter_en") {
      return respond(i, 9, C.modal(langOf(id)));
    }
    // &create button -> gang name form (only for the person who ran &create)
    if (id.startsWith("create_open:")) {
      const user = (i.member && i.member.user) || i.user;
      if (id.split(":")[1] !== user.id) {
        return respond(i, 4, { flags: C.FLAGS.V2 | C.FLAGS.EPHEMERAL, components: C.notice("❌ الزر ده للشخص اللي كتب الأمر بس") });
      }
      return respond(i, 9, C.createModal());
    }
    return;
  }

  // &create form submit -> build the stretched name and make the two channels
  if (i.type === 5 && i.data.custom_id === "modal_create") {
    const fields = {};
    for (const r of i.data.components) for (const c of r.components) fields[c.custom_id] = c.value.trim();
    const name = stretchName(fields.gang);

    if (!name || !i.guild_id) {
      return respond(i, 4, { flags: C.FLAGS.V2 | C.FLAGS.EPHEMERAL, components: C.notice("⚠️ اكتب اسم العصابة") });
    }
    await respond(i, 4, { flags: C.FLAGS.V2 | C.FLAGS.EPHEMERAL, components: C.notice("جاري إنشاء الرومات...") });

    const make = async (channelName, type) => {
      const res = await rest("POST", `/guilds/${i.guild_id}/channels`, {
        name: channelName,
        type, // 2 = voice, 0 = text
        parent_id: config.createCategoryId,
      });
      return res.ok ? res.json() : null;
    };
    const voice = await make(config.createVoicePrefix + name, 2);
    const text = await make(config.createTextPrefix + name, 0);

    const made = [voice, text].filter(Boolean).map((c) => `- <#${c.id}>`).join("\n");
    const content =
      voice && text
        ? `**تم إنشاء الرومين بنجاح**\n${made}`
        : `**تعذر إنشاء ${voice || text ? "أحد الرومين" : "الرومين"}**\n` +
          `تأكد إن البوت معاه صلاحية Manage Channels وإن الكاتيجوري موجودة.` +
          (made ? `\n**اللي اتعمل:**\n${made}` : "");
    return sendMessage(i.channel_id, {
      flags: C.FLAGS.V2,
      allowed_mentions: { parse: [] },
      components: C.notice(content),
    });
  }

  // Modal submit
  if (i.type === 5 && (i.data.custom_id === "modal_ar" || i.data.custom_id === "modal_en")) {
    const lang = langOf(i.data.custom_id);
    const fields = {};
    for (const r of i.data.components) for (const c of r.components) fields[c.custom_id] = c.value.trim();
    const user = (i.member && i.member.user) || i.user;

    // Nickname format: Name | ID (max 32 characters in Discord)
    const nickname = (fields.name ? `${fields.name} | ${fields.cid}` : `${fields.cid}`).slice(0, 32);

    // 1) Acknowledge immediately to avoid 3s Discord timeout / 40060 errors
    await respond(i, 4, { flags: C.FLAGS.V2 | C.FLAGS.EPHEMERAL, components: C.successPanel(lang) });

    // 2) Change nickname in guild
    if (i.guild_id && user.id) {
      try {
        await setMemberNick(i.guild_id, user.id, nickname);
      } catch (err) {
        console.error(`[NICK] Failed to change nickname for ${user.id}:`, err);
      }
    }

    // 3) Store submission
    store.addSubmission({
      userId: user.id,
      username: user.username,
      nickname,
      language: lang,
      name: fields.name || null,
      characterId: fields.cid,
      guildId: i.guild_id || null,
      createdAt: new Date().toISOString(),
    });

    // 4) Send log to logChannelId
    if (config.logChannelId) {
      try {
        await sendMessage(config.logChannelId, {
          flags: C.FLAGS.V2,
          allowed_mentions: { parse: [] },
          components: C.logPanel({ user, lang, name: fields.name, cid: fields.cid, nickname }),
        });
      } catch (err) {
        console.error("[LOG] Failed to send log to channel:", err);
      }
    }
  }
};

