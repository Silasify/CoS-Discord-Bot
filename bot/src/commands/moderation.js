import { SlashCommandBuilder, PermissionFlagsBits as PF } from 'discord.js';
import { COLORS, WARN_TIMEOUT_AT, WARN_TIMEOUT_MIN } from '../config.js';
import { data, save } from '../lib/store.js';
import { embed, modlog, reply, hierarchyError } from '../lib/util.js';

function addCase(i, type, userId, reason, extra = {}) {
  const c = { id: ++data.caseCounter, type, userId, modId: i.user.id, reason, at: Date.now(), ...extra };
  data.cases.push(c);
  save();
  return c;
}

async function log(i, c, tag) {
  await modlog(i.guild, embed(`Case #${c.id}: ${c.type}`,
    `**Member:** <@${c.userId}> (${tag})\n**By:** <@${c.modId}>\n**Reason:** ${c.reason}${c.until ? `\n**Until:** <t:${Math.floor(c.until / 1000)}:F>` : ''}`, COLORS.red));
}

const dm = (user, text) => user.send(text).catch(() => {});
const reasonOpt = (o) => o.setName('reason').setDescription('Reason');
const MAX_TIMEOUT = 28 * 24 * 60;

const kick = {
  data: new SlashCommandBuilder().setName('kick').setDescription('Remove a member from the Legion')
    .setDefaultMemberPermissions(PF.KickMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)).addStringOption(reasonOpt),
  async execute(i) {
    const m = i.options.getMember('member');
    if (!m) return reply(i, 'Member not found.');
    const err = hierarchyError(i, m); if (err) return reply(i, err);
    const reason = i.options.getString('reason') || 'No reason given';
    await dm(m.user, `You were kicked from **${i.guild.name}**: ${reason}`);
    await m.kick(`${i.user.tag}: ${reason}`);
    await log(i, addCase(i, 'Kick', m.id, reason), m.user.tag);
    return reply(i, `Kicked ${m.user.tag}.`);
  },
};

const ban = {
  data: new SlashCommandBuilder().setName('ban').setDescription('Banish a member')
    .setDefaultMemberPermissions(PF.BanMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)).addStringOption(reasonOpt)
    .addIntegerOption((o) => o.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)),
  async execute(i) {
    const user = i.options.getUser('member');
    const m = i.options.getMember('member');
    if (m) { const err = hierarchyError(i, m); if (err) return reply(i, err); }
    const reason = i.options.getString('reason') || 'No reason given';
    if (m) await dm(user, `You were banned from **${i.guild.name}**: ${reason}`);
    await i.guild.members.ban(user, { reason: `${i.user.tag}: ${reason}`, deleteMessageSeconds: (i.options.getInteger('delete_days') || 0) * 86400 });
    await log(i, addCase(i, 'Ban', user.id, reason), user.tag);
    return reply(i, `Banned ${user.tag}.`);
  },
};

const unban = {
  data: new SlashCommandBuilder().setName('unban').setDescription('Lift a ban')
    .setDefaultMemberPermissions(PF.BanMembers)
    .addStringOption((o) => o.setName('user_id').setDescription('User ID').setRequired(true)).addStringOption(reasonOpt),
  async execute(i) {
    const id = i.options.getString('user_id').trim();
    const reason = i.options.getString('reason') || 'No reason given';
    try { await i.guild.members.unban(id, `${i.user.tag}: ${reason}`); } catch { return reply(i, 'No ban found for that ID.'); }
    await log(i, addCase(i, 'Unban', id, reason), id);
    return reply(i, `Unbanned <@${id}>.`);
  },
};

const timeout = {
  data: new SlashCommandBuilder().setName('timeout').setDescription('Silence a member for a while')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(MAX_TIMEOUT))
    .addStringOption(reasonOpt),
  async execute(i) {
    const m = i.options.getMember('member');
    if (!m) return reply(i, 'Member not found.');
    const err = hierarchyError(i, m); if (err) return reply(i, err);
    const min = i.options.getInteger('minutes');
    const reason = i.options.getString('reason') || 'No reason given';
    await m.timeout(min * 60000, `${i.user.tag}: ${reason}`);
    await dm(m.user, `You were timed out in **${i.guild.name}** for ${min} min: ${reason}`);
    await log(i, addCase(i, 'Timeout', m.id, reason, { until: Date.now() + min * 60000 }), m.user.tag);
    return reply(i, `Timed out ${m.user.tag} for ${min} min.`);
  },
};

const untimeout = {
  data: new SlashCommandBuilder().setName('untimeout').setDescription('Lift a timeout')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)),
  async execute(i) {
    const m = i.options.getMember('member');
    if (!m) return reply(i, 'Member not found.');
    await m.timeout(null, i.user.tag);
    await log(i, addCase(i, 'Untimeout', m.id, 'Timeout lifted'), m.user.tag);
    return reply(i, `Lifted the timeout on ${m.user.tag}.`);
  },
};

const warn = {
  data: new SlashCommandBuilder().setName('warn').setDescription('Warn a member')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true)),
  async execute(i) {
    const m = i.options.getMember('member');
    if (!m) return reply(i, 'Member not found.');
    const err = hierarchyError(i, m); if (err) return reply(i, err);
    const reason = i.options.getString('reason');
    const c = addCase(i, 'Warn', m.id, reason);
    const count = data.cases.filter((x) => x.type === 'Warn' && x.userId === m.id && !x.removed).length;
    await dm(m.user, `You received a warning in **${i.guild.name}**: ${reason} (warning ${count})`);
    await log(i, c, m.user.tag);
    let extra = '';
    if (count >= WARN_TIMEOUT_AT && count % WARN_TIMEOUT_AT === 0) {
      await m.timeout(WARN_TIMEOUT_MIN * 60000, `Reached ${count} warnings`).catch(() => {});
      extra = ` They reached ${count} warnings and were timed out for ${WARN_TIMEOUT_MIN} min.`;
    }
    return reply(i, `Warned ${m.user.tag} (case #${c.id}, ${count} active).${extra}`);
  },
};

const warnings = {
  data: new SlashCommandBuilder().setName('warnings').setDescription('List the moderation record of a member')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)),
  async execute(i) {
    const u = i.options.getUser('member');
    const list = data.cases.filter((c) => c.userId === u.id).slice(-15);
    if (!list.length) return reply(i, `${u.tag} has a clean record.`);
    const lines = list.map((c) => `**#${c.id}** ${c.type}${c.removed ? ' (removed)' : ''} <t:${Math.floor(c.at / 1000)}:d>: ${c.reason}`);
    return i.reply({ embeds: [embed(`Record: ${u.tag}`, lines.join('\n'), COLORS.grey)], ephemeral: true });
  },
};

const delwarn = {
  data: new SlashCommandBuilder().setName('delwarn').setDescription('Remove a warning by case number')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addIntegerOption((o) => o.setName('case').setDescription('Case number').setRequired(true)),
  async execute(i) {
    const c = data.cases.find((x) => x.id === i.options.getInteger('case') && x.type === 'Warn');
    if (!c) return reply(i, 'No warning with that case number.');
    c.removed = true; save();
    await modlog(i.guild, embed(`Case #${c.id} removed`, `Warning for <@${c.userId}> removed by <@${i.user.id}>.`, COLORS.grey));
    return reply(i, `Warning #${c.id} removed.`);
  },
};

const purge = {
  data: new SlashCommandBuilder().setName('purge').setDescription('Delete recent messages')
    .setDefaultMemberPermissions(PF.ManageMessages)
    .addIntegerOption((o) => o.setName('count').setDescription('How many (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('member').setDescription('Only this member')),
  async execute(i) {
    await i.deferReply({ ephemeral: true });
    const user = i.options.getUser('member');
    let msgs = await i.channel.messages.fetch({ limit: 100 });
    if (user) msgs = msgs.filter((m) => m.author.id === user.id);
    const del = await i.channel.bulkDelete([...msgs.values()].slice(0, i.options.getInteger('count')), true);
    await modlog(i.guild, embed('Purge', `<@${i.user.id}> deleted ${del.size} messages in <#${i.channelId}>${user ? ` from ${user.tag}` : ''}.`, COLORS.grey));
    return reply(i, `Deleted ${del.size} messages (messages older than 14 days cannot be bulk deleted).`);
  },
};

const slowmode = {
  data: new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode in this channel')
    .setDefaultMemberPermissions(PF.ManageChannels)
    .addIntegerOption((o) => o.setName('seconds').setDescription('0 turns it off').setRequired(true).setMinValue(0).setMaxValue(21600)),
  async execute(i) {
    const s = i.options.getInteger('seconds');
    await i.channel.setRateLimitPerUser(s);
    return reply(i, s ? `Slowmode set to ${s}s.` : 'Slowmode off.');
  },
};

export default [kick, ban, unban, timeout, untimeout, warn, warnings, delwarn, purge, slowmode];
