import { EmbedBuilder } from 'discord.js';
import { CH, COLORS, RANKS } from '../config.js';

export const findRole = (guild, name) => guild.roles.cache.find((r) => r.name === name);
export const findChannel = (guild, name) => guild.channels.cache.find((c) => c.name === name && c.isTextBased());

// Highest rank (index into RANKS) a member holds, or -1. Administrators count as top rank.
export function rankOf(member) {
  if (member.permissions.has('Administrator')) return RANKS.length - 1;
  let best = -1;
  RANKS.forEach((n, i) => { if (member.roles.cache.some((r) => r.name === n)) best = i; });
  return best;
}
export const atLeast = (member, rank) => rankOf(member) >= RANKS.indexOf(rank);

export async function modlog(guild, embed) {
  const ch = findChannel(guild, CH.modlog);
  if (ch) await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

export const embed = (title, desc, color = COLORS.gold) => new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc);

export const reply = (i, content, extra = {}) =>
  (i.deferred || i.replied ? i.editReply({ content, ...extra }) : i.reply({ content, ephemeral: true, ...extra }));

// Can `actor` act on `target` (role hierarchy), and can the bot?
export function hierarchyError(i, target) {
  if (target.id === i.user.id) return 'You cannot do that to yourself.';
  if (target.id === i.guild.ownerId) return 'You cannot do that to the server owner.';
  const me = i.guild.members.me;
  if (target.roles.highest.position >= me.roles.highest.position) return 'That member outranks the bot. Move the bot role higher.';
  if (i.guild.ownerId !== i.user.id && target.roles.highest.position >= i.member.roles.highest.position) return 'That member outranks you.';
  return null;
}
