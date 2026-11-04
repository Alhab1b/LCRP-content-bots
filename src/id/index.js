// ID bot: !lcrp panel, character registration, nickname, !test
const config = require("../../config/config");
const createRest = require("../shared/rest");
const createGateway = require("../shared/gateway");

exports.start = () => {
  const cfg = config.id;
  if (!cfg.token) throw new Error("No token (set DISCORD_TOKEN or ID_BOT_TOKEN in .env)");

  const api = createRest(cfg.token, "ID");
  const onMessage = require("./handlers/command")(api);
  const onInteraction = require("./handlers/interaction")(api);

  createGateway({
    name: "ID",
    token: cfg.token,
    intents: config.intents,
    onDispatch: (t, d) => {
      if (t === "MESSAGE_CREATE") return onMessage(d);
      if (t === "INTERACTION_CREATE") return onInteraction(d);
    },
  }).connect();
};
