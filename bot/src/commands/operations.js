import { ChannelType, GuildScheduledEventEntityType, EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildScheduledEventPrivacyLevel } from 'discord.js';
import { COLORS, env, OP_TYPES } from '../config.js';
import { data, save } from '../lib/store.js';
import { parseWhen, validTz } from '../lib/time.js';
import { atLeast, findChannel, findRole, reply } from '../lib/util.js';

const STATUS = { yes: '✅ Attending', maybe: '❔ Maybe', no: '❌ Cannot come' };

export function opEmbed(op) {
  const by = (s) => Object.entries(op.rsvp).filter(([, v]) => v === s).map(([id]) => `<@${id}>`);
  const field = (s) => {
    const l = by(s);
    return { name: `${STATUS[s]} (${l.length})`, value: l.length ? l.slice(0, 30).join(', ') : '—', inline: false };
  };
  const e = new EmbedBuilder().setColor(op.cancelled ? COLORS.grey : COLORS.gold)
    .setTitle(`${op.cancelled ? '[CANCELLED] ' : ''}${op.type}: ${op.title}`)
    .setDescription(`**When:** <t:${op.start}:F> (<t:${op.start}:R>)\n**Duration:** ${op.duration} min\n**Host:** <@${op.hostId}>${op.desc ? `\n\n${op.desc}` : ''}`)
    .addFields(field('yes'), field('maybe'), field('no'))
    .setFooter({ text: `Operation ${op.id}` });
  return e;
}

export const opButtons = (op) => new ActionRowBuilder().addComponents(
  ...['yes', 'maybe', 'no'].map((s) => new ButtonBuilder().setCustomId(`op:${op.id}:${s}`).setLabel(STATUS[s].slice(2).trim())
    .setEmoji(STATUS[s].slice(0, 1)).setStyle(s === 'yes' ? ButtonStyle.Success : s === 'no' ? ButtonStyle.Danger : ButtonStyle.Secondary).setDisabled(!!op.cancelled)),
);

const types = Object.keys(OP_TYPES).map((t) => ({ name: t, value: t }));
const newId = () => Math.random().toString(36).slice(2, 7);

async function create(i) {
  if (!atLeast(i.member, 'Captain')) return reply(i, 'Only a Captain or higher can schedule operations.');
  const tz = i.options.getString('timezone') || env.tz;
  if (!validTz(tz)) return reply(i, `Unknown timezone "${tz}". Use an IANA name such as Europe/Berlin or America/New_York.`);
  const start = parseWhen(i.options.getString('date'), i.options.getString('time'), tz);
  if (!start) return reply(i, 'Date must look like 2026-10-10 and time like 20:00.');
  if (start * 1000 < Date.now()) return reply(i, 'That time is in the past.');
  await i.deferReply({ ephemeral: true });

  const type = i.options.getString('type');
  const cfg = OP_TYPES[type];
  const op = {
    id: newId(), type, title: i.options.getString('title'), start, tz,
    duration: i.options.getInteger('duration') || 120, hostId: (i.options.getUser('host') || i.user).id,
    desc: i.options.getString('details') || '', rsvp: {}, reminded: false, cancelled: false,
  };
  op.rsvp[op.hostId] = 'yes';

  const ch = findChannel(i.guild, cfg.channel) || i.channel;
  const ping = findRole(i.guild, cfg.ping);
  const msg = await ch.send({
    content: ping ? `${ping}` : undefined, embeds: [opEmbed(op)], components: [opButtons(op)],
    allowedMentions: { roles: ping ? [ping.id] : [] },
  });
  op.channelId = ch.id; op.messageId = msg.id;

  try {
    const voice = i.options.getChannel('voice');
    const base = {
      name: `${type}: ${op.title}`.slice(0, 100), scheduledStartTime: new Date(start * 1000),
      scheduledEndTime: new Date((start + op.duration * 60) * 1000), privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      description: `${op.desc}\nSign up: ${msg.url}`.slice(0, 1000),
    };
    const ev = await i.guild.scheduledEvents.create(voice
      ? { ...base, entityType: voice.type === ChannelType.GuildStageVoice ? GuildScheduledEventEntityType.StageInstance : GuildScheduledEventEntityType.Voice, channel: voice }
      : { ...base, entityType: GuildScheduledEventEntityType.External, entityMetadata: { location: 'Arrakis' } });
    op.eventId = ev.id;
  } catch (e) {
    console.warn('Could not create the Discord scheduled event:', e.message);
  }
  data.operations[op.id] = op; save();
  return reply(i, `Operation **${op.title}** scheduled (id \`${op.id}\`): ${msg.url}${op.eventId ? '' : '\nThe Discord event could not be created (check the bot has Manage Events).'}`);
}

async function cancel(i) {
  const op = data.operations[i.options.getString('id')];
  if (!op || op.cancelled) return reply(i, 'No active operation with that id.');
  if (op.hostId !== i.user.id && !atLeast(i.member, 'Bashar')) return reply(i, 'Only the host or a Bashar can cancel it.');
  op.cancelled = true; save();
  const msg = await i.guild.channels.cache.get(op.channelId)?.messages.fetch(op.messageId).catch(() => null);
  if (msg) await msg.edit({ embeds: [opEmbed(op)], components: [opButtons(op)] });
  if (op.eventId) await i.guild.scheduledEvents.delete(op.eventId).catch(() => {});
  return reply(i, `Operation \`${op.id}\` cancelled.`);
}

async function list(i) {
  const ops = Object.values(data.operations).filter((o) => !o.cancelled && o.start * 1000 > Date.now() - 3 * 3600e3).sort((a, b) => a.start - b.start);
  if (!ops.length) return reply(i, 'No operations scheduled.');
  const lines = ops.map((o) => `\`${o.id}\` **${o.type}: ${o.title}** <t:${o.start}:F> (<t:${o.start}:R>), ${Object.values(o.rsvp).filter((v) => v === 'yes').length} attending`);
  return i.reply({ content: lines.join('\n'), ephemeral: true });
}

const operation = {
  data: new SlashCommandBuilder().setName('operation').setDescription('Expeditions, raids and training sessions')
    .addSubcommand((s) => s.setName('create').setDescription('Schedule an operation with sign-ups (Captain+)')
      .addStringOption((o) => o.setName('type').setDescription('Kind of operation').setRequired(true).addChoices(...types))
      .addStringOption((o) => o.setName('title').setDescription('Title').setRequired(true).setMaxLength(80))
      .addStringOption((o) => o.setName('date').setDescription('YYYY-MM-DD').setRequired(true))
      .addStringOption((o) => o.setName('time').setDescription('HH:MM (24h)').setRequired(true))
      .addStringOption((o) => o.setName('timezone').setDescription(`IANA timezone (default ${env.tz})`))
      .addIntegerOption((o) => o.setName('duration').setDescription('Minutes (default 120)').setMinValue(15).setMaxValue(1440))
      .addUserOption((o) => o.setName('host').setDescription('Host (default: you)'))
      .addStringOption((o) => o.setName('details').setDescription('Briefing: what to bring, where to meet').setMaxLength(800))
      .addChannelOption((o) => o.setName('voice').setDescription('Voice channel for the Discord event').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)))
    .addSubcommand((s) => s.setName('list').setDescription('Upcoming operations'))
    .addSubcommand((s) => s.setName('cancel').setDescription('Cancel an operation')
      .addStringOption((o) => o.setName('id').setDescription('Operation id (see /operation list)').setRequired(true))),
  execute: (i) => ({ create, list, cancel })[i.options.getSubcommand()](i),
};

export default [operation];
