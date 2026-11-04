// LCRP - one process runs all three bots (ID, Weapon, Role).   Start with: node index.js   (Node 22+)
require("./src/shared/env")(); // load .env first

if (typeof WebSocket === "undefined") {
  console.error("Node.js 22 or newer is required.");
  process.exit(1);
}

process.on("unhandledRejection", (err) => console.error("[LCRP] Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("[LCRP] Uncaught exception:", err));

console.log("==========================================");
console.log(" Starting LCRP (ID + Weapon + Role)");
console.log("==========================================");

const bots = [
  ["ID", "./src/id"],
  ["WEAPON", "./src/weapon"],
  ["ROLE", "./src/role"],
];

// One bot failing to start never stops the others.
for (const [name, file] of bots) {
  try {
    Promise.resolve(require(file).start()).catch((err) =>
      console.error(`[${name}] Failed to start:`, err.message)
    );
  } catch (err) {
    console.error(`[${name}] Failed to start:`, err.message);
  }
}
