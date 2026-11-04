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
    removeMemberRole: (guildId, userId, roleId) =>
      rest("DELETE", `/guilds/${guildId}/members/${userId}/roles/${roleId}`),
  };
};
