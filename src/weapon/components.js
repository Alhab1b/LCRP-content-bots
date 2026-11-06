// Components V2 builders (flag 1<<15 => no content/embeds, only components)
const config = require("../../config/config").weapon;
const { emoji, emojiText: E, colors } = config;

const IS_COMPONENTS_V2 = 1 << 15;
const EPHEMERAL = 1 << 6;

const text = (content) => ({ type: 10, content }); // Text Display
const separator = () => ({ type: 14, divider: true, spacing: 1 }); // Separator
const container = (components, accent_color) => ({ type: 17, accent_color, components }); // Container
const actionRow = (components) => ({ type: 1, components });

const message = (components, ephemeral = false) => ({
  flags: IS_COMPONENTS_V2 | (ephemeral ? EPHEMERAL : 0),
  components,
  allowed_mentions: { parse: [] },
});

function mainPanel() {
  return message([
    container(
      [
        text(`# ${E} Weapon System | نظام الأسلحة`),
        text(`${E} اختار من الأزرار بالأسفل | Choose an option below`),
        separator(),
        actionRow([
          { type: 2, style: 3, custom_id: "weapon_add", label: "Add Weapon | إضافة سلاح", emoji },
          { type: 2, style: 4, custom_id: "weapon_remove", label: "Remove Weapon | حذف سلاح", emoji },
          { type: 2, style: 1, custom_id: "weapon_check", label: "Check Weapons | كشف الأسلحة", emoji },
        ]),
      ],
      colors.panel
    ),
  ]);
}

const field = (custom_id, label, placeholder, max = 100) =>
  actionRow([{ type: 4, custom_id, label, style: 1, placeholder, required: true, min_length: 1, max_length: max }]);

const addModal = () => ({
  custom_id: "modal_add",
  title: "Add Weapon | إضافة سلاح",
  components: [
    field("target_id", "ايدي الشخصية أو الديسكورد | ID", "مثال: 111 أو 341867744385433601", 30),
    field("weapon", "Weapon Name | اسم السلاح", "مثال: Pistol أو Deagle أو Heavy Pistol", 60),
  ],
});

const removeModal = () => ({
  custom_id: "modal_remove",
  title: "Remove Weapon | حذف سلاح",
  components: [
    field("target_id", "ايدي الشخصية أو الديسكورد | ID", "ايدي الشخصية أو ايدي الديسكورد", 30),
  ],
});

const checkModal = () => ({
  custom_id: "modal_check",
  title: "Check Weapons | كشف الأسلحة",
  components: [
    field("target_id", "ايدي الشخصية أو الديسكورد | ID", "ايدي الشخصية أو ايدي الديسكورد", 30),
  ],
});

const logMessage = (title, color, lines) =>
  message([container([text(`## ${E} ${title}`), separator(), text(lines.join("\n"))], color)]);

const ephemeralReply = (content) => message([container([text(content)], colors.info)], true);

// ---- weapon-holding reminders ----
const ACK_PREFIX = "weapon_ack:";

// Alert sent to the LC Staff role. When `ackedBy` is set it becomes the "handled" version (no button).
function staffAlert({ cid, name, discordId, records, roleId, hours, escalationHours, ackedBy, now }) {
  const lines = [
    `- **Player | اللاعب:** <@${discordId}> (${name})`,
    `- **Character Id | ايدي الشخصية:** \`${cid}\``,
    `- **Weapons | الأسلحة:**`,
    ...records.map((r) => `  • \`${r.weapon}\` — <t:${r.at}:R> (<@${r.givenBy}>)`),
  ];
  const body = [text(`## ${E} Weapon Retrieval Needed | استرجاع سلاح`), separator(), text(lines.join("\n"))];

  if (ackedBy) {
    body.push(separator(), text(`✅ **Handled by | تم الاستلام بواسطة:** <@${ackedBy}> — <t:${now}:R>`));
    return message([container(body, colors.add)]);
  }

  body.push(
    separator(),
    text(
      `<@&${roleId}> مضى أكثر من **${hours} ساعة** على هذا السلاح، يرجى استرجاعه من اللاعب ثم الضغط على الزر.\n` +
        `More than **${hours}h** have passed. Please retrieve it, then press the button.\n` +
        `⏳ If nobody responds within **${escalationHours}h**, Content Staff will be DMed.`
    ),
    actionRow([{ type: 2, style: 3, custom_id: ACK_PREFIX + cid, label: "Taking Care | استلمت الحالة", emoji }])
  );
  return { ...message([container(body, colors.warn)]), allowed_mentions: { roles: [roleId] } };
}

module.exports = {
  ACK_PREFIX,
  staffAlert,
  mainPanel,
  addModal,
  removeModal,
  checkModal,
  logMessage,
  ephemeralReply,
};
