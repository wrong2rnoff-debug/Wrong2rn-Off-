import {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  type VoiceState,
  type GuildMember,
  type VoiceChannel,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN environment variable is required");
}

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

const tempChannels = new Map<string, { ownerId: string; emoji: string }>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

async function joinPermanentVC() {
  try {
    const channel = await client.channels.fetch(PERMANENT_VC_ID);
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    const connection = joinVoiceChannel({
      channelId: PERMANENT_VC_ID,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
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

client.once("clientReady", (c) => {
  console.log(`Bot ready: ${c.user.tag}`);
  joinPermanentVC();
});

async function setMemberEmoji(member: GuildMember, emoji: string | null) {
  try {
    const displayName = member.displayName;
    const cleanName = displayName.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, "").trim();
    const newNick = emoji ? `${emoji} ${cleanName}` : (cleanName === member.user.username ? null : cleanName);
    await member.setNickname(newNick);
  } catch {
  }
}

function buildControlEmbed(
  channelName: string,
  ownerTag: string,
  ownerAvatarUrl: string | null,
  isLocked: boolean,
  members: string[],
  ownerId: string
) {
  const embed = new EmbedBuilder()
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
    embed.setThumbnail(ownerAvatarUrl);
  }
  return embed;
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

  const embed = buildControlEmbed(channel.name, ownerTag, ownerAvatarUrl, isLocked, memberIds, ownerId);
  const rows = buildControlRow(isLocked);

  const textChannel = channel as unknown as TextChannel;
  try {
    const messages = await textChannel.messages.fetch({ limit: 10 });
    const existing = messages.find(
      (m) => m.author.id === client.user!.id && m.embeds.length > 0
    );
    if (existing) {
      await existing.edit({ embeds: [embed], components: rows });
    } else {
      await textChannel.send({ embeds: [embed], components: rows });
    }
  } catch {
    try {
      await textChannel.send({ embeds: [embed], components: rows });
    } catch {}
  }
}

client.on("voiceStateUpdate", async (oldState: VoiceState, newState: VoiceState) => {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;
  if (!member) return;

  // If the bot itself was removed from the permanent VC, rejoin
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

  // --- CREATE TEMP VC: user joined the "click to create" channel ---
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
      // Emoji + embed are handled by the voiceStateUpdate that fires when member lands in the new channel
    } catch (err) {
      console.error("Failed to create temp channel:", err);
    }
    return;
  }

  // --- LEAVE HANDLING ---
  if (leftChannelId && leftChannelId !== CREATE_VC_CHANNEL_ID) {
    // Temp channel cleanup
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

    // Remove emoji only if they fully disconnected (not moving to another channel)
    if (!joinedChannelId) {
      await setMemberEmoji(member, null);
    }
  }

  // --- JOIN HANDLING: apply emoji from any VC's name ---
  if (joinedChannelId && joinedChannelId !== CREATE_VC_CHANNEL_ID) {
    const channel = guild.channels.cache.get(joinedChannelId) as VoiceChannel | undefined;
    if (channel) {
      const emoji = extractEmojiFromName(channel.name);
      await setMemberEmoji(member, emoji);

      // Update temp channel embed if applicable
      const tInfo = tempChannels.get(joinedChannelId);
      if (tInfo) {
        setTimeout(async () => {
          await sendOrUpdateControlMessage(channel, tInfo.ownerId);
        }, 500);
      }
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    await handleButton(interaction as ButtonInteraction);
  } else if (interaction.isModalSubmit()) {
    await handleModal(interaction as ModalSubmitInteraction);
  }
});

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

const EMBED_COLOR = 0x0a4939;

const ALLOWED_USER_IDS = new Set([
  "985199377041752104",
  "859087100687417365",
  "761277337584533555",
  "760886046375411782",
  "1078355674498609172",
]);

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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // --- NICKNAME CHANNEL ---
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

  // --- PREFIX COMMANDS ---
  if (!message.content.startsWith("?")) return;

  // Permission check
  if (!ALLOWED_USER_IDS.has(message.author.id)) return;

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

client.login(DISCORD_BOT_TOKEN);
