// Role bot: a message with user IDs in a linked channel gives those users the channel's role
const { Client, Events, GatewayIntentBits, PermissionsBitField, MessageFlags } = require("discord.js");
const config = require("../../config/config").role;
const store = require("./store");


// ---- Components V2 helpers (raw JSON) ----
const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const box = (...components) => ({ type: 17, accent_color: config.accentColor, components });
const text = (content) => ({ type: 10, content });
const hasAssignRole = (member) => Boolean(member?.roles?.cache?.has(config.assignRoleId));
const ID_RE = /^\d{17,20}$/;

const assignPanel = () => [
  box(
    text(`# ${config.emoji} Assign`),
    text("اضغط على الزر لربط روم جديد برول (ايدي الروم + ايدي الرول)"),
    {
      type: 1,
      components: [
        { type: 2, style: 1, custom_id: "assign_open", label: "Add Assign | إضافة ربط", emoji: { name: "LC", id: "1565460716620619776" } },
      ],
    }
  ),
];

const assignModal = () => ({
  custom_id: "assign_modal",
  title: "Assign | ربط روم برول",
  components: [
    { type: 1, components: [{ type: 4, custom_id: "channel_id", label: "ايدي الروم | Channel ID", style: 1, required: true, min_length: 17, max_length: 20 }] },
    { type: 1, components: [{ type: 4, custom_id: "role_id", label: "ايدي الرول | Role ID", style: 1, required: true, min_length: 17, max_length: 20 }] },
  ],
});

exports.start = () => {
  if (!config.token) throw new Error("No token (set DISCORD_TOKEN or ROLE_BOT_TOKEN in .env)");

  console.log(`[ROLE] Loaded ${config.channelRoles.size} channel/role link(s).`);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // enable in Developer Portal too
    ],
  });

  client.once(Events.ClientReady, () => console.log(`[ROLE] Logged in as ${client.user.tag}`));

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    // &assign -> panel with a button (only for members who have the assign role)
    if (message.content.trim().toLowerCase() === config.assignCommand) {
      if (!hasAssignRole(message.member)) return message.react("❌").catch(() => {});
      return message.channel.send({ flags: V2, allowed_mentions: { parse: [] }, components: assignPanel() });
    }

    const roleId = config.channelRoles.get(message.channel.id);
    if (!roleId) return; // channel not linked to a role

    if (
      config.requireManageRoles &&
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) return;

    const ids = [...new Set(message.content.match(/\b\d{17,20}\b/g) || [])];
    if (!ids.length) return;

    let ok = 0;
    for (const id of ids) {
      try {
        const member = await message.guild.members.fetch(id);
        await member.roles.add(roleId);
        store.log({ userId: id, roleId, channelId: message.channel.id, givenBy: message.author.id });
        ok++;
      } catch (err) {
        console.error(`[ROLE] Failed for ${id}:`, err.message);
      }
    }

    await message.react(ok ? "<LC:1565460716620619776>" : "❌").catch(() => {});
    if (ok && config.deleteMessage) {
      setTimeout(() => message.delete().catch(() => {}), 2000);
    }
  });

  client.on(Events.InteractionCreate, async (i) => {
    try {
      // Button -> open the form
      if (i.isButton() && i.customId === "assign_open") {
        if (!hasAssignRole(i.member)) {
          return i.reply({ flags: V2 | EPHEMERAL, components: [box(text(`${config.emoji} ❌ ما عندكش صلاحية استخدام الأمر ده.`))] });
        }
        return i.showModal(assignModal());
      }

      // Form submit -> validate and save the link
      if (i.isModalSubmit() && i.customId === "assign_modal") {
        const reply = (content) =>
          i.reply({ flags: V2 | EPHEMERAL, allowed_mentions: { parse: [] }, components: [box(text(`${config.emoji} ${content}`))] });

        if (!hasAssignRole(i.member)) return reply("❌ ما عندكش صلاحية استخدام الأمر ده.");

        const channelId = i.fields.getTextInputValue("channel_id").trim();
        const roleId = i.fields.getTextInputValue("role_id").trim();
        if (!ID_RE.test(channelId) || !ID_RE.test(roleId)) return reply("⚠️ الايدي لازم يكون أرقام فقط (17-20 رقم).");

        const channel = await i.guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return reply("❌ مفيش روم بالايدي ده في السيرفر.");
        const role = await i.guild.roles.fetch(roleId).catch(() => null);
        if (!role) return reply("❌ مفيش رول بالايدي ده في السيرفر.");

        const previous = config.channelRoles.get(channelId);
        config.channelRoles.set(channelId, roleId);
        store.saveChannelRoles(config.channelRoles);

        return reply(
          `✅ **تم ${previous ? "تحديث" : "إضافة"} الربط**\n- **الروم:** <#${channelId}>\n- **الرول:** <@&${roleId}>` +
            (previous && previous !== roleId ? `\n- **الرول القديم:** <@&${previous}>` : "")
        );
      }
    } catch (err) {
      console.error("[ROLE] Interaction error:", err);
    }
  });

  return client.login(config.token);
};
