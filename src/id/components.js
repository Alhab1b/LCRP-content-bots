// Components V2 builders only
const config = require("../../config/config").id;
const getLocale = require("./i18n");

const E = `<:${config.emoji.name}:${config.emoji.id}>`;
const FLAGS = { V2: 1 << 15, EPHEMERAL: 1 << 6 };

const text = (content) => ({ type: 10, content });
const row = (...components) => ({ type: 1, components });
const button = (custom_id, label, style) => ({
  type: 2, style, label, custom_id, emoji: config.emoji,
});
const container = (...components) => ({
  type: 17, accent_color: config.accentColor, components,
});
const textInput = (custom_id, label) => ({
  type: 1,
  components: [{
    type: 4, custom_id, label, style: 1, required: true, max_length: config.maxInputLength,
  }],
});

// !lcrp panel: two language buttons
const mainPanel = () => [
  container(
    text(`# ${E} LCRP`),
    text(`${E} اختر لغتك / Choose your language`),
    row(button("lang_ar", "اللغة العربية", 1), button("lang_en", "English Language", 3))
  ),
];

// After language pick: the "Enter Your Charachter Id" button
const enterPanel = (lang) => {
  const t = getLocale(lang);
  return [container(text(`${E} ${t.enterPrompt}`), row(button(`enter_${lang}`, t.enterButton, 1)))];
};

const modal = (lang) => {
  const t = getLocale(lang);
  return {
    custom_id: `modal_${lang}`,
    title: t.modalTitle,
    components: [textInput("name", t.nameLabel), textInput("cid", t.idLabel)],
  };
};

const successPanel = (lang) => [container(text(`${E} ${getLocale(lang).success}`))];

const logPanel = ({ user, lang, name, cid, nickname }) => [
  container(
    text(`## ${E} LCRP Log`),
    text(
      `- **User:** <@${user.id}> (${user.username})\n` +
      `- **Nickname:** ${nickname || `${name} | ${cid}`}\n` +
      `- **Language:** ${getLocale(lang).languageName}\n` +
      `- **Name:** ${name}\n` +
      `- **Character ID:** ${cid}`
    ),
    text(`-# <t:${Math.floor(Date.now() / 1000)}:F>`)
  ),
];

const testResultPanel = ({ user, name, cid, nickname, nickSuccess }) => [
  container(
    text(`## ${E} LCRP - وضع التجربة (Test Mode)`),
    text(
      `- **المستخدم:** <@${user.id}> (${user.username})\n` +
      `- **الاسم العشوائي:** ${name}\n` +
      `- **الأيدي العشوائي:** ${cid}\n` +
      `- **اللقب الجديد:** \`${nickname}\`\n` +
      `- **تغيير اللقب:** ${nickSuccess ? "تم بنجاح ✅" : "تعذر (تحقق من رتبة البوت وصلاحياته) ⚠️"}`
    ),
    text(`-# <t:${Math.floor(Date.now() / 1000)}:R>`)
  ),
];

// &create: button that opens the "gang name" form (only the person who ran the command can use it)
const createPanel = (userId) => [
  container(
    text(`# ${E} إنشاء رومات العصابة`),
    text(`${E} اضغط على الزر لكتابة اسم العصابة`),
    row(button(`create_open:${userId}`, "اسم العصابة", 1))
  ),
];

const createModal = () => ({
  custom_id: "modal_create",
  title: "إنشاء رومات العصابة",
  components: [textInput("gang", "اسم العصابة")],
});

const notice = (content) => [container(text(`${E} ${content}`))];

module.exports = { createPanel, createModal, notice, E, FLAGS, mainPanel, enterPanel, modal, successPanel, logPanel, testResultPanel };
