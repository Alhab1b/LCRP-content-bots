const config = require("../../../config/config").id;
const store = require("../../shared/citizens");
const C = require("../components");

const RANDOM_NAMES = [
  "حمو الونش",
  "Alhabib Ahmed",
  "فهد العتيبي",
  "خالد الشمري",
  "سلطان القحطاني",
  "احمد منصور",
  "عمر الخطيب",
  "راكان الحربي",
  "محمد العلي",
  "عبدالله الدوسري",
  "سعود المطيري",
  "نايف العنزي",
  "James Carter",
  "Ryan Cooper",
  "David Miller",
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomId() {
  return Math.floor(1000 + Math.random() * 90000);
}

module.exports = ({ sendMessage, setMemberNick }) => async function onMessage(msg) {
  if (msg.author?.bot || !msg.content) return;
  const raw = msg.content.trim();
  const lower = raw.toLowerCase();

  // 1) Main !lcrp command
  const lcrpCmd = config.prefix + config.commandName;
  if (lower === lcrpCmd) {
    return sendMessage(msg.channel_id, { flags: C.FLAGS.V2, components: C.mainPanel() });
  }

  // 1b) &create: ask for the gang name (button -> form, handled in interaction.js)
  if (lower === config.createCommand) {
    if (!msg.guild_id) return;
    return sendMessage(msg.channel_id, {
      flags: C.FLAGS.V2,
      allowed_mentions: { parse: [] },
      components: C.createPanel(msg.author.id),
    });
  }

  // 2) Test command: !test on @user, test on @user, !test @user
  const isTest =
    lower.startsWith("!test on") ||
    lower.startsWith("test on") ||
    lower.startsWith("!test ") ||
    lower === "!test";

  if (isTest) {
    // Detect target user from mentions or Snowflake ID
    let targetUser = msg.mentions?.[0];
    if (!targetUser) {
      const match = raw.match(/<@!?(\d+)>|(\d{17,20})/);
      const targetId = match ? (match[1] || match[2]) : null;
      if (targetId) {
        targetUser = { id: targetId, username: "TargetMember" };
      }
    }

    if (!targetUser) {
      return sendMessage(msg.channel_id, {
        flags: C.FLAGS.V2,
        components: [
          {
            type: 17,
            accent_color: config.accentColor,
            components: [
              {
                type: 10,
                content: `${C.E} **الاستخدام:** يرجى عمل منشن للشخص لتطبيق الفحص عليه:\n\`!test on @user\` أو \`test on @user\``,
              },
            ],
          },
        ],
      });
    }

    // Pick random name and character ID
    const randomName = getRandomElement(RANDOM_NAMES);
    const randomCid = getRandomId();
    const nickname = `${randomName} | ${randomCid}`.slice(0, 32);

    let nickSuccess = false;
    if (msg.guild_id && targetUser.id) {
      try {
        const res = await setMemberNick(msg.guild_id, targetUser.id, nickname);
        nickSuccess = Boolean(res && res.ok);
      } catch (err) {
        console.error(`[TEST] Failed to change nickname for ${targetUser.id}:`, err);
      }
    }

    store.addSubmission({
      userId: targetUser.id,
      username: targetUser.username,
      nickname,
      language: "ar",
      name: randomName,
      characterId: String(randomCid),
      guildId: msg.guild_id || null,
      createdAt: new Date().toISOString(),
      isTest: true,
    });

    // Send confirmation in current channel
    await sendMessage(msg.channel_id, {
      flags: C.FLAGS.V2,
      components: C.testResultPanel({
        user: targetUser,
        name: randomName,
        cid: String(randomCid),
        nickname,
        nickSuccess,
      }),
    });
  }
};

