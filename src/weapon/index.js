// Weapon bot: !weapon panel (add / remove / check)
const config = require("../../config/config");
const createRest = require("../shared/rest");
const createGateway = require("../shared/gateway");

exports.start = () => {
  const cfg = config.weapon;
  if (!cfg.token) throw new Error("No token (set DISCORD_TOKEN or WEAPON_BOT_TOKEN in .env)");

  const api = createRest(cfg.token, "WEAPON");
  const { onMessage, onInteraction } = require("./handlers")(api);

  require("./reminders")(api).start();

  createGateway({
    name: "WEAPON",
    token: cfg.token,
    intents: config.intents,
    onDispatch: (t, d) => {
      if (t === "MESSAGE_CREATE") return onMessage(d);
      if (t === "INTERACTION_CREATE") return onInteraction(d);
    },
  }).connect();
};
