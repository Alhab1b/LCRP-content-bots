// Discord REST helpers for one bot token
const { apiBase } = require("../../config/config");

module.exports = function createRest(token, tag) {
  async function rest(method, route, body) {
    const res = await fetch(apiBase + route, {
      method,
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) console.error(`[${tag}] REST ${method} ${route} -> ${res.status}`, await res.text());
    return res;
  }

  const respond = (i, type, data) =>
    rest("POST", `/interactions/${i.id}/${i.token}/callback`, { type, data });

  return {
    rest,
    respond,
    interactionCallback: respond,
    sendMessage: (channelId, body) => rest("POST", `/channels/${channelId}/messages`, body),
    setMemberNick: (guildId, userId, nick) =>
      rest("PATCH", `/guilds/${guildId}/members/${userId}`, { nick }),
    addMemberRole: (guildId, userId, roleId) =>
      rest("PUT", `/guilds/${guildId}/members/${userId}/roles/${roleId}`),
    // Send a DM (opens the DM channel first). Returns the message response, or null if the DM could not be opened.
    sendDM: async (userId, body) => {
      const ch = await rest("POST", "/users/@me/channels", { recipient_id: userId });
      if (!ch.ok) return null;
      const { id } = await ch.json();
      return rest("POST", `/channels/${id}/messages`, body);
    },
    // All members of a guild (paged). Needs the "Server Members Intent" enabled in the developer portal.
    listGuildMembers: async (guildId) => {
      const out = [];
      let after = "0";
      for (;;) {
        const res = await rest("GET", `/guilds/${guildId}/members?limit=1000&after=${after}`);
        if (!res.ok) return null;
        const page = await res.json();
        out.push(...page);
        if (page.length < 1000) return out;
        after = page[page.length - 1].user.id;
      }
    },
    removeMemberRole: (guildId, userId, roleId) =>
      rest("DELETE", `/guilds/${guildId}/members/${userId}/roles/${roleId}`),
  };
};
