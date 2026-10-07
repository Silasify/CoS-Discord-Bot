import {
  ActionRowBuilder, AutoModerationActionType, AutoModerationRuleEventType, AutoModerationRuleTriggerType,
  ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder, PermissionFlagsBits as PF,
} from 'discord.js';
import { CH, COLORS, ROLE_GROUPS } from '../config.js';
import { embed, findChannel, findRole, reply } from '../lib/util.js';

async function rolesPanel(i) {
  const missing = [];
  const rows = [];
  for (const g of ROLE_GROUPS) {
    const opts = g.options.filter((n) => (findRole(i.guild, n) ? true : (missing.push(n), false)));
    if (!opts.length) continue;
    rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId(`rr:${g.id}`).setPlaceholder(g.max === 1 ? `${g.title}: choose one` : `${g.title}: choose any`)
      .setMinValues(0).setMaxValues(Math.min(g.max, opts.length))
      .addOptions(opts.map((n) => ({ label: n.replace(/^Path: /, '').replace(/^House /, ''), value: n })))));
  }
  const e = embed('Choose your roles',
    'Pick your House, path, platform and playstyle, and opt in to pings.\nEach menu replaces your previous choice for that group. Choose nothing to clear it.', COLORS.gold);
  await i.channel.send({ embeds: [e], components: rows });
  return reply(i, `Role panel posted.${missing.length ? ` Missing roles skipped: ${missing.join(', ')}` : ''}`);
}

async function instructorPanel(i) {
  const e = embed('Request an instructor',
    'New Recruit, or stuck on something? Press the button, tell us what you need, and a Burseg will take you in hand.');
  await i.channel.send({
    embeds: [e],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ins:request').setLabel('Request an instructor').setEmoji('🎓').setStyle(ButtonStyle.Primary))],
  });
  return reply(i, 'Instructor panel posted.');
}

async function automod(i) {
  await i.deferReply({ ephemeral: true });
  const log = findChannel(i.guild, CH.modlog);
  const exempt = ['Burseg', 'Bashar', 'Supreme Bashar'].map((n) => findRole(i.guild, n)?.id).filter(Boolean);
  const actions = (alert) => [
    { type: AutoModerationActionType.BlockMessage },
    ...(log && alert ? [{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: log } }] : []),
  ];
  const rules = [
    { name: 'Salusa: no invite links', triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: { regexPatterns: ['(?:discord\\.gg|discord(?:app)?\\.com/invite)/\\w+'] }, actions: actions(true) },
    { name: 'Salusa: mention spam', triggerType: AutoModerationRuleTriggerType.MentionSpam,
      triggerMetadata: { mentionTotalLimit: 8 }, actions: actions(true) },
    { name: 'Salusa: spam content', triggerType: AutoModerationRuleTriggerType.Spam, actions: actions(true) },
  ];
  const existing = await i.guild.autoModerationRules.fetch();
  const out = [];
  for (const r of rules) {
    if (existing.some((x) => x.name === r.name)) { out.push(`exists: ${r.name}`); continue; }
    try {
      await i.guild.autoModerationRules.create({ ...r, eventType: AutoModerationRuleEventType.MessageSend, enabled: true, exemptRoles: exempt.slice(0, 20) });
      out.push(`created: ${r.name}`);
    } catch (e) { out.push(`failed: ${r.name} (${e.message})`); }
  }
  return reply(i, out.join('\n'));
}

const panel = {
  data: new SlashCommandBuilder().setName('panel').setDescription('Post interactive panels in this channel (administrators)')
    .setDefaultMemberPermissions(PF.Administrator)
    .addSubcommand((s) => s.setName('roles').setDescription('Reaction-role menus for House, path, platform, playstyle and pings'))
    .addSubcommand((s) => s.setName('instructor').setDescription('The request-an-instructor button')),
  execute: (i) => ({ roles: rolesPanel, instructor: instructorPanel })[i.options.getSubcommand()](i),
};

const automodCmd = {
  data: new SlashCommandBuilder().setName('automod').setDescription('Create the guild AutoMod rules (administrators)')
    .setDefaultMemberPermissions(PF.Administrator),
  execute: automod,
};

export default [panel, automodCmd];
