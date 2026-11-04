// Minimal Discord gateway client (Node's built-in WebSocket)
const { gatewayUrl } = require("../../config/config");

// Close codes where reconnecting can never work (bad token / intents)
const FATAL = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

module.exports = function createGateway({ name, token, intents, onDispatch, reconnectMs = 3000 }) {
  let hb = null;
  let seq = null;
  let stopped = false;

  function connect() {
    if (stopped) return;
    seq = null;
    const ws = new WebSocket(gatewayUrl);
    const send = (op, d) => ws.readyState === 1 && ws.send(JSON.stringify({ op, d }));

    ws.onmessage = ({ data }) => {
      const p = JSON.parse(data);
      if (p.s) seq = p.s;

      switch (p.op) {
        case 10: // HELLO
          clearInterval(hb);
          setTimeout(() => send(1, seq), p.d.heartbeat_interval * Math.random());
          hb = setInterval(() => send(1, seq), p.d.heartbeat_interval);
          send(2, { token, intents, properties: { os: "linux", browser: "lcrp", device: "lcrp" } });
          break;
        case 7: // RECONNECT
        case 9: // INVALID SESSION
          ws.close();
          break;
        case 0: // DISPATCH
          if (p.t === "READY") console.log(`[${name}] Logged in as ${p.d.user.username}`);
          try {
            Promise.resolve(onDispatch(p.t, p.d)).catch((e) => console.error(`[${name}]`, e));
          } catch (e) {
            console.error(`[${name}]`, e);
          }
          break;
      }
    };

    ws.onclose = (e) => {
      clearInterval(hb);
      if (FATAL.has(e.code)) {
        stopped = true;
        console.error(`[${name}] Gateway closed with fatal code ${e.code} (check the token / intents). Not reconnecting.`);
        return;
      }
      console.log(`[${name}] Disconnected, reconnecting in ${reconnectMs / 1000}s...`);
      setTimeout(connect, reconnectMs);
    };
    ws.onerror = (e) => console.error(`[${name}] WS error:`, e.message || e);
  }

  return { connect };
};
