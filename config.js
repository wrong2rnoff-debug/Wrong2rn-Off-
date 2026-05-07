export const config = {
  // ── Bot token ──────────────────────────────────────────────────────────────
  token: process.env.DISCORD_BOT_TOKEN || '',

  // ── Prefix for message commands ────────────────────────────────────────────
  prefix: '?',

  // ── Role ID: only members with this role can use /give* slash commands ─────
  // Set to '' or null to allow everyone with admin, or comment out to disable
  giveawayRoleId: process.env.GIVEAWAY_ROLE_ID || '',

  // ── Channel to log giveaway activity (entries, starts, ends) ──────────────
  giveawayLogChannel: process.env.GIVEAWAY_LOG_CHANNEL || '',

  // ── Whitelist: these user IDs / role IDs can use prefix giveaway commands ──
  whitelistUsers: (process.env.WHITELIST_USERS || '').split(',').filter(Boolean),
  whitelistRoles: (process.env.WHITELIST_ROLES || '').split(',').filter(Boolean),

  // ── Member counter voice/text channel — name is updated on every join/leave ─
  memberCounterChannelId: process.env.MEMBER_COUNTER_CHANNEL_ID || '1488627608584192131',
};
