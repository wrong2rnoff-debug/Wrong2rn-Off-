import {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  OverwriteType,
  type VoiceState,
  type GuildMember,
  type VoiceChannel,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
  type Interaction,
  type Guild,
  type Message,
} from "discord.js";
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import { readFileSync, writeFileSync, existsSync } from "fs";
import * as fs from "fs";
import * as path from "path";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN
// ─────────────────────────────────────────────────────────────────────────────
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN environment variable is required");
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — MAIN FILE
// ─────────────────────────────────────────────────────────────────────────────
const CREATE_VC_CHANNEL_ID = "1489253077184807254";
const CATEGORY_ID = "1488459569339301978";
const NICKNAME_CHANNEL_ID = "1488445742640140428";
const PERMANENT_VC_ID = "1488548250041712650";

const EMOJIS = [
  "🐡","🍄","🍓","🍋","🥝","👻","🐻","🍰","🧸","🐯","🐙","🦕","🌴","🍄‍🟫","🌼","🌺","🔥",
];

function randomEmoji(): string {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

function extractEmojiFromName(name: string): string | null {
  const match = name.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}](?:\u200d[\p{Emoji_Presentation}\p{Extended_Pictographic}])*)/u);
  return match ? match[1] : null;
}

const EMBED_COLOR = 0x0c0c0c;

const ALLOWED_MOD_ROLE_ID = "1495486715245101086";

function embed(description: string) {
  return new EmbedBuilder().setColor(EMBED_COLOR).setDescription(description);
}

function parseUserId(str: string): string | null {
  const mentionMatch = str?.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (str && /^\d+$/.test(str)) return str;
  return null;
}

function parseDuration(str: string): number | null {
  const match = str?.match(/^(\d+)([hmd])$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "h") return amount * 60 * 60 * 1000;
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "d") return amount * 24 * 60 * 60 * 1000;
  return null;
}

function autoDelete(msg: { delete(): Promise<unknown> }, ms: number) {
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

function buildPunishmentEmbed(
  guildName: string,
  guildIconUrl: string | undefined,
  punishment: string,
  reason: string
) {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(punishment)
    .addFields({ name: "Reason", value: reason || "No reason provided." })
    .setFooter({ text: `${guildName} | ${dateStr}`, iconURL: guildIconUrl });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — FILE 1 (SELF-ROLE + VERIFICATION + ?VE)
// ─────────────────────────────────────────────────────────────────────────────
const STATE_FILE = resolve(__dirname, "../.bot-state.json");

const SELF_ROLE_CHANNEL_ID = "1488442875082707015";

const VERIFICATION_JOIN_VC   = "1488479913341095937";
const STAFF_PING_CHANNEL_ID  = "1488478458328645692";
const STAFF_ROLE_ID          = "1488949722210238464";
const VERIFIED_ROLE_ID       = "1488521626059542538";

const VP_ROLE_ID     = "1488521626059542538";
const MALE_ROLE_ID   = "1488521698973061283";
const FEMALE_ROLE_ID = "1488521734171656282";
const REMOVE_ROLE_ID = "1488628569990238329";

const ALLOWED_CMD_ROLE_ID = "1488949722210238464";

const GAMES_ROLES_F1: Record<string, string> = {
  "Free Fire":        "1488941273489608724",
  "Valorant":         "1488941349850976416",
  "Minecraft":        "1488941349850976416",
  "Counter Strike 2": "1488941583368851476",
  "FiveM":            "1488941648292352120",
  "Call Of Duty":     "1488941792396316923",
  "Roblox":           "1488941846108573868",
  "Blood Strike":     "1488941888345215148",
  "Among Us":         "1488941941197504613",
  "Stumble Guys":     "1488941984440914151",
  "E Football":       "1488942047581966346",
};

const RELATIONSHIP_ROLES_F1: Record<string, string> = {
  "In a Relationship": "1488942111578394895",
  "Single":            "1488942179337633944",
  "Its Complicated":   "1488942226636800123",
};

const AGE_ROLES_F1: Record<string, string> = {
  "( 14 - 18 )": "1488942288582349082",
  "( 18 - 22 )": "1488942548402573382",
  "+ 22":         "1488942635606474905",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — FILE 2 (TV TEMP VOICE)
// ─────────────────────────────────────────────────────────────────────────────
const GENERATOR_CHANNEL_ID = "1488997560415682640";
const ALLOWED_ROLE_ID      = "1488521626059542538";
const CREATION_COOLDOWN_MS = 10_000;
const ROOM_EMOJIS = ["🐡","🍄","🍓","🍋","🥝","👻","🐻","🍰","🧸","🐯","🐙","🦕","🌴","🍄‍🟫","🌼","🌺","🔥"];

function randomRoomEmoji() {
  return ROOM_EMOJIS[Math.floor(Math.random() * ROOM_EMOJIS.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — FILE 3 (CLAN MANAGEMENT)
// ─────────────────────────────────────────────────────────────────────────────
const TICKET_CATEGORY_ID = "1488460690544005192";
const PANEL_IMAGE_URL = "https://cdn.discordapp.com/attachments/1488273264836087959/1499775468839112725/0C7A8726-39A0-4EDC-86A7-94CE8BFF67FC.png?ex=69f60640&is=69f4b4c0&hm=5c7c4c30289dd1349c959ed70bf0bec3a9cdc53c70c78740dc9cabe66ee9fc53&";
const DATA_FILE = resolve(__dirname, "clans.json");

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — FILE 4 (JTC TEMP VOICE)
// ─────────────────────────────────────────────────────────────────────────────
const JOIN_TO_CREATE_CHANNEL_ID = '1492879195758657647';
const TEMP_VOICE_CATEGORY_ID    = '1492875131398258740';

const JTC_EMOJIS = [
  '🐮','🎷','🦖','🦈','🐉','🦒','🦤','🏈','🐻','🐜',
  '🪰','🎭','🫐','🍒','🌽','🍞','🫖','💺','🧩','🧼',
  '🥕','🌶️','👜','🦇',
];

const MODAL_BUTTONS = new Set(['vc_trust', 'vc_untrust', 'vc_kick', 'vc_disconnect', 'vc_rename']);

function randomJtcEmoji() {
  return JTC_EMOJIS[Math.floor(Math.random() * JTC_EMOJIS.length)];
}

function stripEmojis(str: string): string {
  return str
    .replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\ufe0f|\u200d)/g, '')
    .trim();
}

function parseUserIdVC(raw: string): string | null {
  const match = raw.match(/(\d{17,20})/);
  return match ? match[1] : null;
}

function makeUserModal(customId: string, title: string) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('user_input')
          .setLabel('User ID or @mention')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 123456789012345678 or <@123...>')
          .setRequired(true)
      )
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — FILE 5 (BANGZ VAULT: XP + CASINO + REPORT)
// ─────────────────────────────────────────────────────────────────────────────
const CASINO_CHANNEL_ID  = '1500065061933416489';
const REQUIRED_ROLE_ID   = '1488521626059542538';
const ADMIN_USER_ID      = '985199377041752104';
const REPORT_HUB_ID      = '1501259455847731360';
const REPORTER_ROLE_ID   = '1488521626059542538';
const VAULT_STAFF_ROLE_ID = '1489297553261334759';
const STARTING_BALANCE   = 1000;
const XP_IMAGE           = 'https://cdn.discordapp.com/attachments/1488273264836087959/1500054430953898146/2F96B041-5371-47A1-9264-EF70C9377C2A.png?ex=69f70a0e&is=69f5b88e&hm=c6c3a0874542f828037f1fe95e4dd7cc9e2b3922b15b2ff8b6acc8650326a1e0&';
const CASINO_IMAGE       = 'https://cdn.discordapp.com/attachments/1488273264836087959/1500067161933353131/96763b05-07e5-41da-aa7c-9b344b5d23aa.png?ex=69f715e9&is=69f5c469&hm=160ca4f4ba6d88a5757e86712d7729536706217223edb8ffd839be924afac800&';

// File 5 permissions (declared before usage in handlers)
const OWNER_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseVAD,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
];

const STAFF_PERMS = [
  ...OWNER_PERMS,
  PermissionFlagsBits.MuteMembers,
  PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.ManageMessages,
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — FILE 6 (SELF-ROLE v2 + ANTI-LINK + AUTO-ROLES + GIVEAWAYS + INVITES)
// ─────────────────────────────────────────────────────────────────────────────
const CHANNEL_ID = "1488442875082707015";

const GAMES_ROLES = [
  { label: "Free Fire",         value: "free_fire",        roleId: "1488941273489608724" },
  { label: "Valorant",          value: "valorant",          roleId: "1488941349850976416" },
  { label: "Minecraft",         value: "minecraft",         roleId: "1488941484529946764" },
  { label: "Counter Strike 2",  value: "cs2",               roleId: "1488941583368851476" },
  { label: "FiveM",             value: "fivem",             roleId: "1488941648292352120" },
  { label: "Call Of Duty",      value: "cod",               roleId: "1488941792396316923" },
  { label: "Roblox",            value: "roblox",            roleId: "1488941846108573868" },
  { label: "Blood Strike",      value: "blood_strike",      roleId: "1488941888345215148" },
  { label: "Among Us",          value: "among_us",          roleId: "1488941941197504613" },
  { label: "Stumble Guys",      value: "stumble_guys",      roleId: "1488941984440914151" },
  { label: "E Football",        value: "e_football",        roleId: "1488942047581966346" },
  { label: "EA Football Club",  value: "ea_football_club",  roleId: "1490332942428405830" },
  { label: "League Of Legends", value: "league_of_legends", roleId: "1490333406989516840" },
];

const RELATIONSHIP_ROLES = [
  { label: "In a Relationship", value: "in_relationship", roleId: "1488942111578394895" },
  { label: "Single",            value: "single",          roleId: "1488942179337633944" },
  { label: "Its Complicated",   value: "complicated",     roleId: "1488942226636800123" },
];

const AGE_ROLES = [
  { label: "(14 - 18)", value: "age_14_18",   roleId: "1488942288582349082" },
  { label: "(18 - 22)", value: "age_18_22",   roleId: "1488942548402573382" },
  { label: "+ 22",      value: "age_22_plus", roleId: "1488942635606474905" },
];

const WHITELISTED_USERS = [
  "985199377041752104",
];

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

function containsLink(content: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(content);
}

function isOnlyGifLinks(content: string): boolean {
  const allLinks = content.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || [];
  if (allLinks.length === 0) return false;
  return allLinks.every((link) => /https?:\/\/(tenor\.com|giphy\.com|media\.tenor\.com|i\.giphy\.com)/i.test(link));
}

const AUTO_ROLES = ["1488673752798593186", "1488628569990238329"];

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME STATE
// ─────────────────────────────────────────────────────────────────────────────

// Main file: temp VC map (channelId → {ownerId, emoji})
const tempChannels = new Map<string, { ownerId: string; emoji: string }>();

// File 1: verification temp channels (userId → channelId)
const verificationTempChannels = new Map<string, string>();
// File 1: ping counts (userId → pings sent)
const pingCounts = new Map<string, number>();

// File 2: TV temp rooms
const tempRooms = new Map<string, any>();
const cooldowns = new Map<string, number>();

// File 4: JTC temp channels
const jtcTempChannels = new Map<string, any>();
const creatingFor = new Set<string>();

// File 5: case channels (channelId → {ownerId})
const caseChannels = new Map<string, { ownerId: string }>();

// File 6: giveaways + invite tracking
const giveaways     = new Map<string, any>();
const inviteCache   = new Map<string, Map<string, any>>();
const memberInvites = new Map<string, any>();
const leftCounts    = new Map<string, number>();

// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: PERSISTENT STATE
// ─────────────────────────────────────────────────────────────────────────────
function loadState(): { messageId?: string } {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return {};
}

function saveState(state: { messageId?: string }) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 3: CLAN DATA
// ─────────────────────────────────────────────────────────────────────────────
function load() {
  if (!existsSync(DATA_FILE)) return { clans: {}, channelToClan: {} };
  try { return JSON.parse(readFileSync(DATA_FILE, "utf-8")); } catch { return { clans: {}, channelToClan: {} }; }
}
function save(store: any) { writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); }
function getClan(id: string) { return load().clans[id.toUpperCase()]; }
function upsertClan(clan: any) { const s = load(); s.clans[clan.id.toUpperCase()] = { ...clan, id: clan.id.toUpperCase() }; save(s); }
function linkChannel(channelId: string, clanId: string) { const s = load(); s.channelToClan[channelId] = clanId.toUpperCase(); save(s); }
function isLeaderOrCo(clan: any, userId: string) { return clan.leaderId === userId || clan.coLeaderIds.includes(userId); }
function addMember(clanId: string, userId: string) { const s = load(); const c = s.clans[clanId.toUpperCase()]; if (!c) return; if (!c.memberIds.includes(userId)) c.memberIds.push(userId); save(s); }
function kickMember(clanId: string, userId: string) { const s = load(); const c = s.clans[clanId.toUpperCase()]; if (!c) return; c.memberIds = c.memberIds.filter((id: string) => id !== userId); save(s); }

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: DATABASE
// ─────────────────────────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const FILES = {
  chat:    path.join(dataDir, 'chat_xp.json'),
  voice:   path.join(dataDir, 'voice_xp.json'),
  balance: path.join(dataDir, 'casino_balance.json'),
  casino:  path.join(dataDir, 'casino_data.json'),
};

function loadFile(p: string) {
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
  return {};
}
function saveFile(p: string, d: any) { fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8'); }

const chatDB    = loadFile(FILES.chat);
const voiceDB   = loadFile(FILES.voice);
const balanceDB = loadFile(FILES.balance);
const casinoDB  = loadFile(FILES.casino);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveFile(FILES.chat,    chatDB);
    saveFile(FILES.voice,   voiceDB);
    saveFile(FILES.balance, balanceDB);
    saveFile(FILES.casino,  casinoDB);
    saveTimer = null;
  }, 500);
}

const vaultKey = (userId: string, guildId: string) => `${guildId}:${userId}`;

const db = {
  getChatRecord:   (u: string, g: string) => chatDB[vaultKey(u, g)]  || null,
  setChatRecord:   (u: string, g: string, d: any) => { chatDB[vaultKey(u, g)]  = d; scheduleSave(); },
  getVoiceRecord:  (u: string, g: string) => voiceDB[vaultKey(u, g)] || null,
  setVoiceRecord:  (u: string, g: string, d: any) => { voiceDB[vaultKey(u, g)] = d; scheduleSave(); },
  getAllChatRecords(guildId: string) {
    return Object.entries(chatDB).filter(([k]) => k.startsWith(`${guildId}:`))
      .map(([k, v]: [string, any]) => ({ ...v, user_id: k.split(':')[1] })).sort((a: any, b: any) => b.xp - a.xp);
  },
  getAllVoiceRecords(guildId: string) {
    return Object.entries(voiceDB).filter(([k]) => k.startsWith(`${guildId}:`))
      .map(([k, v]: [string, any]) => ({ ...v, user_id: k.split(':')[1] })).sort((a: any, b: any) => b.xp - a.xp);
  },
  getAllCombinedRecords(guildId: string) {
    const map = new Map<string, number>();
    Object.entries(chatDB).filter(([k]) => k.startsWith(`${guildId}:`))
      .forEach(([k, v]: [string, any]) => { const u = k.split(':')[1]; map.set(u, (map.get(u) || 0) + (v.xp || 0)); });
    Object.entries(voiceDB).filter(([k]) => k.startsWith(`${guildId}:`))
      .forEach(([k, v]: [string, any]) => { const u = k.split(':')[1]; map.set(u, (map.get(u) || 0) + (v.xp || 0)); });
    return Array.from(map.entries()).map(([user_id, xp]) => ({ user_id, xp })).sort((a, b) => b.xp - a.xp);
  },
};

const casinoDb = {
  getBalance(u: string, g: string) {
    const k = vaultKey(u, g);
    if (balanceDB[k] == null) balanceDB[k] = STARTING_BALANCE;
    return balanceDB[k];
  },
  adjustBalance(u: string, g: string, amount: number) {
    const k = vaultKey(u, g);
    if (balanceDB[k] == null) balanceDB[k] = STARTING_BALANCE;
    balanceDB[k] += amount;
    scheduleSave();
    return balanceDB[k];
  },
  getCasinoData:   (u: string, g: string) => casinoDB[vaultKey(u, g)] || {},
  updateCasinoData(u: string, g: string, updates: any) {
    const k = vaultKey(u, g);
    casinoDB[k] = { ...(casinoDB[k] || {}), ...updates };
    scheduleSave();
  },
  getAllBalances(guildId: string) {
    return Object.entries(balanceDB).filter(([k]) => k.startsWith(`${guildId}:`))
      .map(([k, v]: [string, any]) => ({ userId: k.split(':')[1], balance: v })).sort((a: any, b: any) => b.balance - a.balance);
  },
};

function recordGame(u: string, g: string, won: boolean, chipsNet: number) {
  const k = vaultKey(u, g);
  const d: any = casinoDB[k] || {};
  casinoDB[k] = {
    ...d,
    gamesPlayed: (d.gamesPlayed || 0) + 1,
    wins:        (d.wins        || 0) + (won === true  ? 1 : 0),
    losses:      (d.losses      || 0) + (won === false ? 1 : 0),
    chipsWon:    (d.chipsWon    || 0) + (chipsNet > 0  ? chipsNet : 0),
    chipsLost:   (d.chipsLost   || 0) + (chipsNet < 0  ? -chipsNet : 0),
  };
  scheduleSave();
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉'];

function getLevelFromXP(xp: number) { return Math.floor(Math.pow(xp / 100, 0.4)); }
function getXPForLevel(lvl: number) { return Math.floor(100 * Math.pow(lvl, 2.5)); }
function fmt(n: number) { return Number(n).toLocaleString(); }
function getRank(balance: number) {
  if (balance >= 50000) return 'Diamond Player';
  if (balance >= 10000) return 'Gold Player';
  if (balance >= 1000)  return 'Silver Player';
  return 'Bronze Player';
}
function msToTime(ms: number) {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function cooldownCheck(last: number, cd: number) {
  const elapsed = Date.now() - (last || 0);
  return elapsed < cd ? { on: true, remaining: cd - elapsed } : { on: false, remaining: 0 };
}
function parseBet(str: string, balance: number) {
  if (!str) return { error: 'Please enter a bet amount, or type `all` / `50%`.' };
  const lower = str.toLowerCase();
  let bet: number;
  if (lower === 'all') {
    bet = balance;
  } else if (lower === '50%') {
    bet = Math.floor(balance / 2);
  } else {
    bet = parseInt(str, 10);
  }
  if (isNaN(bet) || bet <= 0) return { error: 'Please enter a valid bet amount, or type `all` / `50%`.' };
  if (bet > balance) return { error: `Not enough chips. Your balance: **${fmt(balance)}**` };
  return { bet, error: undefined };
}

function baseEmbed(guild: any) {
  return new EmbedBuilder().setColor(EMBED_COLOR).setFooter({
    text: `Casino Table | ${guild.name}`,
    iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
  });
}
function xpBaseEmbed(guild: any) {
  return new EmbedBuilder().setColor(EMBED_COLOR).setFooter({
    text: `Bangz Vault • System Requirements`,
    iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
  });
}
function errEmbed(guild: any, desc: string) { return baseEmbed(guild).setDescription(`**${desc}**`); }

function casinoAccess(message: any) {
  if (message.channel.id !== CASINO_CHANNEL_ID) return 'channel';
  if (!message.member?.roles.cache.has(REQUIRED_ROLE_ID)) return 'role';
  return null;
}
function xpAccess(message: any) {
  return message.member?.roles.cache.has(REQUIRED_ROLE_ID);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: XP SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_COOLDOWN    = 10_000;
const VOICE_XP_PER_MIN = 10;
const VOICE_INTERVAL   = 60_000;

async function handleMessage(message: any) {
  if (!message.guild || !message.content.trim()) return null;
  const u = message.author.id, g = message.guild.id, now = Date.now();
  const content = message.content.trim();
  let rec = db.getChatRecord(u, g) || { xp: 0, level: 0, last_message: 0, last_content: '' };
  if (now - rec.last_message < CHAT_COOLDOWN) return null;
  if (content === rec.last_content) return null;
  const gain = Math.floor(Math.random() * 8) + 5;
  const newXP = rec.xp + gain;
  const newLvl = getLevelFromXP(newXP);
  db.setChatRecord(u, g, { xp: newXP, level: newLvl, last_message: now, last_content: content });
}

function startVoiceXPInterval(clientRef: Client) {
  setInterval(() => {
    clientRef.guilds.cache.forEach((guild) => {
      guild.voiceStates.cache.forEach((vs) => {
        const member = vs.member;
        if (!member || member.user.bot || !vs.channel) return;
        if (vs.channel.members.filter((m) => !m.user.bot).size < 2) return;
        const rec = db.getVoiceRecord(member.id, guild.id) || { xp: 0, level: 0 };
        const newXP = rec.xp + VOICE_XP_PER_MIN;
        db.setVoiceRecord(member.id, guild.id, { xp: newXP, level: getLevelFromXP(newXP) });
      });
    });
  }, VOICE_INTERVAL);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: XP LEADERBOARD (?lead text / ?lead vc)
// ─────────────────────────────────────────────────────────────────────────────
const lbSessions = new Map<string, any>();

async function buildLeaderboardEmbed(guild: any, type: string, page: number, userId: string) {
  const isChat = type === 'chat';
  const all = isChat ? db.getAllChatRecords(guild.id) : db.getAllVoiceRecords(guild.id);
  const total = Math.max(1, Math.ceil(all.length / 10));
  const p = Math.max(1, Math.min(total, page));
  const slice = all.slice((p - 1) * 10, p * 10);
  const idx = all.findIndex((u: any) => u.user_id === userId);
  const urec = idx >= 0 ? all[idx] : null;

  let lines = '';
  for (let i = 0; i < slice.length; i++) {
    const u: any = slice[i];
    const rank = (p - 1) * 10 + i + 1;
    const lvl = getLevelFromXP(u.xp);
    const prefix = rank <= 3 ? MEDALS[rank - 1] : `**#${rank}**`;
    let name = 'Unknown User';
    try {
      const m = guild.members.cache.get(u.user_id) ?? await guild.members.fetch(u.user_id).catch(() => null);
      if (m) name = m.user.username;
    } catch {}
    lines += `${prefix} **${name}** — Level ${lvl} (${fmt(u.xp)} XP)\n`;
  }
  if (!lines) lines = '*No users ranked yet.*';

  const footerRank = urec ? `#${idx + 1} (Level ${getLevelFromXP(urec.xp)} • ${fmt(urec.xp)} XP)` : 'Unranked';
  const emb = xpBaseEmbed(guild)
    .setTitle(isChat ? '__**Bangz Vault • Chat XP Leaderboard**__' : '__**Bangz Vault • Voice XP Leaderboard**__')
    .setDescription(`**${isChat ? 'Top active users based on chat XP' : 'Top active users based on voice XP'}**\n\u200b\n${lines}`)
    .setImage(XP_IMAGE)
    .setFooter({ text: `Bangz Vault • System Requirements  │  Page ${p}/${total}  •  Your Rank: ${footerRank}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined });
  return { embed: emb, totalPages: total };
}

function lbButtons(page: number, total: number, sid: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`lb_prev_${sid}`).setLabel('◀  Previous').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(`lb_next_${sid}`).setLabel('Next  ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total),
  );
}

async function handleLeaderboardCommand(message: any, type: string) {
  if (!xpAccess(message))
    return message.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('**You don\'t have permission to use this command.**')] });
  const sid = `${message.author.id}_${Date.now()}`;
  const { embed: emb, totalPages } = await buildLeaderboardEmbed(message.guild, type, 1, message.author.id);
  const reply = await message.reply({ embeds: [emb], components: [lbButtons(1, totalPages, sid)] });
  lbSessions.set(sid, { userId: message.author.id, page: 1, type, totalPages });
  setTimeout(async () => { lbSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 60_000);
}

async function handleLbButton(interaction: any) {
  const id = interaction.customId;
  if (!id.startsWith('lb_prev_') && !id.startsWith('lb_next_')) return false;
  const dir = id.startsWith('lb_prev_') ? -1 : 1;
  const sid = id.startsWith('lb_prev_') ? id.slice('lb_prev_'.length) : id.slice('lb_next_'.length);
  const s = lbSessions.get(sid);
  if (!s) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('**Session expired.**')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('**This is not your session.**')], ephemeral: true }); return true; }
  s.page = Math.max(1, Math.min(s.totalPages, s.page + dir));
  const { embed: emb, totalPages } = await buildLeaderboardEmbed(interaction.guild, s.type, s.page, s.userId);
  s.totalPages = totalPages;
  await interaction.update({ embeds: [emb], components: [lbButtons(s.page, totalPages, sid)] });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: XP COMBINED LEADERBOARD (?xptop)
// ─────────────────────────────────────────────────────────────────────────────
const cbSessions = new Map<string, any>();

async function buildCombinedEmbed(guild: any, page: number, userId: string) {
  const all = db.getAllCombinedRecords(guild.id);
  const total = Math.max(1, Math.ceil(all.length / 10));
  const p = Math.max(1, Math.min(total, page));
  const slice = all.slice((p - 1) * 10, p * 10);
  const idx = all.findIndex((u: any) => u.user_id === userId);
  const urec = idx >= 0 ? all[idx] : null;

  let lines = '';
  for (let i = 0; i < slice.length; i++) {
    const u: any = slice[i];
    const rank = (p - 1) * 10 + i + 1;
    const prefix = rank <= 3 ? MEDALS[rank - 1] : `**#${rank}**`;
    let name = 'Unknown User';
    try {
      const m = guild.members.cache.get(u.user_id) ?? await guild.members.fetch(u.user_id).catch(() => null);
      if (m) name = m.user.username;
    } catch {}
    lines += `${prefix} **${name}** — Level ${getLevelFromXP(u.xp)} (${fmt(u.xp)} XP total)\n`;
  }
  if (!lines) lines = '*No users ranked yet.*';

  const footerRank = urec ? `#${idx + 1} (Level ${getLevelFromXP(urec.xp)} • ${fmt(urec.xp)} XP total)` : 'Unranked';
  const emb = xpBaseEmbed(guild)
    .setTitle('__**Bangz Vault • Overall XP Leaderboard**__')
    .setDescription(`**Top active users based on combined chat + voice XP**\n\u200b\n${lines}`)
    .setImage(XP_IMAGE)
    .setFooter({ text: `Bangz Vault • System Requirements  │  Page ${p}/${total}  •  Your Rank: ${footerRank}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined });
  return { embed: emb, totalPages: total };
}

function cbButtons(page: number, total: number, sid: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cb_prev_${sid}`).setLabel('◀  Previous').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(`cb_next_${sid}`).setLabel('Next  ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total),
  );
}

async function handleCombinedCommand(message: any) {
  if (!xpAccess(message))
    return message.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('**You don\'t have permission to use this command.**')] });
  const sid = `${message.author.id}_${Date.now()}`;
  const { embed: emb, totalPages } = await buildCombinedEmbed(message.guild, 1, message.author.id);
  const reply = await message.reply({ embeds: [emb], components: [cbButtons(1, totalPages, sid)] });
  cbSessions.set(sid, { userId: message.author.id, page: 1, totalPages });
  setTimeout(async () => { cbSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 60_000);
}

async function handleCbButton(interaction: any) {
  const id = interaction.customId;
  if (!id.startsWith('cb_prev_') && !id.startsWith('cb_next_')) return false;
  const dir = id.startsWith('cb_prev_') ? -1 : 1;
  const sid = id.startsWith('cb_prev_') ? id.slice('cb_prev_'.length) : id.slice('cb_next_'.length);
  const s = cbSessions.get(sid);
  if (!s) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('**Session expired.**')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('**This is not your session.**')], ephemeral: true }); return true; }
  s.page = Math.max(1, Math.min(s.totalPages, s.page + dir));
  const { embed: emb, totalPages } = await buildCombinedEmbed(interaction.guild, s.page, s.userId);
  s.totalPages = totalPages;
  await interaction.update({ embeds: [emb], components: [cbButtons(s.page, totalPages, sid)] });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: RANK (?rank)
// ─────────────────────────────────────────────────────────────────────────────
function buildProgressBar(cur: number, max: number, len = 16) {
  const r = max === 0 ? 1 : Math.min(cur / max, 1);
  const f = Math.round(r * len);
  return '█'.repeat(f) + '░'.repeat(len - f);
}

async function handleRankCommand(message: any) {
  const guild = message.guild;
  let target = message.member;
  const mention = message.mentions.members?.first();
  if (mention) target = mention;
  const u = target.user;
  const g = guild.id;

  const allChat  = db.getAllChatRecords(g);
  const allVoice = db.getAllVoiceRecords(g);
  const ci = allChat.findIndex((x: any) => x.user_id === u.id);
  const vi = allVoice.findIndex((x: any) => x.user_id === u.id);
  const cxp = ci >= 0 ? allChat[ci].xp : 0;
  const vxp = vi >= 0 ? allVoice[vi].xp : 0;

  const cl = getLevelFromXP(cxp), vl = getLevelFromXP(vxp);
  const cProg = cxp - getXPForLevel(cl), cNeed = getXPForLevel(cl + 1) - getXPForLevel(cl);
  const vProg = vxp - getXPForLevel(vl), vNeed = getXPForLevel(vl + 1) - getXPForLevel(vl);

  const emb = xpBaseEmbed(guild)
    .setTitle(`__**Bangz Vault • ${u.username}'s Rank**__`)
    .setThumbnail(u.displayAvatarURL({ dynamic: true, size: 128 }))
    .setDescription([
      `**__Chat XP__**`,
      `> Rank: ${ci >= 0 ? `**#${ci + 1}** of ${allChat.length}` : '**Unranked**'}`,
      `> Level: **${cl}**  •  Total XP: **${fmt(cxp)}**`,
      `> Progress to Level ${cl + 1}:`,
      `> \`${buildProgressBar(cProg, cNeed)}\` **${fmt(cProg)} / ${fmt(cNeed)} XP**`,
      ``,
      `**__Voice XP__**`,
      `> Rank: ${vi >= 0 ? `**#${vi + 1}** of ${allVoice.length}` : '**Unranked**'}`,
      `> Level: **${vl}**  •  Total XP: **${fmt(vxp)}**`,
      `> Progress to Level ${vl + 1}:`,
      `> \`${buildProgressBar(vProg, vNeed)}\` **${fmt(vProg)} / ${fmt(vNeed)} XP**`,
    ].join('\n'))
    .setImage(XP_IMAGE);

  await message.reply({ embeds: [emb] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — BLACKJACK
// ─────────────────────────────────────────────────────────────────────────────
const bjSessions = new Map<string, any>();
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS_BJ = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function buildDeck() {
  const d: any[] = [];
  for (const s of SUITS) for (const r of RANKS_BJ) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function cardVal(r: string) { return ['J', 'Q', 'K'].includes(r) ? 10 : r === 'A' ? 11 : parseInt(r, 10); }
function handTotal(hand: any[]) {
  let t = hand.reduce((s, c) => s + cardVal(c.r), 0);
  let a = hand.filter((c) => c.r === 'A').length;
  while (t > 21 && a-- > 0) t -= 10;
  return t;
}
function fmtHand(hand: any[], hide = false) {
  if (hide && hand.length >= 2) return `[${hand[0].r}${hand[0].s}, ?]`;
  return '[' + hand.map((c) => `${c.r}${c.s}`).join(', ') + ']';
}
function bjButtons(uid: string, canSplit: boolean, canDouble: boolean) {
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bj_double_${uid}`).setLabel('Double Down').setStyle(ButtonStyle.Secondary).setDisabled(!canDouble),
    new ButtonBuilder().setCustomId(`bj_split_${uid}`).setLabel('Split').setStyle(ButtonStyle.Secondary).setDisabled(!canSplit),
    new ButtonBuilder().setCustomId(`bj_surrender_${uid}`).setLabel('Surrender').setStyle(ButtonStyle.Secondary),
  )];
}
function bjGameEmbed(guild: any, s: any, title = '🃏 __**Blackjack Table**__') {
  return baseEmbed(guild).setTitle(title)
    .setDescription([
      `**Bet: ${fmt(s.bet)} chips**`,
      `**Goal: Get closest to 21 without going over**`,
      ``,
      `**Your hand:** ${fmtHand(s.ph)} → **Total: ${handTotal(s.ph)}**`,
      `**Dealer shows:** ${fmtHand(s.dh, true)}`,
      ``,
      `**Use the buttons below to play**`,
    ].join('\n')).setImage(CASINO_IMAGE);
}

async function finishBJ(ctx: any, uid: string, reason: string) {
  const s = bjSessions.get(uid);
  if (!s) return;
  bjSessions.delete(uid);
  const isInt = !!ctx.update;
  const guild = ctx.guild;
  const pt = handTotal(s.ph);
  let emb: EmbedBuilder;

  if (reason === 'surrender') {
    const ret = Math.floor(s.bet / 2);
    casinoDb.adjustBalance(uid, s.g, ret);
    recordGame(uid, s.g, false, -(s.bet - ret));
    emb = baseEmbed(guild).setTitle('__**Surrendered**__').setDescription([
      `**Your hand:** ${fmtHand(s.ph)} → **Total: ${pt}**`,
      ``, `**You surrendered — half your bet returned.**`, `**+${fmt(ret)} chips**`,
    ].join('\n')).setImage(CASINO_IMAGE);
  } else if (reason === 'bust') {
    recordGame(uid, s.g, false, -s.bet);
    emb = baseEmbed(guild).setTitle('❌ __**You Lost**__').setDescription([
      `**Your hand:** ${fmtHand(s.ph)} → **Total: ${pt} (bust)**`,
      `**Dealer wins**`, ``, `**-${fmt(s.bet)} chips**`,
    ].join('\n')).setImage(CASINO_IMAGE);
  } else {
    while (handTotal(s.dh) < 17) s.dh.push(s.deck.pop());
    const dt = handTotal(s.dh);
    const bust = dt > 21;
    const win = bust || pt > dt;
    const push = !bust && pt === dt;
    const isBJ = reason === 'blackjack';
    if (isBJ) {
      const pay = Math.floor(s.bet * 2.5);
      casinoDb.adjustBalance(uid, s.g, pay);
      recordGame(uid, s.g, true, pay - s.bet);
      emb = baseEmbed(guild).setTitle('🎉 __**Blackjack! You Win!**__').setDescription([
        `**Your hand:** ${fmtHand(s.ph)} → **Total: 21**`,
        `**Dealer:** ${fmtHand(s.dh)} → **Total: ${dt}**`,
        ``, `**+${fmt(pay - s.bet)} chips earned**`,
      ].join('\n')).setImage(CASINO_IMAGE);
    } else if (push) {
      casinoDb.adjustBalance(uid, s.g, s.bet);
      emb = baseEmbed(guild).setTitle('__**Push — Tie Game**__').setDescription([
        `**Your hand:** ${fmtHand(s.ph)} → **Total: ${pt}**`,
        `**Dealer:** ${fmtHand(s.dh)} → **Total: ${dt}**`,
        ``, `**Bet returned — no chips lost.**`,
      ].join('\n')).setImage(CASINO_IMAGE);
    } else if (win) {
      casinoDb.adjustBalance(uid, s.g, s.bet * 2);
      recordGame(uid, s.g, true, s.bet);
      emb = baseEmbed(guild).setTitle('✅ __**You Win!**__').setDescription([
        `**Your hand:** ${fmtHand(s.ph)} → **Total: ${pt}**`,
        `**Dealer:** ${fmtHand(s.dh)} → **Total: ${dt}${bust ? ' (bust)' : ''}**`,
        ``, `**+${fmt(s.bet)} chips earned**`,
      ].join('\n')).setImage(CASINO_IMAGE);
    } else {
      recordGame(uid, s.g, false, -s.bet);
      emb = baseEmbed(guild).setTitle('❌ __**You Lost**__').setDescription([
        `**Your hand:** ${fmtHand(s.ph)} → **Total: ${pt}**`,
        `**Dealer:** ${fmtHand(s.dh)} → **Total: ${dt}**`,
        ``, `**-${fmt(s.bet)} chips**`,
      ].join('\n')).setImage(CASINO_IMAGE);
    }
  }
  if (isInt) await ctx.update({ embeds: [emb], components: [] });
  else await ctx.reply({ embeds: [emb], components: [] });
}

async function handleBlackjack(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const args = message.content.trim().split(/\s+/);
  const u = message.author.id, g = message.guild.id;
  const { bet, error } = parseBet(args[1], casinoDb.getBalance(u, g));
  if (error) return message.reply({ embeds: [errEmbed(message.guild, error)] });
  if (bjSessions.has(u)) return message.reply({ embeds: [errEmbed(message.guild, 'You already have an active game. Finish it first.')] });
  const deck = buildDeck();
  const ph = [deck.pop(), deck.pop()], dh = [deck.pop(), deck.pop()];
  bjSessions.set(u, { deck, ph, dh, bet, g });
  casinoDb.adjustBalance(u, g, -bet!);
  if (handTotal(ph) === 21) return finishBJ(message, u, 'blackjack');
  await message.reply({ embeds: [bjGameEmbed(message.guild, bjSessions.get(u))], components: bjButtons(u, ph[0].r === ph[1].r, true) });
}

async function handleBjButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, uid: string | undefined;
  for (const a of ['hit', 'stand', 'double', 'split', 'surrender']) {
    if (id.startsWith(`bj_${a}_`)) { action = a; uid = id.slice(`bj_${a}_`.length); break; }
  }
  if (!action) return false;
  if (interaction.user.id !== uid) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your game.')], ephemeral: true }); return true; }
  const s = bjSessions.get(uid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'No active game. Start one with `?bj` or `?blackjack`.')], ephemeral: true }); return true; }

  if (action === 'surrender') return finishBJ(interaction, uid!, 'surrender').then(() => true);
  if (action === 'stand')     return finishBJ(interaction, uid!, 'stand').then(() => true);
  if (action === 'double') {
    if (casinoDb.getBalance(uid!, s.g) < s.bet) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Not enough chips to double down.')], ephemeral: true }); return true; }
    casinoDb.adjustBalance(uid!, s.g, -s.bet); s.bet *= 2;
    s.ph.push(s.deck.pop());
    if (handTotal(s.ph) > 21) return finishBJ(interaction, uid!, 'bust').then(() => true);
    return finishBJ(interaction, uid!, 'stand').then(() => true);
  }
  if (action === 'split') {
    if (s.ph[0].r !== s.ph[1].r) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'You can only split a pair.')], ephemeral: true }); return true; }
    if (casinoDb.getBalance(uid!, s.g) < s.bet) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Not enough chips to split.')], ephemeral: true }); return true; }
    casinoDb.adjustBalance(uid!, s.g, -s.bet); s.bet *= 2;
    s.ph = [s.ph[0], s.deck.pop()];
    if (handTotal(s.ph) === 21) return finishBJ(interaction, uid!, 'blackjack').then(() => true);
    await interaction.update({ embeds: [bjGameEmbed(interaction.guild, s, '🃏 __**Blackjack Update**__')], components: bjButtons(uid!, false, false) }); return true;
  }
  if (action === 'hit') {
    s.ph.push(s.deck.pop());
    const t = handTotal(s.ph);
    if (t > 21) return finishBJ(interaction, uid!, 'bust').then(() => true);
    if (t === 21) return finishBJ(interaction, uid!, 'stand').then(() => true);
    const drawn = s.ph[s.ph.length - 1];
    const emb = baseEmbed(interaction.guild).setTitle('🃏 __**Blackjack Update**__')
      .setDescription([`**You drew: ${drawn.r}${drawn.s}**`, ``, `**Your hand:** ${fmtHand(s.ph)} → **Total: ${t}**`, `**Dealer shows:** ${fmtHand(s.dh, true)}`].join('\n'))
      .setImage(CASINO_IMAGE);
    await interaction.update({ embeds: [emb], components: bjButtons(uid!, false, false) }); return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — SLOTS
// ─────────────────────────────────────────────────────────────────────────────
const slSessions = new Map<string, any>();
const SLOT_SYMS   = ['Cherry', 'Lemon', 'Orange', 'Grape', 'Diamond', 'Seven'];
const SLOT_DISP: Record<string, string>   = { Cherry: '🍒', Lemon: '🍋', Orange: '🍊', Grape: '🍇', Diamond: '💎', Seven: '7️⃣' };
const SLOT_W      = [30, 25, 20, 15, 7, 3];

function spinReels() {
  const reel = () => { const tot = SLOT_W.reduce((a, b) => a + b, 0); let r = Math.floor(Math.random() * tot); for (let i = 0; i < SLOT_SYMS.length; i++) { r -= SLOT_W[i]; if (r < 0) return SLOT_SYMS[i]; } return SLOT_SYMS[0]; };
  return [reel(), reel(), reel()];
}
function slotPayout(reels: string[]) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    if (a === 'Seven')   return { m: 10, label: '🎰 JACKPOT!' };
    if (a === 'Diamond') return { m: 5,  label: '💎 Big Win!' };
    return { m: 3, label: '✅ Three of a Kind!' };
  }
  if (a === b || b === c || a === c) return { m: 1, label: '**Two of a Kind — Bet Returned**' };
  return { m: 0, label: '❌ No Match' };
}
function fmtReels(r: string[]) { return `[ ${r.map((x) => SLOT_DISP[x]).join('  |  ')} ]`; }
function slotEmbed(guild: any, reels: string[], bet: number, m: number, label: string) {
  const net = bet * m - bet;
  const lines = [`**${fmtReels(reels)}**`, ``, `**${label}**`, m === 0 ? `**-${fmt(bet)} chips**` : net === 0 ? `**Bet returned**` : `**+${fmt(net)} chips**`];
  return baseEmbed(guild).setTitle('🎰 __**Slot Machine**__').setDescription(lines.join('\n')).setImage(CASINO_IMAGE);
}
function slButtons(sid: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sl_spin_${sid}`).setLabel('Spin Again').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sl_double_${sid}`).setLabel('Double Bet').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sl_cashout_${sid}`).setLabel('Cash Out').setStyle(ButtonStyle.Secondary),
  );
}

async function handleSlots(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const args = message.content.trim().split(/\s+/);
  const u = message.author.id, g = message.guild.id;
  const { bet, error } = parseBet(args[1], casinoDb.getBalance(u, g));
  if (error) return message.reply({ embeds: [errEmbed(message.guild, error)] });
  casinoDb.adjustBalance(u, g, -bet!);
  const reels = spinReels(); const { m, label } = slotPayout(reels);
  casinoDb.adjustBalance(u, g, bet! * m);
  recordGame(u, g, m > 0, m > 0 ? bet! * (m - 1) : -bet!);
  const sid = `${u}_${Date.now()}`;
  slSessions.set(sid, { userId: u, guildId: g, bet });
  const reply = await message.reply({ embeds: [slotEmbed(message.guild, reels, bet!, m, label)], components: [slButtons(sid)] });
  setTimeout(async () => { slSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 120_000);
}

async function handleSlButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['spin', 'double', 'cashout']) { if (id.startsWith(`sl_${a}_`)) { action = a; sid = id.slice(`sl_${a}_`.length); break; } }
  if (!action) return false;
  const s = slSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired. Start a new game with `?slots`.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your game.')], ephemeral: true }); return true; }
  if (action === 'cashout') {
    slSessions.delete(sid!);
    const bal = casinoDb.getBalance(s.userId, s.guildId);
    await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('💰 __**Cashed Out**__').setDescription(`**You walked away.**\n\n**Balance: ${fmt(bal)} chips**`)], components: [] }); return true;
  }
  if (action === 'double') {
    const bal = casinoDb.getBalance(s.userId, s.guildId);
    if (s.bet * 2 > bal) { await interaction.reply({ embeds: [errEmbed(interaction.guild, `Not enough chips to double. Balance: **${fmt(bal)}**`)], ephemeral: true }); return true; }
    s.bet *= 2;
  }
  casinoDb.adjustBalance(s.userId, s.guildId, -s.bet);
  const reels = spinReels(); const { m, label } = slotPayout(reels);
  casinoDb.adjustBalance(s.userId, s.guildId, s.bet * m);
  recordGame(s.userId, s.guildId, m > 0, m > 0 ? s.bet * (m - 1) : -s.bet);
  await interaction.update({ embeds: [slotEmbed(interaction.guild, reels, s.bet, m, label)], components: [slButtons(sid!)] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — DICE
// ─────────────────────────────────────────────────────────────────────────────
const dcSessions = new Map<string, any>();
function rollDie() { return Math.floor(Math.random() * 6) + 1; }
function diceEmbed(guild: any, chosen: number, rolled: number, bet: number) {
  const win = rolled === chosen;
  return baseEmbed(guild).setTitle('🎲 __**Dice Roll**__').setDescription([
    `**You chose: ${chosen}**`, ``, `**Rolled: ${rolled}**`, ``,
    win ? `**✅ Correct guess!**\n**+${fmt(bet * 4)} chips**` : `**❌ Wrong guess.**\n**-${fmt(bet)} chips**`,
  ].join('\n')).setImage(CASINO_IMAGE);
}
function dcButtons(sid: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dc_roll_${sid}`).setLabel('Roll Again').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dc_leave_${sid}`).setLabel('Leave Table').setStyle(ButtonStyle.Secondary),
  );
}

async function handleDice(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const args = message.content.trim().split(/\s+/);
  const u = message.author.id, g = message.guild.id;
  const { bet, error } = parseBet(args[1], casinoDb.getBalance(u, g));
  if (error) return message.reply({ embeds: [errEmbed(message.guild, error)] });
  const chosen = parseInt(args[2], 10);
  if (isNaN(chosen) || chosen < 1 || chosen > 6)
    return message.reply({ embeds: [errEmbed(message.guild, 'Choose a number between **1 and 6**.\nUsage: `?dice <bet> <number>`')] });
  casinoDb.adjustBalance(u, g, -bet!);
  const rolled = rollDie();
  if (rolled === chosen) casinoDb.adjustBalance(u, g, bet! * 5);
  recordGame(u, g, rolled === chosen, rolled === chosen ? bet! * 4 : -bet!);
  const sid = `${u}_${Date.now()}`;
  dcSessions.set(sid, { userId: u, guildId: g, bet, chosen });
  const reply = await message.reply({ embeds: [diceEmbed(message.guild, chosen, rolled, bet!)], components: [dcButtons(sid)] });
  setTimeout(async () => { dcSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 120_000);
}

async function handleDcButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['roll', 'leave']) { if (id.startsWith(`dc_${a}_`)) { action = a; sid = id.slice(`dc_${a}_`.length); break; } }
  if (!action) return false;
  const s = dcSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired. Start a new game with `?dice`.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your game.')], ephemeral: true }); return true; }
  if (action === 'leave') {
    dcSessions.delete(sid!);
    await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('🎲 __**Left the Table**__').setDescription(`**You walked away.**\n\n**Balance: ${fmt(casinoDb.getBalance(s.userId, s.guildId))} chips**`)], components: [] }); return true;
  }
  casinoDb.adjustBalance(s.userId, s.guildId, -s.bet);
  const rolled = rollDie();
  if (rolled === s.chosen) casinoDb.adjustBalance(s.userId, s.guildId, s.bet * 5);
  recordGame(s.userId, s.guildId, rolled === s.chosen, rolled === s.chosen ? s.bet * 4 : -s.bet);
  await interaction.update({ embeds: [diceEmbed(interaction.guild, s.chosen, rolled, s.bet)], components: [dcButtons(sid!)] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — COIN FLIP
// ─────────────────────────────────────────────────────────────────────────────
const cfSessions = new Map<string, any>();
function flipCoin() { return Math.random() < 0.5 ? 'Heads' : 'Tails'; }
function coinEmbed(guild: any, chosen: string, result: string, bet: number) {
  const win = result === chosen;
  return baseEmbed(guild).setTitle('🪙 __**Coin Flip**__').setDescription([
    `**You chose: ${chosen}**`, ``, `**Result: ${result}**`, ``,
    win ? `**✅ You Win!**\n**+${fmt(bet)} chips**` : `**❌ You Lose.**\n**-${fmt(bet)} chips**`,
  ].join('\n')).setImage(CASINO_IMAGE);
}
function cfButtons(sid: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cf_flip_${sid}`).setLabel('Flip Again').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`cf_exit_${sid}`).setLabel('Exit').setStyle(ButtonStyle.Secondary),
  );
}

async function handleCoin(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const args = message.content.trim().split(/\s+/);
  const u = message.author.id, g = message.guild.id;
  const { bet, error } = parseBet(args[1], casinoDb.getBalance(u, g));
  if (error) return message.reply({ embeds: [errEmbed(message.guild, error)] });
  const cr = (args[2] || '').toLowerCase();
  if (!['heads', 'tails'].includes(cr))
    return message.reply({ embeds: [errEmbed(message.guild, 'Choose **heads** or **tails**.\nUsage: `?coin <bet> heads/tails`')] });
  const chosen = cr[0].toUpperCase() + cr.slice(1);
  casinoDb.adjustBalance(u, g, -bet!);
  const result = flipCoin();
  if (result === chosen) casinoDb.adjustBalance(u, g, bet! * 2);
  recordGame(u, g, result === chosen, result === chosen ? bet! : -bet!);
  const sid = `${u}_${Date.now()}`;
  cfSessions.set(sid, { userId: u, guildId: g, bet, chosen });
  const reply = await message.reply({ embeds: [coinEmbed(message.guild, chosen, result, bet!)], components: [cfButtons(sid)] });
  setTimeout(async () => { cfSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 120_000);
}

async function handleCfButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['flip', 'exit']) { if (id.startsWith(`cf_${a}_`)) { action = a; sid = id.slice(`cf_${a}_`.length); break; } }
  if (!action) return false;
  const s = cfSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired. Start a new game with `?coin`.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your game.')], ephemeral: true }); return true; }
  if (action === 'exit') {
    cfSessions.delete(sid!);
    await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('🪙 __**Exited**__').setDescription(`**You left.**\n\n**Balance: ${fmt(casinoDb.getBalance(s.userId, s.guildId))} chips**`)], components: [] }); return true;
  }
  casinoDb.adjustBalance(s.userId, s.guildId, -s.bet);
  const result = flipCoin();
  if (result === s.chosen) casinoDb.adjustBalance(s.userId, s.guildId, s.bet * 2);
  recordGame(s.userId, s.guildId, result === s.chosen, result === s.chosen ? s.bet : -s.bet);
  await interaction.update({ embeds: [coinEmbed(interaction.guild, s.chosen, result, s.bet)], components: [cfButtons(sid!)] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — BALANCE
// ─────────────────────────────────────────────────────────────────────────────
async function handleBalance(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const bal = casinoDb.getBalance(message.author.id, message.guild.id);
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('💰 __**Wallet**__')
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setDescription([`**Player: ${message.author.username}**`, `**Chips: ${fmt(bal)}**`, ``, `**Rank: __${getRank(bal)}__**`].join('\n'))] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — DAILY
// ─────────────────────────────────────────────────────────────────────────────
const dlSessions = new Map<string, any>();
const DAILY_BASE = 1000, DAILY_STREAK_BONUS = 200, DAILY_CD = 86_400_000;

async function handleDaily(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const u = message.author.id, g = message.guild.id;
  const data = casinoDb.getCasinoData(u, g);
  const cd = cooldownCheck(data.lastDaily, DAILY_CD);
  if (cd.on) return message.reply({ embeds: [baseEmbed(message.guild).setTitle('🎁 __**Daily Reward**__').setDescription(`**Already claimed.**\n\n**Come back in: __${msToTime(cd.remaining)}__**\n**Streak: ${data.streak || 0} days**`)] });
  const withinStreak = Date.now() - (data.lastDaily || 0) < 172_800_000;
  const newStreak = withinStreak ? (data.streak || 0) + 1 : 1;
  const bonus = newStreak * DAILY_STREAK_BONUS;
  const reward = DAILY_BASE + bonus;
  const sid = `${u}_${Date.now()}`;
  dlSessions.set(sid, { userId: u, guildId: g, reward, newStreak, bonus });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`dl_claim_${sid}`).setLabel('Claim').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dl_streak_${sid}`).setLabel('Streak Info').setStyle(ButtonStyle.Secondary),
  );
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('🎁 __**Daily Reward**__').setDescription([
    `**Come back every day to claim your chips!**`, ``,
    `**🔥 Streak: __${newStreak} day${newStreak !== 1 ? 's' : ''}__**`,
    `**Reward: +${fmt(DAILY_BASE)} chips**`, `**Streak Bonus: +${fmt(bonus)} chips**`,
  ].join('\n'))], components: [row] });
}

async function handleDlButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['claim', 'streak']) { if (id.startsWith(`dl_${a}_`)) { action = a; sid = id.slice(`dl_${a}_`.length); break; } }
  if (!action) return false;
  const s = dlSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your reward.')], ephemeral: true }); return true; }
  if (action === 'streak') {
    await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle('🔥 __**Streak Info**__').setDescription([
      `**Current streak: __${s.newStreak} day${s.newStreak !== 1 ? 's' : ''}__**`, ``,
      `**Base daily: ${fmt(DAILY_BASE)} chips**`, `**Streak bonus: +${fmt(DAILY_STREAK_BONUS)} chips per day**`, ``,
      `**Keep claiming every 24 hours to grow your streak!**`,
    ].join('\n'))], ephemeral: true }); return true;
  }
  dlSessions.delete(sid!);
  casinoDb.adjustBalance(s.userId, s.guildId, s.reward);
  casinoDb.updateCasinoData(s.userId, s.guildId, { lastDaily: Date.now(), streak: s.newStreak });
  const newBal = casinoDb.getBalance(s.userId, s.guildId);
  await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('🎁 __**Daily Reward Claimed!**__').setDescription([
    `**+${fmt(s.reward)} chips added to your balance!**`, ``,
    `**🔥 Streak: __${s.newStreak} day${s.newStreak !== 1 ? 's' : ''}__**`,
    `**New balance: ${fmt(newBal)} chips**`,
  ].join('\n'))], components: [] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — WORK
// ─────────────────────────────────────────────────────────────────────────────
const wkSessions = new Map<string, any>();
const WORK_CD = 7_200_000;
const JOBS = [
  { id: 'dice',   label: 'Work Dice Job',   name: 'Dice Runner',     min: 300, max: 600 },
  { id: 'dealer', label: 'Work Dealer Job', name: 'Card Dealer',     min: 500, max: 800 },
  { id: 'slots',  label: 'Work Slots Job',  name: 'Slot Technician', min: 400, max: 700 },
];

async function handleWork(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const u = message.author.id, g = message.guild.id;
  const cd = cooldownCheck(casinoDb.getCasinoData(u, g).lastWork, WORK_CD);
  if (cd.on) return message.reply({ embeds: [baseEmbed(message.guild).setTitle('💼 __**Work Shift**__').setDescription(`**Still tired from last shift.**\n\n**Come back in: __${msToTime(cd.remaining)}__**`)] });
  const sid = `${u}_${Date.now()}`;
  wkSessions.set(sid, { userId: u, guildId: g });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...JOBS.map((j) => new ButtonBuilder().setCustomId(`wk_${j.id}_${sid}`).setLabel(j.label).setStyle(ButtonStyle.Secondary)),
    new ButtonBuilder().setCustomId(`wk_cancel_${sid}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('💼 __**Work Shift**__').setDescription([
    `**You are applying your casino skills...**`, ``, `**Available jobs:**`, ...JOBS.map((j) => `**• ${j.name}**`),
  ].join('\n'))], components: [row] });
}

async function handleWkButton(interaction: any) {
  const id = interaction.customId;
  if (!id.startsWith('wk_')) return false;
  const parts = id.split('_'), action = parts[1], sid = parts.slice(2).join('_');
  const s = wkSessions.get(sid);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your session.')], ephemeral: true }); return true; }
  wkSessions.delete(sid);
  if (action === 'cancel') { await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('💼 __**Work Shift**__').setDescription(`**You decided not to work.**`)], components: [] }); return true; }
  const job = JOBS.find((j) => j.id === action); if (!job) return false;
  const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
  casinoDb.adjustBalance(s.userId, s.guildId, earned);
  casinoDb.updateCasinoData(s.userId, s.guildId, { lastWork: Date.now() });
  await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('💼 __**Shift Complete!**__').setDescription([
    `**You worked as a __${job.name}__**`, ``, `**Shift completed successfully!**`, `**+${fmt(earned)} chips earned**`,
  ].join('\n'))], components: [] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — LUCK
// ─────────────────────────────────────────────────────────────────────────────
const lkSessions = new Map<string, any>();
const LUCK_CD = 3_600_000;
const LUCK_WINS_LIST  = [
  { a: 500,  msg: 'You found a casino tip jar' },
  { a: 800,  msg: 'A high roller left chips on the table' },
  { a: 1000, msg: 'You found a lucky chip on the floor' },
  { a: 1500, msg: 'The house made a payout error in your favor' },
  { a: 2000, msg: 'You won a surprise dealer bonus' },
];
const LUCK_LOSS_LIST  = [
  { a: 200, msg: 'You tripped and dropped some chips' },
  { a: 300, msg: 'You lost chips in the couch cushions' },
  { a: 500, msg: 'A pickpocket got you on the casino floor' },
  { a: 700, msg: 'You bought an overpriced casino drink' },
];

async function handleLuck(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const u = message.author.id, g = message.guild.id;
  const cd = cooldownCheck(casinoDb.getCasinoData(u, g).lastLuck, LUCK_CD);
  if (cd.on) return message.reply({ embeds: [baseEmbed(message.guild).setTitle('⭐ __**Luck Spin**__').setDescription(`**Luck hasn't recharged yet.**\n\n**Come back in: __${msToTime(cd.remaining)}__**`)] });
  const sid = `${u}_${Date.now()}`;
  lkSessions.set(sid, { userId: u, guildId: g });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`lk_spin_${sid}`).setLabel('Spin Luck').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`lk_back_${sid}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
  );
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('⭐ __**Luck Spin**__').setDescription(`**Testing your casino fortune...**\n\n**You may win or lose chips instantly.**`)], components: [row] });
}

async function handleLkButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['spin', 'back']) { if (id.startsWith(`lk_${a}_`)) { action = a; sid = id.slice(`lk_${a}_`.length); break; } }
  if (!action) return false;
  const s = lkSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your spin.')], ephemeral: true }); return true; }
  if (action === 'back') { lkSessions.delete(sid!); await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('⭐ __**Luck Spin**__').setDescription('**You walked away.**')], components: [] }); return true; }
  lkSessions.delete(sid!);
  casinoDb.updateCasinoData(s.userId, s.guildId, { lastLuck: Date.now() });
  if (Math.random() < 0.45) {
    const o = LUCK_WINS_LIST[Math.floor(Math.random() * LUCK_WINS_LIST.length)];
    casinoDb.adjustBalance(s.userId, s.guildId, o.a);
    await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('⭐ __**Lucky!**__').setDescription(`**${o.msg}**\n\n**+${fmt(o.a)} chips**`)], components: [] });
  } else {
    const o = LUCK_LOSS_LIST[Math.floor(Math.random() * LUCK_LOSS_LIST.length)];
    casinoDb.adjustBalance(s.userId, s.guildId, -o.a);
    await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('__**Bad Luck...**__').setDescription(`**${o.msg}**\n\n**-${fmt(o.a)} chips**`)], components: [] });
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — STREAK
// ─────────────────────────────────────────────────────────────────────────────
async function handleStreak(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const data = casinoDb.getCasinoData(message.author.id, message.guild.id);
  const streak = data.streak || 0;
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('🔥 __**Daily Streak**__').setDescription([
    `**Daily Streak: __${streak} day${streak !== 1 ? 's' : ''}__**`, ``,
    `**Next reward bonus: +${fmt((streak + 1) * DAILY_STREAK_BONUS)} chips**`,
    `**Keep playing daily to increase rewards!**`,
  ].join('\n'))] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — SCAM
// ─────────────────────────────────────────────────────────────────────────────
const scSessions = new Map<string, any>();
const SCAM_CD = 7_200_000;
const SCAM_OUTCOMES = [
  { w: 5,  a:  15000, title: '🎉 __**Successful Scheme!**__',  msg: 'You convinced a slot machine to "donate" chips.' },
  { w: 20, a:  2000,  title: '😏 __**Minor Success...**__',    msg: 'You sold fake "lucky casino air".' },
  { w: 50, a: -1500,  title: '🚨 __**Security Caught You**__', msg: 'Casino guards were NOT amused.' },
  { w: 25, a: -2000,  title: '💀 __**Full System Backfire**__',msg: 'You accidentally paid the casino instead of earning.' },
];
const TERMS = [
  '**Section 12.4b: By attempting this scam, you agree that any loss of chips is entirely your fault.**',
  '**Section 7.1: The casino reserves the right to laugh at you.**',
  '**Section 99: This document is legally meaningless. Good luck though.**',
];

async function handleScam(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const u = message.author.id, g = message.guild.id;
  const cd = cooldownCheck(casinoDb.getCasinoData(u, g).lastScam, SCAM_CD);
  if (cd.on) return message.reply({ embeds: [baseEmbed(message.guild).setTitle('🎭 __**Casino Side Hustle**__').setDescription(`**Security is still watching you.**\n\n**Lay low for: __${msToTime(cd.remaining)}__**`)] });
  const sid = `${u}_${Date.now()}`;
  scSessions.set(sid, { userId: u, guildId: g });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`sc_attempt_${sid}`).setLabel('Attempt Scam').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sc_run_${sid}`).setLabel('Run Away').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sc_terms_${sid}`).setLabel('Read Terms').setStyle(ButtonStyle.Secondary),
  );
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('🎭 __**Casino Side Hustle: "Totally Legit Scheme"**__').setDescription([
    `**You're about to try something VERY questionable in the casino backrooms...**`, ``,
    `**Risk Level: HIGH**`, `**Outcome: Unpredictable**`,
  ].join('\n'))], components: [row] });
}

async function handleScButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['attempt', 'run', 'terms']) { if (id.startsWith(`sc_${a}_`)) { action = a; sid = id.slice(`sc_${a}_`.length); break; } }
  if (!action) return false;
  const s = scSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your scheme.')], ephemeral: true }); return true; }
  if (action === 'terms') { await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle('📄 __**Terms & Conditions**__').setDescription(TERMS[Math.floor(Math.random() * TERMS.length)])], ephemeral: true }); return true; }
  if (action === 'run') { scSessions.delete(sid!); await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('🏃 __**Ran Away**__').setDescription('**Smart choice. The casino never saw you.**')], components: [] }); return true; }
  scSessions.delete(sid!);
  casinoDb.updateCasinoData(s.userId, s.guildId, { lastScam: Date.now() });
  const tot = SCAM_OUTCOMES.reduce((x, o) => x + o.w, 0);
  let roll = Math.floor(Math.random() * tot), outcome = SCAM_OUTCOMES[SCAM_OUTCOMES.length - 1];
  for (const o of SCAM_OUTCOMES) { roll -= o.w; if (roll < 0) { outcome = o; break; } }
  casinoDb.adjustBalance(s.userId, s.guildId, outcome.a);
  await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle(outcome.title).setDescription(`**${outcome.msg}**\n\n${outcome.a > 0 ? `**+${fmt(outcome.a)} chips**` : `**${fmt(outcome.a)} chips**`}`)], components: [] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — STATS
// ─────────────────────────────────────────────────────────────────────────────
async function handleStats(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const u = message.author.id, g = message.guild.id;
  const d: any = casinoDB[vaultKey(u, g)] || {};
  const bal      = casinoDb.getBalance(u, g);
  const played   = d.gamesPlayed || 0;
  const wins     = d.wins        || 0;
  const losses   = d.losses      || 0;
  const won      = d.chipsWon    || 0;
  const lost     = d.chipsLost   || 0;
  const net      = won - lost;
  const winRate  = played > 0 ? ((wins / played) * 100).toFixed(1) : '0.0';
  const emb = baseEmbed(message.guild)
    .setTitle('📊 __**Your Casino Stats**__')
    .setDescription([
      `**Player:** <@${u}>`,
      `**Rank:** ${getRank(bal)}`,
      ``,
      `**Games Played:** ${fmt(played)}`,
      `**Wins:** ${fmt(wins)}  |  **Losses:** ${fmt(losses)}  |  **Win Rate:** ${winRate}%`,
      ``,
      `**Chips Won:** +${fmt(won)}`,
      `**Chips Lost:** -${fmt(lost)}`,
      `**Net:** ${net >= 0 ? '+' : ''}${fmt(net)} chips`,
      ``,
      `**Current Balance:** ${fmt(bal)} chips`,
    ].join('\n'))
    .setImage(CASINO_IMAGE)
    .setFooter({ text: `Casino Table | ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) ?? undefined });
  await message.reply({ embeds: [emb] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — TOP
// ─────────────────────────────────────────────────────────────────────────────
const tpSessions = new Map<string, any>();

function buildTopEmbed(guild: any, entries: any[], page: number, totalPages: number, requesterId: string) {
  const slice = entries.slice(page * 10, page * 10 + 10);
  const lines = slice.map((e: any, i: number) => {
    const rank = page * 10 + i + 1;
    const medal = rank <= 3 ? MEDALS[rank - 1] : `**${rank}.**`;
    const you = e.userId === requesterId ? ' ← **you**' : '';
    return `${medal} <@${e.userId}> — **${fmt(e.balance)} chips** *(${getRank(e.balance)})*${you}`;
  });
  const ri = entries.findIndex((e: any) => e.userId === requesterId);
  const re = ri >= 0 ? entries[ri] : null;
  const footerExtra = re ? ` • Your rank: #${ri + 1} — ${fmt(re.balance)} chips` : '';
  return baseEmbed(guild)
    .setTitle('🏆 __**Casino Chip Leaderboard**__')
    .setDescription(lines.length > 0 ? lines.join('\n') : '**No players found.**')
    .setFooter({ text: `Casino Table | ${guild.name} • Page ${page + 1}/${totalPages}${footerExtra}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined });
}
function tpButtons(sid: string, page: number, total: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`tp_prev_${sid}`).setLabel('◀ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`tp_next_${sid}`).setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1),
  );
}

async function handleTop(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });
  const u = message.author.id, g = message.guild.id;
  const entries = casinoDb.getAllBalances(g);
  const total = Math.max(1, Math.ceil(entries.length / 10));
  const sid = `${u}_${Date.now()}`;
  tpSessions.set(sid, { userId: u, guildId: g, page: 0, total, entries });
  const emb = buildTopEmbed(message.guild, entries, 0, total, u);
  const reply = await message.reply({ embeds: [emb], components: total > 1 ? [tpButtons(sid, 0, total)] : [] });
  setTimeout(async () => { tpSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 120_000);
}

async function handleTpButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['prev', 'next']) { if (id.startsWith(`tp_${a}_`)) { action = a; sid = id.slice(`tp_${a}_`.length); break; } }
  if (!action) return false;
  const s = tpSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Session expired. Run `?top` again.')], ephemeral: true }); return true; }
  if (interaction.user.id !== s.userId) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This is not your session.')], ephemeral: true }); return true; }
  if (action === 'prev' && s.page > 0) s.page--;
  if (action === 'next' && s.page < s.total - 1) s.page++;
  await interaction.update({ embeds: [buildTopEmbed(interaction.guild, s.entries, s.page, s.total, s.userId)], components: [tpButtons(sid!, s.page, s.total)] }); return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — TRANSFER
// ─────────────────────────────────────────────────────────────────────────────
async function handleTransfer(message: any) {
  const deny = casinoAccess(message); if (deny === 'channel') return;
  if (deny === 'role') return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use casino commands.')] });

  const args = message.content.trim().split(/\s+/);
  const target = message.mentions.users.first();
  const amount = parseInt(args[2], 10);

  if (!target || isNaN(amount) || amount <= 0)
    return message.reply({ embeds: [errEmbed(message.guild, 'Usage: `?transfer @user <amount>`')] });
  if (target.id === message.author.id)
    return message.reply({ embeds: [errEmbed(message.guild, 'You can\'t transfer chips to yourself.')] });
  if (target.bot)
    return message.reply({ embeds: [errEmbed(message.guild, 'You can\'t transfer chips to a bot.')] });

  const u = message.author.id, g = message.guild.id;
  const senderBal = casinoDb.getBalance(u, g);
  if (amount > senderBal)
    return message.reply({ embeds: [errEmbed(message.guild, `Not enough chips. Your balance: **${fmt(senderBal)}**`)] });

  casinoDb.adjustBalance(u, g, -amount);
  casinoDb.adjustBalance(target.id, g, amount);
  const newSenderBal = casinoDb.getBalance(u, g);
  const newTargetBal = casinoDb.getBalance(target.id, g);

  await message.reply({ embeds: [baseEmbed(message.guild)
    .setTitle('💸 __**Chips Transferred**__')
    .setDescription([
      `**${message.author.username} → ${target.username}**`,
      ``,
      `**Amount: ${fmt(amount)} chips**`,
      ``,
      `**Your new balance: ${fmt(newSenderBal)} chips**`,
      `**${target.username}'s new balance: ${fmt(newTargetBal)} chips**`,
    ].join('\n'))] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CASINO — ADMIN
// ─────────────────────────────────────────────────────────────────────────────
async function handleMint(message: any) {
  if (message.author.id !== ADMIN_USER_ID) return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use this command.')] });
  const args = message.content.trim().split(/\s+/);
  const target = message.mentions.users.first(); const amount = parseInt(args[2], 10);
  if (!target || isNaN(amount) || amount <= 0) return message.reply({ embeds: [errEmbed(message.guild, 'Usage: `?mint @user <amount>`')] });
  casinoDb.adjustBalance(target.id, message.guild.id, amount);
  const newBal = casinoDb.getBalance(target.id, message.guild.id);
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('🪙 __**Chip Minted**__').setDescription([
    `**Admin Action: Mint Chips**`, ``, `**User: ${target}**`, `**Amount: +${fmt(amount)} chips**`,
    `**New Balance: ${fmt(newBal)} chips**`, ``, `**Reason: Owner issuance**`,
  ].join('\n'))] });
}

async function handleChipsRemove(message: any) {
  if (message.author.id !== ADMIN_USER_ID) return message.reply({ embeds: [errEmbed(message.guild, 'You don\'t have permission to use this command.')] });
  const args = message.content.trim().split(/\s+/);
  const target = message.mentions.users.first(); const amount = parseInt(args[2], 10);
  if (!target || isNaN(amount) || amount <= 0) return message.reply({ embeds: [errEmbed(message.guild, 'Usage: `?chipsremove @user <amount>`')] });
  casinoDb.adjustBalance(target.id, message.guild.id, -amount);
  const newBal = casinoDb.getBalance(target.id, message.guild.id);
  await message.reply({ embeds: [baseEmbed(message.guild).setTitle('🔧 __**Chips Removed**__').setDescription([
    `**Admin Action: Balance Adjustment**`, ``, `**User: ${target}**`, `**Amount Removed: -${fmt(amount)} chips**`,
    `**New Balance: ${fmt(newBal)} chips**`, ``, `**Reason: Casino administration action**`,
  ].join('\n'))] });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: REPORT CASE — ADD/REMOVE USER
// ─────────────────────────────────────────────────────────────────────────────
async function handleAddUser(message: any) {
  if (!message.member.roles.cache.has(VAULT_STAFF_ROLE_ID)) return;
  const vc = message.member.voice.channel;
  if (!vc || !caseChannels.has(vc.id))
    return message.reply({ embeds: [errEmbed(message.guild, 'You must be inside a case channel to use this.')] });

  const target = message.mentions.members.first();
  if (!target)
    return message.reply({ embeds: [errEmbed(message.guild, 'Please mention a user.\nUsage: `?adduser @user`')] });
  if (target.id === message.author.id)
    return message.reply({ embeds: [errEmbed(message.guild, 'You cannot add yourself.')] });

  try {
    await vc.permissionOverwrites.create(target.id, { allow: OWNER_PERMS });
  } catch (e) {
    return message.reply({ embeds: [errEmbed(message.guild, 'Failed to grant permissions. Check bot role hierarchy.')] });
  }

  const caseFooter = { text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) ?? undefined };
  const targetAvatar = target.user.displayAvatarURL({ dynamic: true });
  const confirmEmbed = baseEmbed(message.guild)
    .setTitle('✅ __**User Added to Case**__')
    .setDescription(`${target} has been granted access to **${vc.name}**.\nThey have been notified via DM.`)
    .setThumbnail(targetAvatar)
    .setFooter(caseFooter)
    .setTimestamp();
  await message.reply({ embeds: [confirmEmbed] });

  const dmEmbed = baseEmbed(message.guild)
    .setTitle('__**You Have Been Summoned to a Case**__')
    .setDescription([
      `${target}`,
      ``,
      `**You've been granted access to a private support case. Your presence has been specifically requested.**`,
      ``,
      `__**Details:**__`,
      `• __**Case ID:**__ **${vc.name}**`,
      `• __**Requested by:**__ **${message.member.displayName}**`,
      ``,
      `__**❗️ Action Required:**__`,
      `**Join the voice channel as soon as possible.**`,
      ``,
      `__**Notice:**__`,
      `**Failure to respond may delay the case resolution.**`,
    ].join('\n'))
    .setThumbnail(targetAvatar)
    .setFooter(caseFooter)
    .setTimestamp();

  try { await target.send({ embeds: [dmEmbed] }); } catch {}
}

async function handleRemoveUser(message: any) {
  if (!message.member.roles.cache.has(VAULT_STAFF_ROLE_ID)) return;
  const vc = message.member.voice.channel;
  if (!vc || !caseChannels.has(vc.id))
    return message.reply({ embeds: [errEmbed(message.guild, 'You must be inside a case channel to use this.')] });

  const target = message.mentions.members.first();
  if (!target)
    return message.reply({ embeds: [errEmbed(message.guild, 'Please mention a user.\nUsage: `?removeuser @user`')] });
  if (target.id === message.author.id)
    return message.reply({ embeds: [errEmbed(message.guild, 'You cannot remove yourself.')] });
  if (target.roles.cache.has(VAULT_STAFF_ROLE_ID))
    return message.reply({ embeds: [errEmbed(message.guild, 'You cannot remove a staff member.')] });
  const { ownerId } = caseChannels.get(vc.id)!;
  if (target.id === ownerId)
    return message.reply({ embeds: [errEmbed(message.guild, 'You cannot remove the case owner.')] });

  try {
    await vc.permissionOverwrites.delete(target.id);
  } catch (e) {
    return message.reply({ embeds: [errEmbed(message.guild, 'Failed to remove permissions. Check bot role hierarchy.')] });
  }

  if (target.voice.channelId === vc.id) {
    try { await target.voice.disconnect(); } catch {}
  }

  const caseFooter = { text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) ?? undefined };
  const targetAvatar = target.user.displayAvatarURL({ dynamic: true });

  const confirmEmbed = baseEmbed(message.guild)
    .setTitle('🚫 __**User Removed from Case**__')
    .setDescription(`${target} has been removed from **${vc.name}**.\nThey have been notified via DM.`)
    .setThumbnail(targetAvatar)
    .setFooter(caseFooter)
    .setTimestamp();
  await message.reply({ embeds: [confirmEmbed] });

  const dmEmbed = baseEmbed(message.guild)
    .setTitle('__**You Have Been Removed from a Case**__')
    .setDescription([
      `${target}`,
      ``,
      `**Your access to a private support case has been revoked.**`,
      ``,
      `__**Details:**__`,
      `• __**Case ID:**__ **${vc.name}**`,
      `• __**Removed by:**__ **${message.member.displayName}**`,
      ``,
      `__**Notice:**__`,
      `**You are no longer permitted to access this case channel.**`,
      `**If you believe this was a mistake, please contact a staff member.**`,
    ].join('\n'))
    .setThumbnail(targetAvatar)
    .setFooter(caseFooter)
    .setTimestamp();

  try { await target.send({ embeds: [dmEmbed] }); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 5: CLOSE CASE
// ─────────────────────────────────────────────────────────────────────────────
const ccSessions = new Map<string, any>();

async function handleCloseCase(message: any) {
  if (!message.member.roles.cache.has(VAULT_STAFF_ROLE_ID)) return;
  const vc = message.member.voice.channel;
  if (!vc || !caseChannels.has(vc.id))
    return message.reply({ embeds: [errEmbed(message.guild, 'You must be inside a case channel to use this.')] });

  const sid = `${message.author.id}_${Date.now()}`;
  ccSessions.set(sid, { channelId: vc.id, channelName: vc.name });
  const emb = baseEmbed(message.guild)
    .setTitle('🗑️ __**Close Case**__')
    .setDescription(`Are you sure you want to delete **${vc.name}**?\n\nThis will disconnect everyone and permanently delete the channel.`)
    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) ?? undefined })
    .setTimestamp();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cc_confirm_${sid}`).setLabel('Confirm Close').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`cc_cancel_${sid}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  const reply = await message.reply({ embeds: [emb], components: [row] });
  setTimeout(async () => { ccSessions.delete(sid); try { await reply.edit({ components: [] }); } catch {} }, 30_000);
}

async function handleCcButton(interaction: any) {
  const id = interaction.customId;
  let action: string | undefined, sid: string | undefined;
  for (const a of ['confirm', 'cancel']) { if (id.startsWith(`cc_${a}_`)) { action = a; sid = id.slice(`cc_${a}_`.length); break; } }
  if (!action) return false;
  if (!interaction.member.roles.cache.has(VAULT_STAFF_ROLE_ID)) {
    await interaction.reply({ embeds: [errEmbed(interaction.guild, 'Only staff can close cases.')], ephemeral: true }); return true;
  }
  const s = ccSessions.get(sid!);
  if (!s) { await interaction.reply({ embeds: [errEmbed(interaction.guild, 'This confirmation has expired.')], ephemeral: true }); return true; }
  ccSessions.delete(sid!);
  if (action === 'cancel') {
    await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('↩️ __**Cancelled**__').setDescription('Case close cancelled.')], components: [] }); return true;
  }
  const ch = interaction.guild.channels.cache.get(s.channelId);
  caseChannels.delete(s.channelId);
  await interaction.update({ embeds: [baseEmbed(interaction.guild).setTitle('🗑️ __**Case Closed**__').setDescription(`**${s.channelName}** has been deleted.`)], components: [] });
  if (ch) { try { await ch.delete(); } catch {} }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 6: GIVEAWAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const slashCommands = [
  new SlashCommandBuilder()
    .setName('givecreate')
    .setDescription('Create a new giveaway')
    .setDefaultMemberPermissions('0'),
  new SlashCommandBuilder()
    .setName('givereroll')
    .setDescription('Reroll the winner of a giveaway')
    .addStringOption(opt =>
      opt.setName('giveaway_id').setDescription('The giveaway message ID').setRequired(true)
    )
    .setDefaultMemberPermissions('0'),
  new SlashCommandBuilder()
    .setName('giveend')
    .setDescription('End a giveaway early')
    .addStringOption(opt =>
      opt.setName('giveaway_id').setDescription('The giveaway message ID').setRequired(true)
    )
    .setDefaultMemberPermissions('0'),
  new SlashCommandBuilder()
    .setName('givelist')
    .setDescription('List all active giveaways')
    .setDefaultMemberPermissions('0'),
].map(c => c.toJSON());

function hasGiveawayRole(member: any) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  if (!config.giveawayRoleId) return true;
  return member.roles.cache.has(config.giveawayRoleId);
}

function isAllowed(member: any) {
  if (!member) return false;
  if (member.permissions.has('Administrator')) return true;
  if (config.whitelistUsers.includes(member.id)) return true;
  return member.roles.cache.some((r: any) => config.whitelistRoles.includes(r.id));
}

function pickRandom(set: Set<any>, count: number) {
  return [...set].sort(() => Math.random() - 0.5).slice(0, count);
}

async function sendLog(channelId: string, emb: EmbedBuilder) {
  if (!channelId) return;
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch?.isTextBased()) await (ch as TextChannel).send({ embeds: [emb] });
  } catch (e: any) {
    console.error('Log send failed:', e.message);
  }
}

async function cacheInvites(guild: any) {
  try {
    const fetched = await guild.invites.fetch();
    const map = new Map();
    for (const inv of fetched.values()) {
      map.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id });
    }
    inviteCache.set(guild.id, map);
  } catch (e: any) {
    console.error(`Failed to cache invites for ${guild.name}:`, e.message);
  }
}

function getInviterTotalUses(guildId: string, inviterId: string) {
  const map = inviteCache.get(guildId) || new Map();
  let total = 0;
  for (const inv of map.values()) {
    if (inv.inviterId === inviterId) total += inv.uses || 0;
  }
  return total;
}

function getLeftCount(guildId: string, inviterId: string) {
  return leftCounts.get(`${guildId}:${inviterId}`) || 0;
}

async function updateMemberCount(guild: any) {
  const channelId = config.memberCounterChannelId;
  if (!channelId) return;
  try {
    await guild.members.fetch();
    const count   = guild.memberCount;
    const channel = await guild.channels.fetch(channelId);
    if (channel) {
      await channel.setName(`👥・Server Members : ${count}`);
    }
  } catch (e: any) {
    console.error('Failed to update member counter channel:', e.message);
  }
}

function tsLong(date: Date) {
  if (!date) return 'Unknown';
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

function buildGiveawayEmbed(g: any, guild: any = null) {
  let desc = `__**🎁 Giveaway Launched!**__\n\n`;
  desc += `__**Prize :**__ **${g.prize}**\n\n`;
  desc += `__**Hosted By :**__ **<@${g.hostedBy}>**\n\n`;
  desc += `__**Ends In :**__ **<t:${g.endTimestamp}:R>** (<t:${g.endTimestamp}:F>)\n\n`;
  desc += `__**How to Enter :**__\n**Click the 🎁 button below to participate.**\n\n`;
  if (g.requirements) {
    desc += `__**Requirements :**__\n**${g.requirements}**\n\n`;
  }
  desc += `__**🏆 Winner(s) :**__ **${g.winners}**\n\n`;
  desc += `__**🗳️ Entries :**__ **${g.entries.size}**\n\n`;
  desc += `__**Important :**__\n`;
  desc += `**• Winners without meeting the requirements will be rerolled.**`;

  const emb = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(desc)
    .setTimestamp();

  if (guild) {
    emb.setFooter({
      text:    `${guild.name} • 🍀 Good luck to everyone!`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined,
    });
  } else {
    emb.setFooter({ text: '🍀 Good luck to everyone!' });
  }

  return emb;
}

function buildWinnerEmbed(g: any, winnerIds: string[], guild: any) {
  const mentions     = winnerIds.map(id => `<@${id}>`).join(', ');
  const congrats     = winnerIds.map(id => `<@${id}>`).join(', ');

  let desc = `__**🏆 Giveaway Winner**__\n\n`;
  desc += `__**Prize :**__ **${g.prize}**\n`;
  desc += `__**Hosted By :**__ <@${g.hostedBy}>\n\n`;
  desc += `__**Winner(s) :**__ ${mentions}\n\n`;
  desc += `__**Entries :**__ **${g.entries.size} 🗳️**\n\n`;
  desc += `**Congratulations ${congrats}, you won!**\n\n`;
  desc += `__**Next Step :**__\n`;
  desc += `**• Contact the host in Dms.**\n`;
  desc += `**• Open a support ticket**\n\n`;
  desc += `__**Important :**__\n`;
  desc += `**• Failure to claim will result in reroll.**\n`;
  desc += `**• Winners must meet all requirements.**\n\n`;
  desc += `**Thanks to everyone who participated!**`;

  const emb = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(desc)
    .setTimestamp();

  if (guild) {
    emb.setFooter({
      text: guild.name,
      iconURL: guild.iconURL({ dynamic: true }) || undefined,
    });
  }

  return emb;
}

function buildEntryRow(messageId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`enter_${messageId}`)
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

async function endGiveaway(messageId: string, endedById: string | null = null) {
  const g = giveaways.get(messageId);
  if (!g || !g.active) return;
  g.active = false;

  let channel: any, guild: any;
  try {
    channel = await client.channels.fetch(g.channelId);
    guild   = channel.guild;
  } catch (e: any) {
    console.error('endGiveaway: failed to fetch channel:', e.message);
    return;
  }

  let gMsg: any;
  try {
    gMsg = await channel.messages.fetch(messageId);
  } catch (e: any) {
    console.error('endGiveaway: failed to fetch message:', e.message);
  }

  const disabledRow = buildEntryRow(messageId, true);
  const picked      = pickRandom(g.entries, g.winners);

  if (picked.length === 0) {
    let noWinDesc = `__**🎁 Giveaway Ended**__\n\n`;
    noWinDesc += `__**Prize :**__ **${g.prize}**\n`;
    noWinDesc += `__**Hosted By :**__ <@${g.hostedBy}>\n`;
    noWinDesc += `__**Entries :**__ **${g.entries.size}**\n`;
    if (endedById) noWinDesc += `__**Ended By :**__ <@${endedById}>\n`;
    noWinDesc += `\n**No valid entries — no winner this time.**`;

    const noWinEmbed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setDescription(noWinDesc)
      .setFooter({ text: guild?.name || '', iconURL: guild?.iconURL({ dynamic: true }) || undefined })
      .setTimestamp();

    if (gMsg) await gMsg.edit({ embeds: [noWinEmbed], components: [disabledRow] }).catch(() => {});
    await channel.send({ embeds: [noWinEmbed] });
    await sendLog(config.giveawayLogChannel, noWinEmbed);
    return;
  }

  const mentions = picked.map((id: string) => `<@${id}>`).join(', ');

  let endedDesc = `__**🎁 Giveaway Ended**__\n\n`;
  endedDesc += `__**Prize :**__ **${g.prize}**\n`;
  endedDesc += `__**Hosted By :**__ <@${g.hostedBy}>\n`;
  endedDesc += `__**Winner :**__ ${mentions}\n`;
  endedDesc += `__**Entries :**__ **${g.entries.size}**\n`;
  if (endedById) endedDesc += `__**Ended By :**__ <@${endedById}>`;

  const endedEmbed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(endedDesc)
    .setFooter({ text: guild?.name || '', iconURL: guild?.iconURL({ dynamic: true }) || undefined })
    .setTimestamp();

  if (gMsg) await gMsg.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => {});

  const winnerEmbed = buildWinnerEmbed(g, picked, guild);
  await channel.send({ content: mentions, embeds: [winnerEmbed] });
  await sendLog(config.giveawayLogChannel, winnerEmbed);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 3: CLAN EMBEDS & HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
function panelEmbed(guild: any) {
  const e = new EmbedBuilder()
    .setTitle("🏰 __Clan Management Panel__")
    .setDescription("**Manage your clan using the options below.**")
    .addFields(
      { name: "**➕ Add Member**", value: "**Add a user to your clan**\n*(Only Clan Leader & Co-Leader can use this)*\nRequires: Clan ID + User ID", inline: false },
      { name: "**➖ Kick Member**", value: "**Remove a user from your clan**\n*(Only Clan Leader & Co-Leader can use this)*\nRequires: Clan ID + User ID", inline: false },
    )
    .setImage(PANEL_IMAGE_URL).setColor(EMBED_COLOR).setTimestamp();
  if (guild) e.setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined });
  return e;
}

function joinEmbed(guild: any) {
  const e = new EmbedBuilder()
    .setTitle("🏰 __Clan Join Request__")
    .setDescription(
      "Welcome! You can create a ticket so you can request to join a clan within the server. Please provide the information below:\n\n" +
      "**__Required Information:__**\n• Your Discord Username\n• How active you are on Discord\n• Why do you want to join this clan?\n\n" +
      "**Once you've sent your answers, a clan leader or staff member will respond shortly.**"
    )
    .setImage(PANEL_IMAGE_URL).setColor(EMBED_COLOR).setTimestamp();
  if (guild) e.setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined });
  return e;
}

function ticketEmbed(requesterId: string, leaderId: string, coLeaderIds: string[], clanId: string) {
  return new EmbedBuilder()
    .setTitle("📝 __Clan Request Ticket__")
    .setDescription("**A new clan request has been created.**")
    .addFields(
      { name: "👤 **Requested by**", value: `<@${requesterId}>`, inline: false },
      { name: "🏰 **Clan Leader**", value: `<@${leaderId}>`, inline: false },
      { name: "🧑‍🤝‍🧑 **Co-Leader(s)**", value: coLeaderIds.length ? coLeaderIds.map(id => `<@${id}>`).join(", ") : "None", inline: false },
      { name: "🆔 **Clan ID**", value: clanId.toUpperCase(), inline: false },
    )
    .setColor(EMBED_COLOR).setTimestamp();
}

const panelRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId("add_member").setLabel("Add Member").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("kick_member").setLabel("Kick Member").setStyle(ButtonStyle.Secondary),
);
const joinRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId("join_request").setLabel("Join Request").setStyle(ButtonStyle.Secondary),
);
const closeRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Secondary),
);
const confirmRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId("close_ticket_confirm").setLabel("Yes, close it").setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId("close_ticket_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
);

async function onDeployPanel(i: any) {
  const clanId = i.options.getString("clan_id").toUpperCase();
  const clan = getClan(clanId);
  if (!clan) return i.reply({ content: `❌ No clan found with ID **${clanId}**. Register it first with \`/clan-setup\`.`, ephemeral: true });
  linkChannel(i.channelId, clanId);
  await i.channel.send({ embeds: [panelEmbed(i.guild)], components: [panelRow()] });
  await i.reply({ content: `✅ Panel deployed for **${clan.name}** (\`${clanId}\`).`, ephemeral: true });
}

async function onDeployJoinPanel(i: any) {
  await i.channel.send({ embeds: [joinEmbed(i.guild)], components: [joinRow()] });
  await i.reply({ content: "✅ Clan Join Request panel deployed.", ephemeral: true });
}

async function onClanSetup(i: any) {
  if (!i.guildId) return i.reply({ content: "❌ Use this inside a server.", ephemeral: true });
  const clanId = i.options.getString("clan_id").toUpperCase();
  const clanName = i.options.getString("clan_name");
  const leader = i.options.getUser("leader");
  const clanRole = i.options.getRole("clan_role");
  const coLeaderIds = ["co_leader1", "co_leader2", "co_leader3"].map((k: string) => i.options.getUser(k)).filter(Boolean).map((u: any) => u.id);
  upsertClan({ id: clanId, name: clanName, guildId: i.guildId, leaderId: leader.id, coLeaderIds, memberIds: [leader.id, ...coLeaderIds], roleId: clanRole?.id });
  await i.reply({
    content: `✅ Clan **${clanName}** (\`${clanId}\`) registered!\n👑 Leader: <@${leader.id}>\n` +
      (coLeaderIds.length ? `🧑‍🤝‍🧑 Co-Leaders: ${coLeaderIds.map((id: string) => `<@${id}>`).join(", ")}\n` : "") +
      (clanRole ? `🎖️ Role: <@&${clanRole.id}>` : "⚠️ No role set."),
    ephemeral: true,
  });
}

async function onAddMemberBtn(i: any) {
  const modal = new ModalBuilder().setCustomId("add_member_modal").setTitle("Add Member to Clan");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("clan_id").setLabel("Clan ID").setStyle(TextInputStyle.Short).setPlaceholder("e.g. ALPHA").setRequired(true).setMaxLength(50)),
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("user_id").setLabel("User ID").setStyle(TextInputStyle.Short).setPlaceholder("Enter the User's Discord ID").setRequired(true).setMaxLength(30)),
  );
  await i.showModal(modal);
}

async function onKickMemberBtn(i: any) {
  const modal = new ModalBuilder().setCustomId("kick_member_modal").setTitle("Kick Member from Clan");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("clan_id").setLabel("Clan ID").setStyle(TextInputStyle.Short).setPlaceholder("e.g. ALPHA").setRequired(true).setMaxLength(50)),
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("user_id").setLabel("User ID").setStyle(TextInputStyle.Short).setPlaceholder("Enter the User's Discord ID").setRequired(true).setMaxLength(30)),
  );
  await i.showModal(modal);
}

async function onJoinRequestBtn(i: any) {
  const modal = new ModalBuilder().setCustomId("join_request_modal").setTitle("Clan Join Request");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("clan_id").setLabel("Clan ID").setStyle(TextInputStyle.Short).setPlaceholder("Clan ID you want to join").setRequired(true).setMaxLength(50)),
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("username").setLabel("Your Discord Username").setStyle(TextInputStyle.Short).setPlaceholder("e.g. coolplayer123").setRequired(true).setMaxLength(100)),
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("activity").setLabel("How active are you on Discord?").setStyle(TextInputStyle.Short).setPlaceholder("e.g. Very active, online daily").setRequired(true).setMaxLength(200)),
    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Why do you want to join this clan?").setStyle(TextInputStyle.Paragraph).setPlaceholder("Tell us why you'd be a good fit...").setRequired(true).setMaxLength(500)),
  );
  await i.showModal(modal);
}

async function onAddMemberModal(i: any) {
  await i.deferReply({ ephemeral: true });
  const clanId = i.fields.getTextInputValue("clan_id").toUpperCase();
  const userId = i.fields.getTextInputValue("user_id").trim().replace(/[<@!>]/g, "");
  const clan = getClan(clanId);
  if (!clan) return i.editReply({ content: `❌ No clan found with ID **${clanId}**.` });
  if (!isLeaderOrCo(clan, i.user.id)) return i.editReply({ content: "❌ Only the Clan Leader or Co-Leader can add members." });
  addMember(clanId, userId);
  let note = "";
  if (clan.roleId && i.guild) {
    try { const m = await i.guild.members.fetch(userId); await m.roles.add(clan.roleId); note = ` and given the <@&${clan.roleId}> role`; }
    catch { note = " *(could not assign role — check bot permissions)*"; }
  }
  await i.editReply({ content: `✅ <@${userId}> has been added to **${clan.name}** (\`${clanId}\`)${note}.` });
}

async function onKickMemberModal(i: any) {
  await i.deferReply({ ephemeral: true });
  const clanId = i.fields.getTextInputValue("clan_id").toUpperCase();
  const userId = i.fields.getTextInputValue("user_id").trim().replace(/[<@!>]/g, "");
  const clan = getClan(clanId);
  if (!clan) return i.editReply({ content: `❌ No clan found with ID **${clanId}**.` });
  if (!isLeaderOrCo(clan, i.user.id)) return i.editReply({ content: "❌ Only the Clan Leader or Co-Leader can kick members." });
  if (clan.leaderId === userId) return i.editReply({ content: "❌ You cannot kick the Clan Leader." });
  kickMember(clanId, userId);
  let note = "";
  if (clan.roleId && i.guild) {
    try { const m = await i.guild.members.fetch(userId); await m.roles.remove(clan.roleId); note = ` and their <@&${clan.roleId}> role has been removed`; }
    catch { note = " *(could not remove role — check bot permissions)*"; }
  }
  await i.editReply({ content: `✅ <@${userId}> has been removed from **${clan.name}** (\`${clanId}\`)${note}.` });
}

async function onJoinRequestModal(i: any) {
  await i.deferReply({ ephemeral: true });
  const clanId = i.fields.getTextInputValue("clan_id").toUpperCase();
  const username = i.fields.getTextInputValue("username");
  const activity = i.fields.getTextInputValue("activity");
  const reason = i.fields.getTextInputValue("reason");
  const clan = getClan(clanId);
  if (!clan) return i.editReply({ content: `❌ No clan found with ID **${clanId}**.` });
  if (!i.guild) return i.editReply({ content: "❌ This can only be used inside a server." });
  try {
    const overwrites = [
      { id: i.guild.roles.everyone.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
      { id: i.user.id, type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: clan.leaderId, type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...clan.coLeaderIds.map((id: string) => ({ id, type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
    ];
    const ch = await i.guild.channels.create({
      name: `request-${i.user.username}-${clanId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 100),
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: overwrites,
    });
    await ch.send({
      content: `<@${i.user.id}> <@${clan.leaderId}>${clan.coLeaderIds.length ? " " + clan.coLeaderIds.map((id: string) => `<@${id}>`).join(" ") : ""}`,
      embeds: [ticketEmbed(i.user.id, clan.leaderId, clan.coLeaderIds, clanId)],
      components: [closeRow()],
    });
    await ch.send({ content: `**📋 Application Details**\n**Discord Username:** ${username}\n**Activity:** ${activity}\n**Reason:** ${reason}` });
    await i.editReply({ content: `✅ Your request has been submitted! Ticket: <#${ch.id}>` });
  } catch (err) {
    console.error(err);
    await i.editReply({ content: "❌ Failed to create your ticket. Make sure the bot has Manage Channels permission in the ticket category." });
  }
}

async function onCloseTicket(i: any) {
  await i.reply({ content: "⚠️ Are you sure you want to close and delete this ticket?", components: [confirmRow()], ephemeral: true });
}

async function onCloseConfirm(i: any) {
  if (!i.channel) return i.reply({ content: "❌ Could not find the channel.", ephemeral: true });
  await i.reply({ content: "🔒 Closing ticket...", ephemeral: true });
  try {
    await i.channel.send("🔒 **Ticket closed. This channel will be deleted.**");
    await new Promise(r => setTimeout(r, 3000));
    await i.channel.delete("Closed by " + i.user.tag);
  } catch (err) { console.error(err); }
}

async function onCloseCancel(i: any) {
  await i.reply({ content: "✅ Ticket close cancelled.", ephemeral: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 3: CLAN SLASH COMMANDS
// ─────────────────────────────────────────────────────────────────────────────
const clanCommands = [
  new SlashCommandBuilder().setName("deploy-panel").setDescription("Deploy the Clan Management Panel to this channel")
    .addStringOption((o: any) => o.setName("clan_id").setDescription("Clan ID to link with this channel").setRequired(true))
    .setDefaultMemberPermissions("0"),
  new SlashCommandBuilder().setName("deploy-join-panel").setDescription("Deploy the Clan Join Request panel to this channel")
    .setDefaultMemberPermissions("0"),
  new SlashCommandBuilder().setName("clan-setup").setDescription("Register or update a clan")
    .addStringOption((o: any) => o.setName("clan_id").setDescription("Unique Clan ID (e.g. ALPHA)").setRequired(true))
    .addStringOption((o: any) => o.setName("clan_name").setDescription("Display name of the clan").setRequired(true))
    .addUserOption((o: any) => o.setName("leader").setDescription("The Clan Leader").setRequired(true))
    .addRoleOption((o: any) => o.setName("clan_role").setDescription("Role to assign when a member is added").setRequired(true))
    .addUserOption((o: any) => o.setName("co_leader1").setDescription("Co-Leader #1 (optional)"))
    .addUserOption((o: any) => o.setName("co_leader2").setDescription("Co-Leader #2 (optional)"))
    .addUserOption((o: any) => o.setName("co_leader3").setDescription("Co-Leader #3 (optional)"))
    .setDefaultMemberPermissions("0"),
].map(c => c.toJSON());

async function registerClanCommands(appId: string, guildId: string, guildName: string) {
  const rest = new REST().setToken(DISCORD_BOT_TOKEN!);
  try {
    const existing: any = await rest.get(Routes.applicationGuildCommands(appId, guildId));
    const merged = [...slashCommands, ...clanCommands];
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: merged });
    console.log(`Commands registered for: ${guildName}`);
  } catch (err: any) { console.error(`Failed for ${guildName}:`, err.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: EMBED HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function footerData(guild: Guild) {
  const now = new Date();
  const time = now.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    text: `${guild.name} | ${time}`,
    iconURL: guild.iconURL() ?? undefined,
  };
}

function buildSelfRoleEmbed(guild: Guild) {
  const description = [
    "__**🧩 Choose Your Roles :**__",
    "",
    "**・Use the buttons below to explore different categories and customize your profile.**",
    "",
    "__**🎮 Games :**__",
    "**Select the games you enjoy playing.**",
    "",
    "__**❤️ Relationship Status :**__",
    "**Pick the option that best represents you.**",
    "",
    "__**🎂 Age :**__",
    "**Choose your age group.**",
  ].join("\n");

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setFooter(footerData(guild));
}

function buildSelfRoleButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_games")
      .setLabel("🎮 Games")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_relationship")
      .setLabel("❤️ Relationship Status")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_age")
      .setLabel("🎂 Age")
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildVerificationRoomEmbed(guild: Guild) {
  const description = [
    "__**🔐 Verification in Progress**__",
    "",
    "**Welcome! You are currently waiting to be verified by our staff team.**",
    "",
    "**Please be patient! a staff member will join you shortly to complete the process.**",
    "**Make sure to stay in this voice channel.**",
    "",
    "**If it's taking too long, you can use the button below to notify staff.**",
    "",
    "__**Thank you for your patience 🤝**__",
  ].join("\n");

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setFooter(footerData(guild));
}

function buildPingStaffButton(userId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ping_staff:${userId}`)
      .setLabel("Ping Staff")
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildMaxPingsEmbed(guild: Guild) {
  const description = [
    "__**⚠️ Maximum Pings Reached**__",
    "",
    "**You have used all your available staff pings.**",
    "",
    "**Please wait patiently! a staff member will be with you as soon as possible.**",
    "",
    "**Avoid leaving the channel to keep your place in queue.**",
  ].join("\n");

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setFooter(footerData(guild));
}

function buildStaffPingEmbed(guild: Guild) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription("**Someone is waiting for verification**")
    .setFooter(footerData(guild));
}

function buildVerifiedDmEmbed(guild: Guild, member: GuildMember) {
  const description = [
    "__**✅ Verification Complete**__",
    "",
    "**You have been successfully verified!**",
    "",
    "**You now have full access to the server.**",
    "**Feel free to explore, chat, and enjoy your stay.**",
    "",
    "**If you need any help, don't hesitate to contact the staff team.**",
    "",
    "__**Welcome To BangzZ Community.**__",
  ].join("\n");

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .setFooter(footerData(guild));
}

function buildConfirmEmbed(description: string) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: SELECT MENU BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
function buildGamesMenuF1() {
  const options = Object.entries(GAMES_ROLES_F1).map(([name]) =>
    new StringSelectMenuOptionBuilder().setLabel(name).setValue(name),
  );
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_games")
    .setPlaceholder("Select the games you play...")
    .setMinValues(0)
    .setMaxValues(options.length)
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildRelationshipMenuF1() {
  const options = Object.entries(RELATIONSHIP_ROLES_F1).map(([name]) =>
    new StringSelectMenuOptionBuilder().setLabel(name).setValue(name),
  );
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_relationship")
    .setPlaceholder("Pick your relationship status...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildAgeMenuF1() {
  const options = Object.entries(AGE_ROLES_F1).map(([name]) =>
    new StringSelectMenuOptionBuilder().setLabel(name).setValue(name),
  );
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_age")
    .setPlaceholder("Choose your age group...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: CLEANUP HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function cleanupUserVerification(userId: string) {
  const channelId = verificationTempChannels.get(userId);
  if (channelId) {
    try {
      const ch = await client.channels.fetch(channelId).catch(() => null);
      if (ch) await (ch as any).delete().catch(() => {});
    } catch {}
    verificationTempChannels.delete(userId);
  }
  pingCounts.delete(userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: REPLY AND DELETE HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function replyAndDelete(
  message: Message,
  options: Parameters<Message["reply"]>[0],
  delayMs = 5000,
) {
  const reply = await message.reply(options);
  setTimeout(() => reply.delete().catch(() => {}), delayMs);
  setTimeout(() => message.delete().catch(() => {}), delayMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FILE: VC CONTROL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function buildControlEmbed(
  channelName: string,
  ownerTag: string,
  ownerAvatarUrl: string | null,
  isLocked: boolean,
  members: string[],
  ownerId: string
) {
  const emb = new EmbedBuilder()
    .setTitle(channelName)
    .setColor(0x203236)
    .addFields(
      {
        name: "Status",
        value: isLocked ? "🔒 Locked" : "🔓 Unlocked",
        inline: false,
      },
      {
        name: "Connected Members",
        value: members.length > 0 ? members.map((m) => `<@${m}>`).join("\n") : "*No one*",
        inline: false,
      }
    )
    .setFooter({ text: "You can manage your channel by using the buttons below." });
  if (ownerAvatarUrl) {
    emb.setThumbnail(ownerAvatarUrl);
  }
  return emb;
}

function buildControlRow(isLocked: boolean) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("vc_rename")
      .setLabel("Rename")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vc_limit")
      .setLabel("Set Limit")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(isLocked ? "vc_unlock" : "vc_lock")
      .setLabel(isLocked ? "Unlock" : "Lock")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vc_claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("vc_trust")
      .setLabel("Trust User")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("vc_kick")
      .setLabel("Kick User")
      .setStyle(ButtonStyle.Danger)
  );
  return [row1, row2];
}

async function sendOrUpdateControlMessage(channel: VoiceChannel, ownerId: string) {
  const info = tempChannels.get(channel.id);
  if (!info) return;

  const isLocked = channel.permissionOverwrites.cache.some(
    (o) => o.id === channel.guild.id && o.deny.has(PermissionFlagsBits.Connect)
  );

  const memberIds = channel.members.map((m) => m.id);
  let ownerTag = "Unknown";
  let ownerAvatarUrl: string | null = null;
  try {
    const owner = await channel.guild.members.fetch(ownerId);
    ownerTag = owner.displayName;
    ownerAvatarUrl = owner.displayAvatarURL({ size: 128 });
  } catch {}

  const emb = buildControlEmbed(channel.name, ownerTag, ownerAvatarUrl, isLocked, memberIds, ownerId);
  const rows = buildControlRow(isLocked);

  const textChannel = channel as unknown as TextChannel;
  try {
    const messages = await textChannel.messages.fetch({ limit: 10 });
    const existing = messages.find(
      (m) => m.author.id === client.user!.id && m.embeds.length > 0
    );
    if (existing) {
      await existing.edit({ embeds: [emb], components: rows });
    } else {
      await textChannel.send({ embeds: [emb], components: rows });
    }
  } catch {
    try {
      await textChannel.send({ embeds: [emb], components: rows });
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FILE: NICKNAME HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function setMemberEmoji(member: GuildMember, emoji: string | null) {
  try {
    const displayName = member.displayName;
    const cleanName = displayName.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, "").trim();
    const newNick = emoji ? `${emoji} ${cleanName}` : (cleanName === member.user.username ? null : cleanName);
    await member.setNickname(newNick);
  } catch {
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FILE: PERMANENT VC
// ─────────────────────────────────────────────────────────────────────────────
async function joinPermanentVC() {
  try {
    const channel = await client.channels.fetch(PERMANENT_VC_ID);
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    const connection = joinVoiceChannel({
      channelId: PERMANENT_VC_ID,
      guildId: (channel as any).guild.id,
      adapterCreator: (channel as any).guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
        setTimeout(joinPermanentVC, 3_000);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      setTimeout(joinPermanentVC, 3_000);
    });

    console.log(`Joined permanent VC: ${PERMANENT_VC_ID}`);
  } catch (err) {
    console.error("Failed to join permanent VC, retrying in 5s:", err);
    setTimeout(joinPermanentVC, 5_000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 2: TV TEMP VOICE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getRoomByOwner(ownerId: string) {
  for (const room of tempRooms.values()) {
    if (room.ownerId === ownerId) return room;
  }
  return undefined;
}

function buildTVEmbed(room: any, guild: any) {
  const voiceChannel = guild.channels.cache.get(room.voiceChannelId);
  const channelName  = voiceChannel?.name ?? room.emoji;

  const statusLine = room.locked ? "🔒 Locked" : "🔓 Unlocked";
  const limitLine  = room.userLimit > 0
    ? `\nLimit: ${voiceChannel?.members?.filter((m: any) => !m.user.bot).size ?? 0} / ${room.userLimit}`
    : "";

  const connected = voiceChannel
    ? [...voiceChannel.members.values()].filter((m: any) => !m.user.bot)
    : [];

  let memberLines = connected.map((m: any) => `<@${m.id}>`);
  let memberValue = memberLines.join("\n");
  if (memberValue.length > 950) {
    const truncated: string[] = [];
    let len = 0;
    for (let i = 0; i < memberLines.length; i++) {
      const line = memberLines[i] + "\n";
      if (len + line.length > 920) {
        truncated.push(`+ ${memberLines.length - i} more`);
        break;
      }
      truncated.push(memberLines[i]);
      len += line.length;
    }
    memberValue = truncated.join("\n");
  }
  if (!memberValue) memberValue = "*No one connected*";

  const owner    = guild.members.cache.get(room.ownerId);
  const avatarUrl = owner?.displayAvatarURL({ size: 256 }) ?? null;

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(channelName)
    .setThumbnail(avatarUrl)
    .addFields(
      { name: "Status",            value: statusLine + limitLine, inline: false },
      { name: "Connected Members", value: memberValue,            inline: false },
    )
    .setDescription("You can manage your channel by using the buttons below.");
}

function buildTVComponents() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("tv_rename").setLabel("Rename").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("tv_limit") .setLabel("Set Limit").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("tv_lock")  .setLabel("Lock").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("tv_unlock").setLabel("Unlock").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("tv_claim") .setLabel("Claim").setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("tv_trust")  .setLabel("Trust User").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("tv_untrust").setLabel("Untrust User").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("tv_kick")   .setLabel("Kick User").setStyle(ButtonStyle.Danger),
  );
  return [row1, row2];
}

async function sendOrUpdateTVPanel(room: any, guild: any) {
  const voiceChannel = guild.channels.cache.get(room.voiceChannelId);
  if (!voiceChannel) return;

  const emb      = buildTVEmbed(room, guild);
  const components = buildTVComponents();

  if (room.panelMessageId) {
    try {
      const existing = await voiceChannel.messages.fetch(room.panelMessageId).catch(() => null);
      if (existing) {
        await existing.edit({ embeds: [emb], components });
        return;
      }
    } catch {}
  }

  try {
    const msg = await voiceChannel.send({ embeds: [emb], components });
    room.panelMessageId = msg.id;
  } catch (err: any) {
    console.error("Failed to send panel:", err.message);
  }
}

async function createTempRoom(member: any, clientRef: Client) {
  if (member.user.bot) return;
  if (!member.roles.cache.has(ALLOWED_ROLE_ID)) return;

  const now         = Date.now();
  const lastCreated = cooldowns.get(member.id) ?? 0;
  if (now - lastCreated < CREATION_COOLDOWN_MS) return;
  cooldowns.set(member.id, now);

  if (getRoomByOwner(member.id)) return;

  const generatorChannel = member.guild.channels.cache.get(GENERATOR_CHANNEL_ID);
  const categoryId       = generatorChannel?.parentId ?? null;
  const position         = generatorChannel ? (generatorChannel.rawPosition ?? 0) + 1 : undefined;

  const emoji = randomRoomEmoji();
  const name  = `${emoji} ・ ${member.displayName}`;

  try {
    const vc = await member.guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: categoryId,
      position,
      userLimit: 0,
      permissionOverwrites: [
        {
          id: member.guild.roles.everyone.id,
          deny: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: ALLOWED_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.UseVAD,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.UseSoundboard,
            PermissionFlagsBits.UseApplicationCommands,
            PermissionFlagsBits.UseEmbeddedActivities,
          ],
          deny: [
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.ManageChannels,
          ],
        },
        {
          id: clientRef.user!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.UseVAD,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.UseSoundboard,
            PermissionFlagsBits.UseApplicationCommands,
            PermissionFlagsBits.UseEmbeddedActivities,
          ],
        },
      ],
    });

    await member.voice.setChannel(vc).catch(() => {});

    const room = {
      voiceChannelId: vc.id,
      ownerId: member.id,
      panelMessageId: null,
      locked: false,
      trustedUsers: new Set<string>(),
      userLimit: 0,
      emoji,
      guildId: member.guild.id,
    };
    tempRooms.set(vc.id, room);

    await sendOrUpdateTVPanel(room, member.guild);
    console.log(`[+] Room created: ${name} (${vc.id}) for ${member.user.tag}`);
  } catch (err: any) {
    console.error("Failed to create room:", err.message);
  }
}

async function deleteTempRoom(voiceChannelId: string, guild: any) {
  const room = tempRooms.get(voiceChannelId);
  if (!room) return;
  tempRooms.delete(voiceChannelId);
  const ch = guild.channels.cache.get(voiceChannelId);
  if (ch) {
    await ch.delete().catch((err: any) => console.error("Failed to delete room:", err.message));
    console.log(`[-] Room deleted: ${voiceChannelId}`);
  }
}

async function onTVVoiceStateUpdate(oldState: any, newState: any) {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  if (newState.channelId === GENERATOR_CHANNEL_ID) {
    await createTempRoom(member, client);
    return;
  }

  const leftId   = oldState.channelId;
  const joinedId = newState.channelId;

  if (leftId) {
    const room = tempRooms.get(leftId);
    if (room) {
      const vc        = oldState.guild.channels.cache.get(leftId);
      const remaining = vc?.members.filter((m: any) => !m.user.bot) ?? new Map();

      if (remaining.size === 0) {
        await deleteTempRoom(leftId, oldState.guild);
        return;
      }

      if (room.ownerId === member.id) {
        const next = remaining.first();
        if (next) {
          room.ownerId       = next.id;
          room.panelMessageId = null;
          await sendOrUpdateTVPanel(room, oldState.guild);
          console.log(`[~] Auto-claim: ${next.user.tag} is now owner of ${leftId}`);
        }
      } else {
        await sendOrUpdateTVPanel(room, oldState.guild);
      }
    }
  }

  if (joinedId && joinedId !== GENERATOR_CHANNEL_ID) {
    const room = tempRooms.get(joinedId);
    if (room) await sendOrUpdateTVPanel(room, newState.guild);
  }
}

async function cleanupGhosts(clientRef: Client) {
  const emojiPattern = /^(🐡|🍄|🍓|🍋|🥝|👻|🐻|🍰|🧸|🐯|🐙|🦕|🌴|🍄‍🟫|🌼|🌺|🔥)/u;
  for (const guild of clientRef.guilds.cache.values()) {
    const gen = guild.channels.cache.get(GENERATOR_CHANNEL_ID);
    if (!gen) continue;
    const catId = (gen as any).parentId;
    for (const ch of guild.channels.cache.values()) {
      if (ch.type !== ChannelType.GuildVoice) continue;
      if (ch.id === GENERATOR_CHANNEL_ID) continue;
      if (catId && (ch as any).parentId !== catId) continue;
      if (!emojiPattern.test(ch.name)) continue;
      const humans = (ch as VoiceChannel).members.filter((m: GuildMember) => !m.user.bot);
      if (humans.size === 0) {
        await ch.delete("Ghost cleanup on restart").catch(() => {});
        console.log(`[cleanup] Deleted ghost room: ${ch.name}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 4: JTC TEMP VOICE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function buildJTCPanelEmbed(guild: any, channel: any, state: any) {
  const owner = await guild.members.fetch(state.ownerId).catch(() => null);
  const voiceMembers = channel.members;

  const memberMentions = voiceMembers.size
    ? [...voiceMembers.values()].map((m: any) => `<@${m.id}>`).join('\n')
    : 'No members';

  const limitDisplay = state.userLimit
    ? `${voiceMembers.size}/${state.userLimit}`
    : '♾️';

  const trustedCount = state.locked ? state.trusted.size : 0;

  const emb = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('🎙️ **__Voice Control Panel__**')
    .setDescription(
      `**Welcome to your temp voice! You can manage your channel by using the buttons below.**\n\n` +
      `⭐️ **Owner:** <@${state.ownerId}>\n` +
      `${state.locked ? '🔒' : '🔓'} **Status:** ${state.locked ? 'Locked' : 'Unlocked'}\n` +
      `👥 **Connected members:**\n${memberMentions}\n` +
      `**🖇️ User Limit:** ${limitDisplay}\n` +
      `🫂 **Trusted:** ${trustedCount}`
    )
    .setThumbnail(owner ? owner.user.displayAvatarURL({ dynamic: true }) : null)
    .setFooter({
      text: `${guild.name} |`,
      iconURL: guild.iconURL({ dynamic: true }),
    })
    .setTimestamp();

  return emb;
}

function buildJTCPanelButtons() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('vc_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_trust').setLabel('Trust User').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_untrust').setLabel('Untrust User').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_kick').setLabel('Kick User').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('vc_disconnect').setLabel('Disconnect User').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_claim').setLabel('Claim Channel').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_rename').setLabel('Rename Channel').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vc_delete').setLabel('Delete Channel').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2];
}

async function sendOrUpdateJTCPanel(channel: any, guild: any, state: any) {
  const emb = await buildJTCPanelEmbed(guild, channel, state);
  const components = buildJTCPanelButtons();

  if (state.panelMessageId) {
    try {
      const msg = await channel.messages.fetch(state.panelMessageId);
      await msg.edit({ embeds: [emb], components });
      return;
    } catch {
      state.panelMessageId = null;
    }
  }

  const msg = await channel.send({ embeds: [emb], components });
  state.panelMessageId = msg.id;
}

async function safeReply(interaction: any, description: string) {
  const emb = new EmbedBuilder().setColor(EMBED_COLOR).setDescription(description);
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [emb], components: [] });
    } else {
      await interaction.reply({ embeds: [emb], components: [], ephemeral: true });
    }
  } catch (err) {
    console.error('safeReply error:', err);
  }
}

async function applyChannelPermissions(channel: any, guild: any, state: any) {
  const memberPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.Stream,
    PermissionFlagsBits.UseSoundboard,
    PermissionFlagsBits.UseExternalSounds,
    PermissionFlagsBits.UseVAD,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.UseApplicationCommands,
    PermissionFlagsBits.UseEmbeddedActivities,
  ];

  const permOverwrites: any[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
    },
    {
      id: state.ownerId,
      allow: memberPerms,
    },
    state.locked
      ? {
          id: ALLOWED_ROLE_ID,
          allow: memberPerms.filter((p: any) => p !== PermissionFlagsBits.Connect),
          deny: [PermissionFlagsBits.Connect],
        }
      : {
          id: ALLOWED_ROLE_ID,
          allow: memberPerms,
        },
  ];

  for (const userId of state.trusted) {
    if (userId === state.ownerId) continue;
    permOverwrites.push({ id: userId, allow: memberPerms });
  }

  for (const userId of state.kicked) {
    permOverwrites.push({
      id: userId,
      deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
    });
  }

  await channel.permissionOverwrites.set(permOverwrites).catch(console.error);
}

async function handleJTCModalSubmit(interaction: any) {
  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  const member       = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    await safeReply(interaction, '❌ You are not in a voice channel.');
    return;
  }

  const state = jtcTempChannels.get(voiceChannel.id);
  if (!state) {
    await safeReply(interaction, '❌ This is not a managed temp voice channel.');
    return;
  }

  if (interaction.user.id !== state.ownerId) {
    await safeReply(interaction, '❌ Only the channel owner can use these controls.');
    return;
  }

  const guild   = interaction.guild;
  const modalId = interaction.customId;

  if (modalId === 'modal_rename') {
    const rawName   = interaction.fields.getTextInputValue('new_name');
    const cleanName = stripEmojis(rawName) || rawName;
    const emoji     = randomJtcEmoji();
    const newName   = `${emoji}・${cleanName}`;

    await voiceChannel.setName(newName).catch(console.error);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, `✅ Channel renamed to **${newName}**.`);
    return;
  }

  if (modalId === 'modal_trust') {
    const raw    = interaction.fields.getTextInputValue('user_input');
    const userId = parseUserIdVC(raw);
    if (!userId) { await safeReply(interaction, '❌ Could not parse a valid user ID.'); return; }
    if (userId === state.ownerId) { await safeReply(interaction, '❌ You are already the owner.'); return; }

    state.trusted.add(userId);
    state.kicked.delete(userId);
    await applyChannelPermissions(voiceChannel, guild, state);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, `✅ <@${userId}> is now **trusted** and can join even if the channel is locked.`);
    return;
  }

  if (modalId === 'modal_untrust') {
    const raw    = interaction.fields.getTextInputValue('user_input');
    const userId = parseUserIdVC(raw);
    if (!userId) { await safeReply(interaction, '❌ Could not parse a valid user ID.'); return; }

    state.trusted.delete(userId);
    await applyChannelPermissions(voiceChannel, guild, state);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, `✅ <@${userId}> has been **untrusted**.`);
    return;
  }

  if (modalId === 'modal_kick') {
    const raw    = interaction.fields.getTextInputValue('user_input');
    const userId = parseUserIdVC(raw);
    if (!userId) { await safeReply(interaction, '❌ Could not parse a valid user ID.'); return; }
    if (userId === state.ownerId) { await safeReply(interaction, '❌ You cannot kick yourself.'); return; }

    state.kicked.add(userId);
    state.trusted.delete(userId);

    const targetMember = voiceChannel.members.get(userId);
    if (targetMember) {
      await targetMember.voice.disconnect('Kicked from temp voice channel').catch(() => {});
    }

    await applyChannelPermissions(voiceChannel, guild, state);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, `✅ <@${userId}> has been **kicked** and cannot rejoin.`);
    return;
  }

  if (modalId === 'modal_disconnect') {
    const raw    = interaction.fields.getTextInputValue('user_input');
    const userId = parseUserIdVC(raw);
    if (!userId) { await safeReply(interaction, '❌ Could not parse a valid user ID.'); return; }
    if (userId === state.ownerId) { await safeReply(interaction, '❌ You cannot disconnect yourself.'); return; }

    const targetMember = voiceChannel.members.get(userId);
    if (!targetMember) {
      await safeReply(interaction, '❌ That user is not currently in your voice channel.');
      return;
    }

    await targetMember.voice.disconnect('Disconnected by channel owner').catch(() => {});
    await safeReply(interaction, `✅ <@${userId}> has been **disconnected** but can still rejoin.`);
    return;
  }
}

async function handleVCButton(interaction: any) {
  const customId = interaction.customId;
  const member  = interaction.member;
  const guild   = interaction.guild;

  const voiceChannel = member.voice?.channel;

  if (MODAL_BUTTONS.has(customId)) {
    if (!voiceChannel) {
      await interaction.reply({ content: '', embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('❌ You are not in a voice channel.')], ephemeral: true }).catch(() => {});
      return;
    }
    const state = jtcTempChannels.get(voiceChannel.id);
    if (!state) {
      await interaction.reply({ content: '', embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('❌ This is not a managed temp voice channel.')], ephemeral: true }).catch(() => {});
      return;
    }
    if (interaction.user.id !== state.ownerId) {
      await interaction.reply({ content: '', embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription('❌ Only the channel owner can use these controls.')], ephemeral: true }).catch(() => {});
      return;
    }

    if (customId === 'vc_trust')      return interaction.showModal(makeUserModal('modal_trust',      'Trust a User')).catch(console.error);
    if (customId === 'vc_untrust')    return interaction.showModal(makeUserModal('modal_untrust',    'Untrust a User')).catch(console.error);
    if (customId === 'vc_kick')       return interaction.showModal(makeUserModal('modal_kick',       'Kick a User')).catch(console.error);
    if (customId === 'vc_disconnect') return interaction.showModal(makeUserModal('modal_disconnect', 'Disconnect a User')).catch(console.error);
    if (customId === 'vc_rename') {
      const modal = new ModalBuilder()
        .setCustomId('modal_rename')
        .setTitle('Rename Your Channel')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('new_name')
              .setLabel('New display name (no emojis needed)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. Gaming Night')
              .setRequired(true)
              .setMaxLength(90)
          )
        );
      return interaction.showModal(modal).catch(console.error);
    }
  }

  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  if (!voiceChannel) {
    await safeReply(interaction, '❌ You are not in a voice channel.');
    return;
  }

  const state = jtcTempChannels.get(voiceChannel.id);
  if (!state) {
    await safeReply(interaction, '❌ This is not a managed temp voice channel.');
    return;
  }

  const isOwner = interaction.user.id === state.ownerId;

  if (customId === 'vc_claim') {
    if (isOwner) {
      await safeReply(interaction, '❌ You are already the owner of this channel.');
      return;
    }
    if (voiceChannel.members.has(state.ownerId)) {
      await safeReply(interaction, '❌ The owner is still in the channel. You can only claim when they have left.');
      return;
    }

    state.ownerId = interaction.user.id;
    await applyChannelPermissions(voiceChannel, guild, state);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, '✅ You have claimed ownership of this channel.');
    return;
  }

  if (!isOwner) {
    await safeReply(interaction, '❌ Only the channel owner can use these controls.');
    return;
  }

  if (customId === 'vc_lock') {
    state.locked = true;
    await applyChannelPermissions(voiceChannel, guild, state);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, '🔒 Channel has been **locked**.');
    return;
  }

  if (customId === 'vc_unlock') {
    state.locked = false;
    await applyChannelPermissions(voiceChannel, guild, state);
    await sendOrUpdateJTCPanel(voiceChannel, guild, state);
    await safeReply(interaction, '🔓 Channel has been **unlocked**.');
    return;
  }

  if (customId === 'vc_delete') {
    await safeReply(interaction, '🗑️ Deleting channel...');
    jtcTempChannels.delete(voiceChannel.id);
    await voiceChannel.delete('Owner deleted the temp channel').catch(() => {});
    return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 2: TV BUTTON HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleTVButton(interaction: any) {
  const { customId } = interaction;
  const member       = interaction.member;
  const userId       = member.id;
  const guild        = interaction.guild;

  let room = member.voice.channelId ? tempRooms.get(member.voice.channelId) : undefined;
  if (!room) room = getRoomByOwner(userId);

  if (!room) {
    return interaction.reply({ content: "You don't have an active temp room.", ephemeral: true });
  }
  if (room.ownerId !== userId) {
    return interaction.reply({ content: "Only the room owner can do that.", ephemeral: true });
  }

  const vc = guild.channels.cache.get(room.voiceChannelId);
  if (!vc) {
    return interaction.reply({ content: "Your room no longer exists.", ephemeral: true });
  }

  if (customId === "tv_rename") {
    return interaction.showModal(
      new ModalBuilder()
        .setCustomId("tv_rename_modal")
        .setTitle("Rename Your Room")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("tv_new_name")
              .setLabel("New room name")
              .setStyle(TextInputStyle.Short)
              .setValue(vc.name)
              .setMinLength(1)
              .setMaxLength(50)
              .setRequired(true)
          )
        )
    );
  }

  if (customId === "tv_limit") {
    return interaction.showModal(
      new ModalBuilder()
        .setCustomId("tv_limit_modal")
        .setTitle("Set User Limit")
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("tv_limit_value")
              .setLabel("User limit (0 = unlimited, max 99)")
              .setStyle(TextInputStyle.Short)
              .setValue(String(room.userLimit))
              .setMinLength(1)
              .setMaxLength(2)
              .setRequired(true)
          )
        )
    );
  }

  await interaction.deferUpdate();

  switch (customId) {
    case "tv_lock": {
      room.locked = true;
      await vc.permissionOverwrites.edit(ALLOWED_ROLE_ID, { Connect: false });
      await vc.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
      await sendOrUpdateTVPanel(room, guild);
      break;
    }
    case "tv_unlock": {
      room.locked = false;
      await vc.permissionOverwrites.edit(ALLOWED_ROLE_ID, { Connect: true });
      await vc.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: null });
      await sendOrUpdateTVPanel(room, guild);
      break;
    }
    case "tv_claim": {
      if (room.ownerId === userId) {
        return interaction.followUp({ content: "You already own this room.", ephemeral: true });
      }
      if (vc.members.has(room.ownerId)) {
        return interaction.followUp({ content: "The owner is still in the room.", ephemeral: true });
      }
      room.ownerId       = userId;
      room.panelMessageId = null;
      await sendOrUpdateTVPanel(room, guild);
      break;
    }
    case "tv_trust": {
      const others = vc.members.filter((m: any) => !m.user.bot && m.id !== userId);
      if (others.size === 0) return interaction.followUp({ content: "No other members to trust.", ephemeral: true });
      const select = new StringSelectMenuBuilder()
        .setCustomId("tv_trust_select")
        .setPlaceholder("Select a member to trust")
        .addOptions(others.map((m: any) => new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(m.id)));
      return interaction.followUp({ content: "Select a member:", components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)], ephemeral: true });
    }
    case "tv_untrust": {
      if (room.trustedUsers.size === 0) return interaction.followUp({ content: "No trusted users.", ephemeral: true });
      const opts: StringSelectMenuOptionBuilder[] = [];
      for (const uid of room.trustedUsers) {
        const m = guild.members.cache.get(uid);
        if (m) opts.push(new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(uid));
      }
      if (!opts.length) return interaction.followUp({ content: "No trusted users found.", ephemeral: true });
      const select = new StringSelectMenuBuilder()
        .setCustomId("tv_untrust_select")
        .setPlaceholder("Select a member to untrust")
        .addOptions(opts);
      return interaction.followUp({ content: "Select a member:", components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)], ephemeral: true });
    }
    case "tv_kick": {
      const others = vc.members.filter((m: any) => !m.user.bot && m.id !== userId);
      if (others.size === 0) return interaction.followUp({ content: "No members to kick.", ephemeral: true });
      const select = new StringSelectMenuBuilder()
        .setCustomId("tv_kick_select")
        .setPlaceholder("Select a member to kick")
        .addOptions(others.map((m: any) => new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(m.id)));
      return interaction.followUp({ content: "Select a member:", components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)], ephemeral: true });
    }
  }
}

async function handleTVSelectMenu(interaction: any) {
  const { customId, values } = interaction;
  const member = interaction.member;
  const userId = member.id;
  const guild  = interaction.guild;

  await interaction.deferUpdate();

  let room = member.voice.channelId ? tempRooms.get(member.voice.channelId) : undefined;
  if (!room) room = getRoomByOwner(userId);
  if (!room || room.ownerId !== userId) {
    return interaction.editReply({ content: "Action no longer valid.", components: [] });
  }

  const vc       = guild.channels.cache.get(room.voiceChannelId);
  const targetId = values[0];

  switch (customId) {
    case "tv_trust_select": {
      room.trustedUsers.add(targetId);
      await vc?.permissionOverwrites.edit(targetId, {
        Connect: true, ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
        Speak: true, Stream: true, UseVAD: true, UseSoundboard: true,
        UseApplicationCommands: true, UseEmbeddedActivities: true,
        AttachFiles: false, EmbedLinks: false,
      });
      return interaction.editReply({ content: `✅ Trusted <@${targetId}>.`, components: [] });
    }
    case "tv_untrust_select": {
      room.trustedUsers.delete(targetId);
      await vc?.permissionOverwrites.delete(targetId).catch(() => {});
      return interaction.editReply({ content: `✅ Removed trust from <@${targetId}>.`, components: [] });
    }
    case "tv_kick_select": {
      const target = vc?.members.get(targetId);
      if (!target) return interaction.editReply({ content: "That member is no longer in the room.", components: [] });
      await target.voice.disconnect("Kicked from temp room").catch(() => {});
      return interaction.editReply({ content: `✅ Kicked <@${targetId}>.`, components: [] });
    }
  }
}

async function handleTVModal(interaction: any) {
  const { customId } = interaction;
  const member = interaction.member;
  const userId = member.id;
  const guild  = interaction.guild;

  await interaction.deferUpdate();

  let room = member.voice.channelId ? tempRooms.get(member.voice.channelId) : undefined;
  if (!room) room = getRoomByOwner(userId);
  if (!room || room.ownerId !== userId) {
    return interaction.followUp({ content: "Action no longer valid.", ephemeral: true });
  }

  const vc = guild.channels.cache.get(room.voiceChannelId);
  if (!vc) return;

  switch (customId) {
    case "tv_rename_modal": {
      const rawName = interaction.fields.getTextInputValue("tv_new_name").trim();
      if (!rawName) return;
      await vc.setName(`${room.emoji} ・ ${rawName}`).catch((err: any) => console.error("Rename failed:", err.message));
      await sendOrUpdateTVPanel(room, guild);
      break;
    }
    case "tv_limit_modal": {
      const limit = parseInt(interaction.fields.getTextInputValue("tv_limit_value").trim(), 10);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        return interaction.followUp({ content: "Invalid limit. Use 0–99.", ephemeral: true });
      }
      room.userLimit = limit;
      await vc.setUserLimit(limit).catch((err: any) => console.error("Set limit failed:", err.message));
      await sendOrUpdateTVPanel(room, guild);
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FILE: BUTTON HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleButton(interaction: ButtonInteraction) {
  const channel = interaction.channel as VoiceChannel | null;
  if (!channel) {
    await interaction.reply({ content: "Could not find the voice channel.", ephemeral: true });
    return;
  }

  const info = tempChannels.get(channel.id);
  if (!info) {
    await interaction.reply({ content: "This is not a managed temp channel.", ephemeral: true });
    return;
  }

  const isOwner = interaction.user.id === info.ownerId;

  const membersInChannel = channel.members?.has(interaction.user.id);
  if (!membersInChannel) {
    await interaction.reply({ content: "You must be in this voice channel to use these controls.", ephemeral: true });
    return;
  }

  switch (interaction.customId) {
    case "vc_rename": {
      if (!isOwner) {
        await interaction.reply({ content: "Only the channel owner can rename it.", ephemeral: true });
        return;
      }
      const modal = new ModalBuilder()
        .setCustomId("modal_rename")
        .setTitle("Rename Channel");
      const input = new TextInputBuilder()
        .setCustomId("new_name")
        .setLabel("New channel name")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(50)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
      break;
    }
    case "vc_limit": {
      if (!isOwner) {
        await interaction.reply({ content: "Only the channel owner can set the limit.", ephemeral: true });
        return;
      }
      const modal = new ModalBuilder()
        .setCustomId("modal_limit")
        .setTitle("Set User Limit");
      const input = new TextInputBuilder()
        .setCustomId("limit_value")
        .setLabel("User limit (0 = unlimited, max 99)")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
      break;
    }
    case "vc_lock": {
      if (!isOwner) {
        await interaction.reply({ content: "Only the channel owner can lock it.", ephemeral: true });
        return;
      }
      try {
        await channel.permissionOverwrites.edit(channel.guild.id, {
          Connect: false,
        });
        await interaction.deferUpdate();
        await sendOrUpdateControlMessage(channel, info.ownerId);
      } catch {
        await interaction.reply({ content: "Failed to lock the channel.", ephemeral: true });
      }
      break;
    }
    case "vc_unlock": {
      if (!isOwner) {
        await interaction.reply({ content: "Only the channel owner can unlock it.", ephemeral: true });
        return;
      }
      try {
        await channel.permissionOverwrites.edit(channel.guild.id, {
          Connect: true,
        });
        await interaction.deferUpdate();
        await sendOrUpdateControlMessage(channel, info.ownerId);
      } catch {
        await interaction.reply({ content: "Failed to unlock the channel.", ephemeral: true });
      }
      break;
    }
    case "vc_claim": {
      if (info.ownerId === interaction.user.id) {
        await interaction.reply({ content: "You already own this channel.", ephemeral: true });
        return;
      }
      const ownerInChannel = channel.members.has(info.ownerId);
      if (ownerInChannel) {
        await interaction.reply({ content: "The owner is still in the channel.", ephemeral: true });
        return;
      }
      tempChannels.set(channel.id, { ...info, ownerId: interaction.user.id });
      await interaction.deferUpdate();
      await sendOrUpdateControlMessage(channel, interaction.user.id);
      break;
    }
    case "vc_trust": {
      if (!isOwner) {
        await interaction.reply({ content: "Only the channel owner can trust users.", ephemeral: true });
        return;
      }
      const modal = new ModalBuilder()
        .setCustomId("modal_trust")
        .setTitle("Trust a User");
      const input = new TextInputBuilder()
        .setCustomId("user_id")
        .setLabel("User ID to trust")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
      break;
    }
    case "vc_kick": {
      if (!isOwner) {
        await interaction.reply({ content: "Only the channel owner can kick users.", ephemeral: true });
        return;
      }
      const modal = new ModalBuilder()
        .setCustomId("modal_kick")
        .setTitle("Kick a User");
      const input = new TextInputBuilder()
        .setCustomId("user_id")
        .setLabel("User ID to kick from VC")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FILE: MODAL HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleModal(interaction: ModalSubmitInteraction) {
  const channel = interaction.channel as VoiceChannel | null;
  if (!channel) {
    await interaction.reply({ content: "Channel not found.", ephemeral: true });
    return;
  }
  const info = tempChannels.get(channel.id);
  if (!info) {
    await interaction.reply({ content: "Not a managed channel.", ephemeral: true });
    return;
  }

  switch (interaction.customId) {
    case "modal_rename": {
      const rawName = interaction.fields.getTextInputValue("new_name").trim();
      const newName = `${info.emoji} ・ ${rawName}`;
      try {
        await channel.setName(newName);
        await interaction.deferUpdate();
        await sendOrUpdateControlMessage(channel, info.ownerId);
      } catch {
        await interaction.reply({ content: "Failed to rename the channel.", ephemeral: true });
      }
      break;
    }
    case "modal_limit": {
      const raw = interaction.fields.getTextInputValue("limit_value").trim();
      const limit = parseInt(raw, 10);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.reply({ content: "Please enter a number between 0 and 99.", ephemeral: true });
        return;
      }
      try {
        await channel.setUserLimit(limit);
        await interaction.deferUpdate();
        await sendOrUpdateControlMessage(channel, info.ownerId);
      } catch {
        await interaction.reply({ content: "Failed to set the limit.", ephemeral: true });
      }
      break;
    }
    case "modal_trust": {
      const userId = interaction.fields.getTextInputValue("user_id").trim();
      try {
        const target = await channel.guild.members.fetch(userId);
        await channel.permissionOverwrites.edit(target.id, {
          Connect: true,
          ViewChannel: true,
        });
        await interaction.reply({ content: `<@${target.id}> can now join the channel.`, ephemeral: true });
      } catch {
        await interaction.reply({ content: "Could not find that user. Make sure you entered a valid User ID.", ephemeral: true });
      }
      break;
    }
    case "modal_kick": {
      const userId = interaction.fields.getTextInputValue("user_id").trim();
      try {
        const target = channel.members.get(userId);
        if (!target) {
          await interaction.reply({ content: "That user is not in the voice channel.", ephemeral: true });
          return;
        }
        await target.voice.disconnect();
        await interaction.reply({ content: `<@${userId}> has been disconnected.`, ephemeral: true });
        setTimeout(async () => {
          await sendOrUpdateControlMessage(channel, info.ownerId);
        }, 500);
      } catch {
        await interaction.reply({ content: "Failed to kick the user.", ephemeral: true });
      }
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE 6: SELF-ROLE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
function buildMainEmbed(guild: any) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "**__🧩 Choose Your Roles :__**",
        "",
        "**・Use the buttons below to explore different categories and customize your profile.**",
        "",
        "**__🎮 Games :__**",
        "**Select the games you enjoy playing.**",
        "",
        "**__❤️ Relationship Status :__**",
        "**Pick the option that best represents you.**",
        "",
        "**__🎂 Age :__**",
        "**Choose your age group.**",
      ].join("\n"),
    )
    .setTimestamp()
    .setFooter({
      text: guild.name,
      iconURL: guild.iconURL() ?? undefined,
    });
}

function buildMainButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("btn_games").setLabel("🎮 Games").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_relationship").setLabel("❤️ Relationship Status").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_age").setLabel("🎂 Age").setStyle(ButtonStyle.Secondary),
  );
}

function buildGamesMenuF6() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("select_games")
    .setPlaceholder("Select the games you play...")
    .setMinValues(1)
    .setMaxValues(GAMES_ROLES.length)
    .addOptions(GAMES_ROLES.map((r) => new StringSelectMenuOptionBuilder().setLabel(r.label).setValue(r.value)));
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildRelationshipMenuF6() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("select_relationship")
    .setPlaceholder("Select your relationship status...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(RELATIONSHIP_ROLES.map((r) => new StringSelectMenuOptionBuilder().setLabel(r.label).setValue(r.value)));
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

function buildAgeMenuF6() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("select_age")
    .setPlaceholder("Select your age group...")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(AGE_ROLES.map((r) => new StringSelectMenuOptionBuilder().setLabel(r.label).setValue(r.value)));
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

async function handleSelectGames(interaction: any) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const member = interaction.member;
  if (!member) { await interaction.editReply("Could not find your server profile."); return; }

  const allGameRoleIds = GAMES_ROLES.map((r) => r.roleId);
  const selectedValues = interaction.values;
  const selectedRoles = GAMES_ROLES.filter((r) => selectedValues.includes(r.value));
  const selectedRoleIds = selectedRoles.map((r) => r.roleId);

  const rolesToRemove = allGameRoleIds.filter((id) => !selectedRoleIds.includes(id) && member.roles.cache.has(id));
  const rolesToAdd = selectedRoleIds.filter((id) => !member.roles.cache.has(id));

  for (const id of rolesToRemove) await member.roles.remove(id).catch(() => null);
  for (const id of rolesToAdd) await member.roles.add(id).catch(() => null);

  const selectedNames = selectedRoles.map((r) => r.label).join(", ");
  const emb = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(`✅ **Your role has been updated**\n\n🎮 Games: **${selectedNames}**`)
    .setTimestamp();

  await interaction.editReply({ embeds: [emb] });
}

async function handleSelectRelationship(interaction: any) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const member = interaction.member;
  if (!member) { await interaction.editReply("Could not find your server profile."); return; }

  const selected = RELATIONSHIP_ROLES.find((r) => r.value === interaction.values[0]);
  if (!selected) { await interaction.editReply("Invalid selection."); return; }

  for (const r of RELATIONSHIP_ROLES) {
    if (member.roles.cache.has(r.roleId)) await member.roles.remove(r.roleId).catch(() => null);
  }
  await member.roles.add(selected.roleId).catch(() => null);

  const emb = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(`✅ **Your role has been updated**\n\n❤️ Relationship Status: **${selected.label}**`)
    .setTimestamp();

  await interaction.editReply({ embeds: [emb] });
}

async function handleSelectAge(interaction: any) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const member = interaction.member;
  if (!member) { await interaction.editReply("Could not find your server profile."); return; }

  const selected = AGE_ROLES.find((r) => r.value === interaction.values[0]);
  if (!selected) { await interaction.editReply("Invalid selection."); return; }

  for (const r of AGE_ROLES) {
    if (member.roles.cache.has(r.roleId)) await member.roles.remove(r.roleId).catch(() => null);
  }
  await member.roles.add(selected.roleId).catch(() => null);

  const emb = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(`✅ **Your role has been updated**\n\n🎂 Age: **${selected.label}**`)
    .setTimestamp();

  await interaction.editReply({ embeds: [emb] });
}

async function sendRoleMessage(clientRef: Client) {
  const channel = await clientRef.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !(channel as any).isTextBased()) {
    console.error("Could not find target channel:", CHANNEL_ID);
    return;
  }
  const emb = buildMainEmbed((channel as any).guild);
  const buttons = buildMainButtons();
  await (channel as TextChannel).send({ embeds: [emb], components: [buttons] });
  console.log("Role selection message sent to channel", CHANNEL_ID);
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE CLIENT — ALL INTENTS MERGED
// ─────────────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ─────────────────────────────────────────────────────────────────────────────
// READY EVENTS
// ─────────────────────────────────────────────────────────────────────────────

// Main file ready
client.once("clientReady", (c) => {
  console.log(`Bot ready: ${c.user.tag}`);
  joinPermanentVC();
});

// File 1 ready: post/update self-role message
client.once("clientReady", async () => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);

  try {
    const channel = (await client.channels.fetch(SELF_ROLE_CHANNEL_ID)) as TextChannel;
    if (!channel?.isTextBased()) {
      console.error("[Bot] Self-role channel not found or not text-based");
      return;
    }

    const guild = channel.guild;
    const emb = buildSelfRoleEmbed(guild);
    const buttons = buildSelfRoleButtons();
    const state = loadState();

    if (state.messageId) {
      try {
        const existing = await channel.messages.fetch(state.messageId);
        if (existing?.author.id === client.user?.id) {
          await existing.edit({ embeds: [emb], components: [buttons] });
          console.log("[Bot] Self-role message updated.");
          return;
        }
      } catch {
        console.log("[Bot] Stored message gone, sending fresh.");
      }
    }

    const msg = await channel.send({ embeds: [emb], components: [buttons] });
    saveState({ messageId: msg.id });
    console.log(`[Bot] Self-role message sent (ID: ${msg.id})`);
  } catch (err) {
    console.error("[Bot] Error in clientReady:", err);
  }
});

// File 2 ready: cleanup ghost rooms
client.once("clientReady", async () => {
  console.log(`✅ Bot online as ${client.user!.tag}`);

  for (const guild of client.guilds.cache.values()) {
    const me      = guild.members.me;
    const missing: string[] = [];
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) missing.push("Manage Channels");
    if (!me?.permissions.has(PermissionFlagsBits.MoveMembers))    missing.push("Move Members");
    if (missing.length) console.warn(`⚠️  Missing permissions in "${guild.name}": ${missing.join(", ")}`);
  }

  await cleanupGhosts(client);
});

// File 5 ready: start voice XP interval
client.once('ready', () => {
  console.log(`[Bot] Logged in as ${client.user!.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
  startVoiceXPInterval(client);
});

// File 6 ready: register slash commands, cache invites, update member count
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user!.tag}`);
  console.log(`   Prefix          : ${config.prefix}`);
  console.log(`   Giveaway log ch : ${config.giveawayLogChannel || 'NOT SET'}`);
  console.log(`   Giveaway role   : ${config.giveawayRoleId || 'NOT SET (anyone can use)'}`);

  const rest = new REST({ version: '10' }).setToken(config.token);
  for (const guild of client.guilds.cache.values()) {
    try {
      await rest.put(Routes.applicationGuildCommands(client.user!.id, guild.id), { body: slashCommands });
      console.log(`✅ Slash commands registered for ${guild.name}`);
    } catch (e: any) {
      console.error(`Failed to register slash commands for ${guild.name}:`, e.message);
    }
    await cacheInvites(guild);
    await updateMemberCount(guild);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GUILD CREATE
// ─────────────────────────────────────────────────────────────────────────────
client.on('guildCreate', async guild => {
  await cacheInvites(guild);
  await updateMemberCount(guild);
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user!.id, guild.id), { body: slashCommands });
  } catch (e: any) {
    console.error(`Failed to register commands for new guild ${guild.name}:`, e.message);
  }
  // Register clan commands for new guild
  await registerClanCommands(client.user!.id, guild.id, guild.name);
});


client.on('inviteCreate', (i: any) => cacheInvites(i.guild));
client.on('inviteDelete', (i: any) => cacheInvites(i.guild));

// ─────────────────────────────────────────────────────────────────────────────
// GUILD MEMBER ADD
// ─────────────────────────────────────────────────────────────────────────────
// File 4: auto-roles
client.on("guildMemberAdd", async (member) => {
  for (const roleId of AUTO_ROLES) {
    await member.roles.add(roleId).catch((err: any) => {
      console.error(`Failed to assign auto role ${roleId} to ${member.user.tag}:`, err);
    });
  }
  console.log(`Auto roles assigned to new member: ${member.user.tag}`);
});

// File 6: invite tracking + member counter
client.on('guildMemberAdd', async member => {
  const cached = inviteCache.get(member.guild.id) || new Map();
  try {
    const fresh    = await member.guild.invites.fetch();
    const freshMap = new Map();
    for (const inv of fresh.values()) {
      freshMap.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id });
      const old = cached.get(inv.code);
      if (old && (inv.uses ?? 0) > old.uses && inv.inviter) {
        memberInvites.set(`${member.guild.id}:${member.id}`, {
          inviterId: inv.inviter.id,
          code: inv.code,
        });
      }
    }
    inviteCache.set(member.guild.id, freshMap);
  } catch (e: any) {
    console.error('guildMemberAdd invite tracking failed:', e.message);
  }
  await updateMemberCount(member.guild);
});

// ─────────────────────────────────────────────────────────────────────────────
// GUILD MEMBER REMOVE
// ─────────────────────────────────────────────────────────────────────────────
client.on('guildMemberRemove', async member => {
  const info = memberInvites.get(`${member.guild.id}:${member.id}`);
  if (info?.inviterId) {
    const k = `${member.guild.id}:${info.inviterId}`;
    leftCounts.set(k, (leftCounts.get(k) || 0) + 1);
  }
  await updateMemberCount(member.guild);
});

// ─────────────────────────────────────────────────────────────────────────────
// GUILD MEMBER UPDATE (File 1: detect verified role assignment)
// ─────────────────────────────────────────────────────────────────────────────
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const hadRole = oldMember.roles.cache.has(VERIFIED_ROLE_ID);
  const hasRole = newMember.roles.cache.has(VERIFIED_ROLE_ID);

  if (!hadRole && hasRole) {
    try {
      const dmChannel = await newMember.createDM();
      await dmChannel.send({
        embeds: [buildVerifiedDmEmbed(newMember.guild, newMember)],
      });
      console.log(`[Bot] Sent verification DM to ${newMember.displayName}`);
    } catch (err) {
      console.error("[Bot] Could not send DM to member:", err);
    }

    await cleanupUserVerification(newMember.id);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VOICE STATE UPDATE
// ─────────────────────────────────────────────────────────────────────────────

// Main file: temp VC + emoji nicknames
client.on("voiceStateUpdate", async (oldState: VoiceState, newState: VoiceState) => {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;
  if (!member) return;

  if (
    member.id === client.user?.id &&
    oldState.channelId === PERMANENT_VC_ID &&
    newState.channelId !== PERMANENT_VC_ID
  ) {
    setTimeout(joinPermanentVC, 1_000);
    return;
  }

  if (member.user.bot) return;

  const joinedChannelId = newState.channelId;
  const leftChannelId = oldState.channelId;

  if (joinedChannelId === CREATE_VC_CHANNEL_ID) {
    const emoji = randomEmoji();
    const category = guild.channels.cache.get(CATEGORY_ID);
    if (!category || category.type !== ChannelType.GuildCategory) return;

    try {
      const tempChannel = await guild.channels.create({
        name: `${emoji} ・ ${member.displayName}`,
        type: ChannelType.GuildVoice,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
            ],
          },
        ],
      });

      tempChannels.set(tempChannel.id, { ownerId: member.id, emoji });
      await member.voice.setChannel(tempChannel);
    } catch (err) {
      console.error("Failed to create temp channel:", err);
    }
    return;
  }

  if (leftChannelId && leftChannelId !== CREATE_VC_CHANNEL_ID) {
    if (tempChannels.has(leftChannelId)) {
      const leftChannel = guild.channels.cache.get(leftChannelId) as VoiceChannel | undefined;
      if (leftChannel) {
        if (leftChannel.members.size === 0) {
          try {
            await leftChannel.delete();
          } catch {}
          tempChannels.delete(leftChannelId);
        } else {
          const tInfo = tempChannels.get(leftChannelId);
          if (tInfo && tInfo.ownerId === member.id) {
            const newOwner = leftChannel.members.first();
            if (newOwner) {
              tempChannels.set(leftChannelId, { ...tInfo, ownerId: newOwner.id });
            }
          }
          setTimeout(async () => {
            await sendOrUpdateControlMessage(leftChannel, tempChannels.get(leftChannelId)?.ownerId ?? member.id);
          }, 500);
        }
      }
    }

    if (!joinedChannelId) {
      await setMemberEmoji(member, null);
    }
  }

  if (joinedChannelId && joinedChannelId !== CREATE_VC_CHANNEL_ID) {
    const channel = guild.channels.cache.get(joinedChannelId) as VoiceChannel | undefined;
    if (channel) {
      const emoji = extractEmojiFromName(channel.name);
      await setMemberEmoji(member, emoji);

      const tInfo = tempChannels.get(joinedChannelId);
      if (tInfo) {
        setTimeout(async () => {
          await sendOrUpdateControlMessage(channel, tInfo.ownerId);
        }, 500);
      }
    }
  }
});

// File 1: verification VC
client.on("voiceStateUpdate", async (oldState: VoiceState, newState: VoiceState) => {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;
  const guild = newState.guild ?? oldState.guild;
  const userId = member.id;

  if (
    newState.channelId === VERIFICATION_JOIN_VC &&
    oldState.channelId !== VERIFICATION_JOIN_VC
  ) {
    if (verificationTempChannels.has(userId)) return;

    try {
      const joinChannel = await guild.channels.fetch(VERIFICATION_JOIN_VC).catch(() => null) as VoiceChannel | null;
      const categoryId = joinChannel?.parentId ?? null;

      const tempVC = await guild.channels.create({
        name: `✅・${member.displayName} Verification`,
        type: ChannelType.GuildVoice,
        parent: categoryId ?? undefined,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          {
            id: REMOVE_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.UseVAD,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: userId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.UseVAD,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: STAFF_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: client.user!.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
        ],
      });

      verificationTempChannels.set(userId, tempVC.id);
      pingCounts.set(userId, 0);

      await member.voice.setChannel(tempVC).catch(console.error);

      await (tempVC as unknown as TextChannel).send({
        embeds: [buildVerificationRoomEmbed(guild)],
        components: [buildPingStaffButton(userId)],
      });

      console.log(`[Bot] Created temp VC ${tempVC.id} for ${member.displayName}`);
    } catch (err) {
      console.error("[Bot] Error creating temp VC:", err);
    }
    return;
  }

  if (
    oldState.channelId &&
    oldState.channelId !== VERIFICATION_JOIN_VC &&
    verificationTempChannels.get(userId) === oldState.channelId &&
    newState.channelId !== oldState.channelId
  ) {
    console.log(`[Bot] ${member.displayName} left their temp VC, cleaning up...`);
    await cleanupUserVerification(userId);
  }
});

// File 2: TV temp voice
client.on("voiceStateUpdate", async (oldState: VoiceState, newState: VoiceState) => {
  try { await onTVVoiceStateUpdate(oldState, newState); }
  catch (err: any) { console.error("voiceStateUpdate error:", err.message); }
});

// File 4: JTC temp voice
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;

  if (newState.channelId === JOIN_TO_CREATE_CHANNEL_ID && newState.member) {
    const memberId = newState.member.id;

    if (creatingFor.has(memberId)) return;
    creatingFor.add(memberId);

    try {
      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) {
        console.error(`❌ Could not fetch member ${memberId}`);
        return;
      }

      const roleIds = [...member.roles.cache.keys()];
      console.log(`[JTC] ${member.displayName} joined. Roles cached: ${roleIds.length}. Has required role: ${member.roles.cache.has(ALLOWED_ROLE_ID)}`);

      if (roleIds.length === 0) {
        console.warn(`[JTC] ⚠️ Member roles cache is empty for ${member.displayName}. Enable "Server Members Intent" in Discord Developer Portal → Bot → Privileged Gateway Intents. Skipping role check for now.`);
      } else if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
        console.log(`[JTC] ${member.displayName} does not have role ${ALLOWED_ROLE_ID} — skipping.`);
        return;
      }

      const currentVoiceChannelId = newState.channelId;
      if (currentVoiceChannelId !== JOIN_TO_CREATE_CHANNEL_ID) {
        console.log(`[JTC] ${member.displayName} is no longer in JTC (now in ${currentVoiceChannelId}) — skipping.`);
        return;
      }

      const botMember = guild.members.me;
      if (!botMember!.permissions.has(PermissionFlagsBits.MoveMembers)) {
        console.error('❌ Bot is missing MOVE MEMBERS permission!');
        return;
      }

      for (const [chanId, st] of jtcTempChannels.entries()) {
        if (st.ownerId === memberId) {
          const existingChan = guild.channels.cache.get(chanId);
          if (existingChan && (existingChan as VoiceChannel).members.size === 0) {
            await existingChan.delete('Owner rejoined JTC, old empty channel removed').catch(() => {});
            jtcTempChannels.delete(chanId);
          }
        }
      }

      const category = guild.channels.cache.get(TEMP_VOICE_CATEGORY_ID);
      if (!category) {
        console.error(`❌ Category ${TEMP_VOICE_CATEGORY_ID} not found!`);
        return;
      }

      const emoji = randomJtcEmoji();
      const cleanName = stripEmojis(member.displayName) || member.displayName;
      const channelName = `${emoji}・${cleanName}`;

      const memberPerms = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseSoundboard,
        PermissionFlagsBits.UseExternalSounds,
        PermissionFlagsBits.UseVAD,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.UseApplicationCommands,
        PermissionFlagsBits.UseEmbeddedActivities,
      ];

      const tempChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: TEMP_VOICE_CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] },
          { id: memberId, allow: memberPerms },
          { id: ALLOWED_ROLE_ID, allow: memberPerms },
        ],
      });

      console.log(`[JTC] Created temp channel: ${channelName} (${tempChannel.id})`);

      try {
        const jtcChan = guild.channels.cache.get(JOIN_TO_CREATE_CHANNEL_ID);
        const allCategoryVoice = [...guild.channels.cache.values()]
          .filter((c: any) => c.parentId === TEMP_VOICE_CATEGORY_ID && c.type === ChannelType.GuildVoice);
        const tempChans = allCategoryVoice
          .filter((c: any) => c.id !== JOIN_TO_CREATE_CHANNEL_ID)
          .sort((a: any, b: any) => a.createdTimestamp - b.createdTimestamp);

        const positionUpdates: any[] = [];
        if (jtcChan) positionUpdates.push({ channel: jtcChan, position: 0 });
        tempChans.forEach((c: any, i: number) => positionUpdates.push({ channel: c, position: i + 1 }));

        if (positionUpdates.length > 0) {
          await guild.channels.setPositions(positionUpdates).catch((e: any) => console.error('[POS] setPositions failed:', e.message));
        }
      } catch (posErr: any) {
        console.error('[POS] Failed to reorder channels:', posErr.message);
      }

      const state = {
        ownerId: memberId,
        panelMessageId: null,
        locked: false,
        trusted: new Set<string>(),
        kicked: new Set<string>(),
        userLimit: 0,
      };

      jtcTempChannels.set(tempChannel.id, state);

      try {
        await member.voice.setChannel(tempChannel);
        console.log(`✅ Moved ${member.displayName} → ${channelName}`);
      } catch (moveErr: any) {
        console.error(`❌ Failed to move ${member.displayName}:`, moveErr.message);
      }

      await sendOrUpdateJTCPanel(tempChannel, guild, state);
    } catch (err) {
      console.error('Error creating temp voice channel:', err);
    } finally {
      creatingFor.delete(memberId);
    }
  }

  if (oldState.channelId && oldState.channelId !== JOIN_TO_CREATE_CHANNEL_ID) {
    const state = jtcTempChannels.get(oldState.channelId);
    if (!state) return;

    const channel = guild.channels.cache.get(oldState.channelId);
    if (!channel) {
      jtcTempChannels.delete(oldState.channelId);
      return;
    }

    if ((channel as VoiceChannel).members.size === 0) {
      await channel.delete('Temp voice channel is empty').catch(() => {});
      jtcTempChannels.delete(oldState.channelId);
      return;
    }

    if (state.ownerId === oldState.member?.id) {
      await sendOrUpdateJTCPanel(channel, guild, state);
    }
  }
});

// File 5: report case system
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;

  if (newState.channelId === REPORT_HUB_ID && oldState.channelId !== REPORT_HUB_ID) {
    const member = newState.member;
    if (!member || !member.roles.cache.has(REPORTER_ROLE_ID)) return;

    const hub = newState.channel;
    const category = hub ? (hub as any).parentId : null;

    try {
      const caseChannel = await guild.channels.create({
        name: `🆘・${member.displayName}'s case`,
        type: ChannelType.GuildVoice,
        parent: category ?? undefined,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
          { id: REPORTER_ROLE_ID,        deny: [PermissionFlagsBits.Connect] },
          { id: member.id,               allow: OWNER_PERMS },
          { id: VAULT_STAFF_ROLE_ID,     allow: STAFF_PERMS },
        ],
      });

      caseChannels.set(caseChannel.id, { ownerId: member.id });
      await member.voice.setChannel(caseChannel);
    } catch (e: any) {
      console.error('[TempVC] Failed to create case channel:', e.message);
    }
    return;
  }

  if (newState.channelId && caseChannels.has(newState.channelId) && newState.channelId !== oldState.channelId) {
    const member = newState.member;
    if (!member) return;
    const { ownerId } = caseChannels.get(newState.channelId)!;
    const isOwner = member.id === ownerId;
    const isStaff = member.roles.cache.has(VAULT_STAFF_ROLE_ID);
    if (!isOwner && !isStaff) {
      try {
        await (newState.channel as any).permissionOverwrites.create(member.id, { allow: OWNER_PERMS });
      } catch (e: any) {
        console.error('[TempVC] Failed to set participant perms:', e.message);
      }
    }
  }

  if (oldState.channelId && caseChannels.has(oldState.channelId)) {
    const ch = oldState.channel;
    if (!ch) { caseChannels.delete(oldState.channelId); return; }
    if ((ch as VoiceChannel).members.size === 0) {
      caseChannels.delete(oldState.channelId);
      try { await ch.delete(); } catch (e: any) {
        console.error('[TempVC] Failed to delete case channel:', e.message);
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE CREATE
// ─────────────────────────────────────────────────────────────────────────────

// Main file: nickname channel + moderation commands
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.channel.id === NICKNAME_CHANNEL_ID) {
    const newNick = message.content.trim();
    if (!newNick) return;
    const member = message.member;
    if (!member) return;

    try {
      await member.setNickname(newNick);
    } catch {
      return;
    }

    const guild = message.guild;
    const serverIconUrl = guild.iconURL({ size: 128 }) ?? undefined;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const dmEmbed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle("Nickname Successfully Changed")
      .setDescription(`Your server nickname has been changed to **${newNick}**`)
      .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
      .setFooter({
        text: `${guild.name} | ${dateStr}`,
        iconURL: serverIconUrl,
      });

    try {
      await message.author.send({ embeds: [dmEmbed] });
    } catch {}
    return;
  }

  if (!message.content.startsWith("?")) return;

  if (!message.member?.roles.cache.has(ALLOWED_MOD_ROLE_ID)) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case "ban": {
      const targetId = parseUserId(args[1]);
      if (!targetId) {
        await message.reply({ embeds: [embed("Please mention a user or provide their ID.")] });
        return;
      }
      const banReason = args.slice(2).join(" ");
      const guildIconBan = message.guild.iconURL({ size: 128 }) ?? undefined;
      try {
        const banTarget = await message.guild.members.fetch(targetId).catch(() => null);
        if (banTarget) {
          try {
            await banTarget.send({
              embeds: [buildPunishmentEmbed(
                message.guild.name,
                guildIconBan,
                `🔨 You have been banned from ${message.guild.name}`,
                banReason
              )],
            });
          } catch {}
        }
        await message.guild.members.ban(targetId, { reason: banReason || undefined });
        await message.reply({ embeds: [embed(`<@${targetId}> has been **banned**.${banReason ? `\n**Reason:** ${banReason}` : ""}`)] });
      } catch {
        await message.reply({ embeds: [embed("Failed to ban that user.")] });
      }
      break;
    }
    case "kick": {
      const targetId = parseUserId(args[1]);
      if (!targetId) {
        await message.reply({ embeds: [embed("Please mention a user or provide their ID.")] });
        return;
      }
      const kickReason = args.slice(2).join(" ");
      const guildIconKick = message.guild.iconURL({ size: 128 }) ?? undefined;
      try {
        const target = await message.guild.members.fetch(targetId);
        try {
          await target.send({
            embeds: [buildPunishmentEmbed(
              message.guild.name,
              guildIconKick,
              `👢 You have been kicked from ${message.guild.name}`,
              kickReason
            )],
          });
        } catch {}
        await target.kick(kickReason || undefined);
        await message.reply({ embeds: [embed(`<@${targetId}> has been **kicked**.${kickReason ? `\n**Reason:** ${kickReason}` : ""}`)] });
      } catch {
        await message.reply({ embeds: [embed("Failed to kick that user.")] });
      }
      break;
    }
    case "timeout": {
      const targetId = parseUserId(args[1]);
      const durationMs = parseDuration(args[2]);
      if (!targetId) {
        await message.reply({ embeds: [embed("Please mention a user or provide their ID.")] });
        return;
      }
      if (!durationMs) {
        await message.reply({ embeds: [embed("Please provide a valid duration. Examples: `10m` (minutes), `2h` (hours), `1d` (days).")] });
        return;
      }
      const timeoutReason = args.slice(3).join(" ");
      const guildIconTimeout = message.guild.iconURL({ size: 128 }) ?? undefined;
      const until = Math.floor((Date.now() + durationMs) / 1000);
      try {
        const target = await message.guild.members.fetch(targetId);
        try {
          await target.send({
            embeds: [buildPunishmentEmbed(
              message.guild.name,
              guildIconTimeout,
              `⏳ You have been timed out in ${message.guild.name}`,
              timeoutReason
            ).addFields({ name: "Expires", value: `<t:${until}:R>` })],
          });
        } catch {}
        await target.timeout(durationMs, timeoutReason || undefined);
        await message.reply({ embeds: [embed(`<@${targetId}> has been timed out until <t:${until}:R>.${timeoutReason ? `\n**Reason:** ${timeoutReason}` : ""}`)] });
      } catch {
        await message.reply({ embeds: [embed("Failed to timeout that user.")] });
      }
      break;
    }
    case "untime": {
      const targetId = parseUserId(args[1]);
      if (!targetId) {
        await message.reply({ embeds: [embed("Please mention a user or provide their ID.")] });
        return;
      }
      try {
        const target = await message.guild.members.fetch(targetId);
        await target.timeout(null);
        await message.reply({ embeds: [embed(`The timeout for <@${targetId}> has been **removed**.`)] });
      } catch {
        await message.reply({ embeds: [embed("Failed to remove the timeout.")] });
      }
      break;
    }
    case "unban": {
      const targetId = parseUserId(args[1]);
      if (!targetId) {
        await message.reply({ embeds: [embed("Please provide the User ID to unban.")] });
        return;
      }
      try {
        await message.guild.bans.remove(targetId);
        await message.reply({ embeds: [embed(`<@${targetId}> has been **unbanned**.`)] });
      } catch {
        await message.reply({ embeds: [embed("Failed to unban. Make sure that user is currently banned.")] });
      }
      break;
    }
    case "move": {
      const targetId = parseUserId(args[1]);
      if (!targetId) {
        await message.reply({ embeds: [embed("Please mention a user or provide their ID.")] });
        return;
      }
      const senderVoiceChannel = message.member?.voice.channel;
      if (!senderVoiceChannel) {
        await message.reply({ embeds: [embed("You must be in a voice channel to use this command.")] });
        return;
      }
      try {
        const target = await message.guild.members.fetch(targetId);
        await target.voice.setChannel(senderVoiceChannel);
        await message.reply({ embeds: [embed(`<@${targetId}> has been moved to **${senderVoiceChannel.name}**.`)] });
      } catch {
        await message.reply({ embeds: [embed("Failed to move that user. Make sure they are currently in a voice channel.")] });
      }
      break;
    }
    case "delete": {
      const amount = parseInt(args[1], 10);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        const reply = await message.reply({ embeds: [embed("Please provide a number between 1 and 100.")] });
        autoDelete(reply, 3000);
        return;
      }
      try {
        await message.delete();
        const textChannel = message.channel as TextChannel;
        const deleted = await textChannel.bulkDelete(amount, true);
        const reply = await textChannel.send({ embeds: [embed(`Successfully deleted **${deleted.size}** message(s).`)] });
        autoDelete(reply, 3000);
      } catch {
        const reply = await message.channel.send({ embeds: [embed("Failed to delete messages. Messages older than 14 days cannot be bulk deleted.")] });
        autoDelete(reply, 3000);
      }
      break;
    }
    case "say": {
      const text = args.slice(1).join(" ");
      if (!text) {
        const reply = await message.reply({ embeds: [embed("Please provide a message to say.")] });
        autoDelete(reply, 3000);
        return;
      }
      try {
        await message.delete();
      } catch {}
      await message.channel.send(text);
      break;
    }
  }
});

// File 1: ?ve command
client.on("messageCreate", async (message: Message) => {
  try {
  if (message.author.bot) return;
  if (!message.content.startsWith("?ve")) return;

  console.log(`[Bot] ?ve message received from ${message.author.id}: "${message.content}"`);

  if (!message.content.startsWith("?ve ")) return;
  if (!message.member?.roles.cache.has(ALLOWED_CMD_ROLE_ID)) {
    console.log(`[Bot] Unauthorized user tried ?ve: ${message.author.id}`);
    return;
  }

  const args = message.content.slice("?ve ".length).trim().split(/\s+/);
  const mention = message.mentions.members?.first();
  const action = args.find((a) => !a.startsWith("<"));

  if (!mention) {
    await replyAndDelete(message, { content: "**Please mention a valid user.**" });
    return;
  }

  if (!action) {
    await replyAndDelete(message, { content: "**Please provide an action: `vp`, `male`, `female`, or `new`.**" });
    return;
  }

  const guild = message.guild;
  if (!guild) return;

  switch (action.toLowerCase()) {
    case "vp": {
      await mention.roles.add(VP_ROLE_ID);
      await replyAndDelete(message, {
        embeds: [buildConfirmEmbed(`✅ **Gave <@${mention.id}> the Verified Person role.**`)],
      });
      break;
    }
    case "male": {
      await mention.roles.add(MALE_ROLE_ID);
      await replyAndDelete(message, {
        embeds: [buildConfirmEmbed(`✅ **Gave <@${mention.id}> the Male role.**`)],
      });
      break;
    }
    case "female": {
      await mention.roles.add(FEMALE_ROLE_ID);
      await replyAndDelete(message, {
        embeds: [buildConfirmEmbed(`✅ **Gave <@${mention.id}> the Female role.**`)],
      });
      break;
    }
    case "new": {
      await mention.roles.remove(REMOVE_ROLE_ID);
      await replyAndDelete(message, {
        embeds: [buildConfirmEmbed(`✅ **Removed the New role from <@${mention.id}>.**`)],
      });
      break;
    }
    default: {
      await replyAndDelete(message, {
        content: "**Unknown action. Use `vp`, `male`, `female`, or `new`.**",
      });
    }
  }
  } catch (err) {
    console.error("[Bot] messageCreate error:", err);
    try {
      await message.reply({ content: "**Something went wrong. Check my permissions.**" });
    } catch {}
  }
});

// File 4: anti-link
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.content) return;
    if (WHITELISTED_USERS.includes(message.author.id)) return;
    if (!containsLink(message.content)) return;
    if (isOnlyGifLinks(message.content)) return;

    await message.delete().catch(() => null);

    const warning = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setDescription(`⛔ <@${message.author.id}> Links are not allowed. Be careful!`)
      .setTimestamp();

    const reply = await message.channel.send({
      embeds: [warning],
      allowedMentions: { users: [] },
    }).catch(() => null);

    if (reply) setTimeout(() => reply.delete().catch(() => null), 5000);
  } catch (err) {
    console.error("Error in messageCreate (anti-link):", err);
  }
});

// File 5: casino + xp commands
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  const c = message.content.trim(), cl = c.toLowerCase();

  if (cl === '?lead text')             { await handleLeaderboardCommand(message, 'chat');  return; }
  if (cl === '?lead vc')               { await handleLeaderboardCommand(message, 'voice'); return; }
  if (cl === '?xptop')                 { await handleCombinedCommand(message);             return; }
  if (cl.startsWith('?rank'))          { await handleRankCommand(message);                 return; }

  if (cl.startsWith('?blackjack') || cl.startsWith('?bj')) { await handleBlackjack(message);  return; }
  if (cl.startsWith('?slots'))         { await handleSlots(message);      return; }
  if (cl.startsWith('?dice'))          { await handleDice(message);       return; }
  if (cl.startsWith('?coin'))          { await handleCoin(message);       return; }

  if (cl === '?balance')               { await handleBalance(message);  return; }
  if (cl === '?daily')                 { await handleDaily(message);    return; }
  if (cl === '?work')                  { await handleWork(message);     return; }
  if (cl === '?luck')                  { await handleLuck(message);     return; }
  if (cl === '?streak')                { await handleStreak(message);   return; }
  if (cl === '?scam')                  { await handleScam(message);     return; }
  if (cl === '?stats')                 { await handleStats(message);    return; }
  if (cl === '?top')                   { await handleTop(message);      return; }
  if (cl.startsWith('?transfer'))      { await handleTransfer(message); return; }

  if (cl === '?closecase')             { await handleCloseCase(message);    return; }
  if (cl.startsWith('?adduser'))       { await handleAddUser(message);      return; }
  if (cl.startsWith('?removeuser'))    { await handleRemoveUser(message);   return; }

  if (cl.startsWith('?mint'))          { await handleMint(message);         return; }
  if (cl.startsWith('?chipsremove'))   { await handleChipsRemove(message);  return; }

  await handleMessage(message);
});

// File 6: prefix commands (?ping, ?inv, ?invitetop)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  const args    = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const command = args.shift()!.toLowerCase();

  if (command === 'ping') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLOR)
          .setDescription(`**Pong! \`${client.ws.ping}ms\`**`)
          .setTimestamp(),
      ],
    });
  }

  if (command === 'inv') {
    const target  = message.mentions.members?.first() || message.member!;
    const invites = getInviterTotalUses(message.guild!.id, target.id);
    const left    = getLeftCount(message.guild!.id, target.id);

    const joinDate   = target.joinedAt   ? tsLong(target.joinedAt)          : 'Unknown';
    const accountAge = target.user.createdAt ? tsLong(target.user.createdAt) : 'Unknown';

    let desc = `__**🫂 Invites Card**__\n\n`;
    desc += `__**🛩️ Join Date :**__ **${joinDate}**\n\n`;
    desc += `__**📅 Account's Age :**__ **${accountAge}**\n\n`;
    desc += `__**🪪 User Id :**__ **${target.id}**\n\n`;
    desc += `__**📨 Invites :**__ **${invites}**\n\n`;
    desc += `__**🚪 Left :**__ **${left}**`;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLOR)
          .setAuthor({
            name:    target.user.username,
            iconURL: target.user.displayAvatarURL({ dynamic: true } as any),
          })
          .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 } as any))
          .setDescription(desc)
          .setFooter({
            text:    message.guild!.name,
            iconURL: message.guild!.iconURL({ dynamic: true } as any) || undefined,
          })
          .setTimestamp(),
      ],
    });
  }

  if (command === 'invitetop') {
    const map    = inviteCache.get(message.guild!.id) || new Map();
    const totals = new Map<string, number>();
    for (const inv of map.values()) {
      if (!inv.inviterId) continue;
      totals.set(inv.inviterId, (totals.get(inv.inviterId) || 0) + (inv.uses || 0));
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (sorted.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription('**No invite data yet.**')
            .setTimestamp(),
        ],
      });
    }
    const lines = sorted.map(([id, count], i) =>
      `**${i + 1}.** <@${id}> — **${count}** invite${count === 1 ? '' : 's'}`
    );
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLOR)
          .setTitle('Top Inviters')
          .setDescription(lines.join('\n'))
          .setTimestamp(),
      ],
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTION CREATE
// ─────────────────────────────────────────────────────────────────────────────

// Main file: buttons + modals for main VC system
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    await handleButton(interaction as ButtonInteraction);
  } else if (interaction.isModalSubmit()) {
    await handleModal(interaction as ModalSubmitInteraction);
  }
});

// File 1: verification ping + self-role buttons + select menus
client.on("interactionCreate", async (interaction: Interaction) => {
  try {
  if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId.startsWith("ping_staff:")) {
      const ownerId = customId.split(":")[1];
      const interactingUserId = interaction.user.id;

      if (interactingUserId !== ownerId) {
        await interaction.reply({
          content: "**This button is not for you.**",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const guild = interaction.guild;
      if (!guild) return;

      const count = pingCounts.get(ownerId) ?? 0;

      if (count >= 2) {
        await interaction.reply({
          embeds: [buildMaxPingsEmbed(guild)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const newCount = count + 1;
      pingCounts.set(ownerId, newCount);

      try {
        const staffChannel = await guild.channels.fetch(STAFF_PING_CHANNEL_ID).catch(() => null) as TextChannel | null;
        if (staffChannel?.isTextBased()) {
          await staffChannel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [buildStaffPingEmbed(guild)],
          });
        }
      } catch (err) {
        console.error("[Bot] Error pinging staff channel:", err);
      }

      if (newCount === 1) {
        await interaction.reply({
          content: "**Staff has been notified. You have 1 ping left.**",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ping_staff:${ownerId}`)
            .setLabel("Ping Staff")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );
        await interaction.update({ components: [disabledRow] });

        const ch = interaction.channel;
        if (ch?.isTextBased()) {
          await (ch as TextChannel).send({
            embeds: [buildMaxPingsEmbed(guild)],
          });
        }
      }
      return;
    }

    if (customId === "btn_games") {
      await interaction.reply({
        embeds: [buildConfirmEmbed("**🎮 Select the games you enjoy playing:**")],
        components: [buildGamesMenuF1()],
        flags: MessageFlags.Ephemeral,
      });
    } else if (customId === "btn_relationship") {
      await interaction.reply({
        embeds: [buildConfirmEmbed("**❤️ Pick the option that best represents you:**")],
        components: [buildRelationshipMenuF1()],
        flags: MessageFlags.Ephemeral,
      });
    } else if (customId === "btn_age") {
      await interaction.reply({
        embeds: [buildConfirmEmbed("**🎂 Choose your age group:**")],
        components: [buildAgeMenuF1()],
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.reply({ content: "Could not find your member data.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferUpdate();

    if (interaction.customId === "select_games") {
      const selected = new Set(interaction.values);
      const allGameRoleIds = new Set(Object.values(GAMES_ROLES_F1));

      for (const roleId of allGameRoleIds) {
        const shouldHave = [...selected].some((name) => GAMES_ROLES_F1[name] === roleId);
        const hasRole = member.roles.cache.has(roleId);
        if (shouldHave && !hasRole) await member.roles.add(roleId).catch(console.error);
        else if (!shouldHave && hasRole) await member.roles.remove(roleId).catch(console.error);
      }

      const roleNames =
        interaction.values.length > 0
          ? interaction.values.map((v) => `**${v}**`).join(", ")
          : "*(no games selected)*";

      await interaction.editReply({
        embeds: [buildConfirmEmbed(`✅ **Your role has been updated**\n\n🎮 Games: ${roleNames}`)],
        components: [],
      });
    } else if (interaction.customId === "select_relationship") {
      const selectedName = interaction.values[0];
      const selectedId = RELATIONSHIP_ROLES_F1[selectedName];
      for (const roleId of Object.values(RELATIONSHIP_ROLES_F1)) {
        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(console.error);
      }
      if (selectedId) await member.roles.add(selectedId).catch(console.error);

      await interaction.editReply({
        embeds: [buildConfirmEmbed(`✅ **Your role has been updated**\n\n❤️ Relationship Status: **${selectedName}**`)],
        components: [],
      });
    } else if (interaction.customId === "select_age") {
      const selectedName = interaction.values[0];
      const selectedId = AGE_ROLES_F1[selectedName];
      for (const roleId of Object.values(AGE_ROLES_F1)) {
        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(console.error);
      }
      if (selectedId) await member.roles.add(selectedId).catch(console.error);

      await interaction.editReply({
        embeds: [buildConfirmEmbed(`✅ **Your role has been updated**\n\n🎂 Age: **${selectedName}**`)],
        components: [],
      });
    }
  }
  } catch (err) {
    console.error("[Bot] Interaction handler error:", err);
  }
});

// File 2: TV temp voice interactions
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith("tv_")) await handleTVButton(interaction);
    else if (interaction.isStringSelectMenu() && interaction.customId.startsWith("tv_")) await handleTVSelectMenu(interaction);
    else if (interaction.isModalSubmit() && interaction.customId.startsWith("tv_")) await handleTVModal(interaction);
  } catch (err: any) {
    console.error("interactionCreate error:", err.message);
  }
});

// File 3: Clan commands
client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === "deploy-panel") await onDeployPanel(i);
      else if (i.commandName === "deploy-join-panel") await onDeployJoinPanel(i);
      else if (i.commandName === "clan-setup") await onClanSetup(i);
    } else if (i.isButton()) {
      if (i.customId === "add_member") await onAddMemberBtn(i);
      else if (i.customId === "kick_member") await onKickMemberBtn(i);
      else if (i.customId === "join_request") await onJoinRequestBtn(i);
      else if (i.customId === "close_ticket") await onCloseTicket(i);
      else if (i.customId === "close_ticket_confirm") await onCloseConfirm(i);
      else if (i.customId === "close_ticket_cancel") await onCloseCancel(i);
    } else if (i.isModalSubmit()) {
      if (i.customId === "add_member_modal") await onAddMemberModal(i);
      else if (i.customId === "kick_member_modal") await onKickMemberModal(i);
      else if (i.customId === "join_request_modal") await onJoinRequestModal(i);
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (i.isRepliable() && !i.replied && !i.deferred)
      await i.reply({ content: "❌ An error occurred. Please try again.", ephemeral: true }).catch(() => {});
  }
});

// File 4: JTC VC interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isModalSubmit()) {
    await handleJTCModalSubmit(interaction);
    return;
  }

  if (!interaction.isButton()) return;
  const customId = interaction.customId;
  if (!customId.startsWith('vc_')) return;

  await handleVCButton(interaction);
});

// File 5: casino button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const id = interaction.customId;

  if (id.startsWith('bj_')) { await handleBjButton(interaction); return; }
  if (id.startsWith('sl_')) { await handleSlButton(interaction); return; }
  if (id.startsWith('dc_')) { await handleDcButton(interaction); return; }
  if (id.startsWith('cf_')) { await handleCfButton(interaction); return; }
  if (id.startsWith('dl_')) { await handleDlButton(interaction); return; }
  if (id.startsWith('wk_')) { await handleWkButton(interaction); return; }
  if (id.startsWith('lk_')) { await handleLkButton(interaction); return; }
  if (id.startsWith('sc_')) { await handleScButton(interaction); return; }
  if (id.startsWith('tp_')) { await handleTpButton(interaction); return; }
  if (id.startsWith('cb_')) { await handleCbButton(interaction); return; }
  if (id.startsWith('lb_')) { await handleLbButton(interaction); return; }
  if (id.startsWith('cc_')) { await handleCcButton(interaction); return; }
});

// File 6: giveaway buttons, modal submit, slash commands
client.on('interactionCreate', async interaction => {

  if (interaction.isButton()) {
    if (!interaction.customId.startsWith('enter_')) return;
    const giveawayId = interaction.customId.slice(6);
    const g = giveaways.get(giveawayId);
    if (!g?.active) {
      return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
    }
    const guild = interaction.guild;
    if (g.entries.has(interaction.user.id)) {
      g.entries.delete(interaction.user.id);
      try { await interaction.message.edit({ embeds: [buildGiveawayEmbed(g, guild)], components: [buildEntryRow(giveawayId)] }); } catch {}
      return interaction.reply({ content: '❌ You have left the giveaway.', ephemeral: true });
    }
    g.entries.add(interaction.user.id);
    try { await interaction.message.edit({ embeds: [buildGiveawayEmbed(g, guild)], components: [buildEntryRow(giveawayId)] }); } catch {}
    return interaction.reply({ content: '🎁 You have entered the giveaway! Good luck!', ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'givecreate_modal') {
    if (!hasGiveawayRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to create giveaways.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const prize        = interaction.fields.getTextInputValue('prize');
    const hoursStr     = interaction.fields.getTextInputValue('duration');
    const winnersStr   = interaction.fields.getTextInputValue('winners');
    const requirements = interaction.fields.getTextInputValue('requirements').trim() || null;

    const hours   = parseFloat(hoursStr);
    const winners = parseInt(winnersStr);

    if (isNaN(hours) || hours <= 0) {
      return interaction.editReply({ content: '❌ Invalid duration. Please enter a valid number of hours (e.g. `24`).' });
    }
    if (isNaN(winners) || winners <= 0) {
      return interaction.editReply({ content: '❌ Invalid winner count. Please enter a valid number (e.g. `1`).' });
    }

    const endTimestamp = Math.floor((Date.now() + hours * 3_600_000) / 1000);

    const g: any = {
      messageId:    null,
      channelId:    interaction.channelId,
      prize,
      requirements,
      winners,
      hostedBy:     interaction.user.id,
      entries:      new Set<string>(),
      active:       true,
      endTimestamp,
    };

    const placeholderRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('enter_PLACEHOLDER')
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    const guild = interaction.guild;
    const gMsg  = await (interaction.channel as TextChannel).send({ embeds: [buildGiveawayEmbed(g, guild)], components: [placeholderRow] });

    g.messageId = gMsg.id;
    giveaways.set(gMsg.id, g);

    await gMsg.edit({ embeds: [buildGiveawayEmbed(g, guild)], components: [buildEntryRow(gMsg.id)] }).catch(() => {});

    try {
      const idCh = await client.channels.fetch('1488478458328645692');
      if (idCh?.isTextBased()) {
        const idEmbed = new EmbedBuilder()
          .setColor(EMBED_COLOR)
          .setDescription(
            `__**📋 New Giveaway Created**__\n\n` +
            `__**Prize :**__ **${prize}**\n` +
            `__**Giveaway ID :**__ \`${gMsg.id}\`\n` +
            `__**Channel :**__ <#${interaction.channelId}>\n` +
            `__**Hosted By :**__ <@${interaction.user.id}>\n` +
            `__**Winners :**__ **${winners}**\n` +
            `__**Duration :**__ **${hours}h**\n` +
            (requirements ? `__**Requirements :**__ **${requirements}**` : '')
          )
          .setTimestamp();
        await (idCh as TextChannel).send({ embeds: [idEmbed] });
      }
    } catch (e: any) {
      console.error('Failed to send giveaway ID to tracking channel:', e.message);
    }

    const logEmbed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('Giveaway Started')
      .addFields(
        { name: 'Prize',      value: prize,                          inline: true  },
        { name: 'Winners',    value: `${winners}`,                   inline: true  },
        { name: 'Duration',   value: `${hours}h`,                    inline: true  },
        { name: 'Hosted By',  value: `<@${interaction.user.id}>`,    inline: true  },
        { name: 'Channel',    value: `<#${interaction.channelId}>`,  inline: true  },
        { name: 'Message ID', value: gMsg.id,                        inline: false },
      )
      .setTimestamp();
    if (requirements) logEmbed.addFields({ name: 'Requirements', value: requirements, inline: false });
    await sendLog(config.giveawayLogChannel, logEmbed);

    setTimeout(() => endGiveaway(gMsg.id), hours * 3_600_000);

    return interaction.editReply({
      content: `✅ Giveaway created! [Jump to message](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${gMsg.id})\n**Giveaway ID:** \`${gMsg.id}\``,
    });
  }

  if (!interaction.isChatInputCommand()) return;

  if (!hasGiveawayRole(interaction.member)) {
    return interaction.reply({ content: 'You do not have permission to use giveaway commands.', ephemeral: true });
  }

  const { commandName } = interaction;

  if (commandName === 'givecreate') {
    const modal = new ModalBuilder()
      .setCustomId('givecreate_modal')
      .setTitle('Create a Giveaway');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('prize')
          .setLabel('Prize')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. Discord Nitro')
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('duration')
          .setLabel('Duration (in hours)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 24')
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('winners')
          .setLabel('Number of Winners')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 1')
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('requirements')
          .setLabel('Requirements (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('e.g. Must have 5 invites, Must be level 5+')
          .setRequired(false)
      ),
    );

    return interaction.showModal(modal);
  }

  if (commandName === 'givereroll') {
    const id = interaction.options.getString('giveaway_id');
    const g  = giveaways.get(id!);
    if (!g) return interaction.reply({ content: 'No giveaway found with that ID.', ephemeral: true });
    if (g.entries.size === 0) return interaction.reply({ content: 'No entries to reroll from.', ephemeral: true });

    const previousWinners = pickRandom(g.entries, g.winners);
    const newWinners      = pickRandom(g.entries, g.winners);
    const prevMentions    = previousWinners.map((uid: string) => `<@${uid}>`).join(', ');
    const newMentions     = newWinners.map((uid: string) => `<@${uid}>`).join(', ');

    const guild = interaction.guild;
    let desc = `__**🔄 Giveaway Rerolled**__\n\n`;
    desc += `__**Prize :**__ **${g.prize}**\n`;
    desc += `__**Previous Winner :**__ ${prevMentions}\n`;
    desc += `__**New Winner :**__ ${newMentions}\n\n`;
    desc += `__**Reason :**__\n`;
    desc += `**Winner did not meet the requirements or failed to claim in time.**`;

    const emb = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setDescription(desc)
      .setFooter({ text: guild?.name || '', iconURL: guild?.iconURL({ dynamic: true } as any) || undefined })
      .setTimestamp();

    await interaction.reply({ embeds: [emb] });
    await sendLog(config.giveawayLogChannel, emb);
    return;
  }

  if (commandName === 'giveend') {
    const id = interaction.options.getString('giveaway_id');
    const g  = giveaways.get(id!);
    if (!g) return interaction.reply({ content: 'No giveaway found with that ID.', ephemeral: true });
    if (!g.active) return interaction.reply({ content: 'That giveaway has already ended.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    await endGiveaway(id!, interaction.user.id);
    return interaction.editReply({ content: '✅ Giveaway ended successfully.' });
  }

  if (commandName === 'givelist') {
    const active = [...giveaways.values()].filter((g: any) => g.active);
    if (active.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription('__**📋 Active Giveaways**__\n\n**No active giveaways at the moment.**')
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    const lines = active.map((g: any, i: number) =>
      `**• [Giveaway #${i + 1}] ${g.prize} — Ends: <t:${g.endTimestamp}:R>** (\`${g.messageId}\`)`
    );

    let desc = `__**📋 Active Giveaways**__\n\n`;
    desc += `__**Current Giveaways :**__\n`;
    desc += lines.join('\n');
    desc += `\n\n__**Total :**__ **${active.length}**`;

    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setDescription(desc).setTimestamp()],
      ephemeral: true,
    });
  }
});

// File 6: self-role v2 buttons + select menus
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "btn_games") {
        await interaction.reply({
          content: "🎮 **Select the games you play** (you can pick multiple):",
          components: [buildGamesMenuF6()],
          flags: MessageFlags.Ephemeral,
        });
      } else if (interaction.customId === "btn_relationship") {
        await interaction.reply({
          content: "❤️ **Select your relationship status:**",
          components: [buildRelationshipMenuF6()],
          flags: MessageFlags.Ephemeral,
        });
      } else if (interaction.customId === "btn_age") {
        await interaction.reply({
          content: "🎂 **Select your age group:**",
          components: [buildAgeMenuF6()],
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "select_games") await handleSelectGames(interaction);
      else if (interaction.customId === "select_relationship") await handleSelectRelationship(interaction);
      else if (interaction.customId === "select_age") await handleSelectAge(interaction);
    }
  } catch (err) {
    console.error("Error handling interaction:", err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
client.on("error", (err) => {
  console.error("[Bot] Client error:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Bot] Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Bot] Uncaught exception:", err);
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE LOGIN
// ─────────────────────────────────────────────────────────────────────────────
client.login(DISCORD_BOT_TOKEN).catch((err: any) => {
  console.error('[Bot] Failed to login:', err.message);
  process.exit(1);
});
