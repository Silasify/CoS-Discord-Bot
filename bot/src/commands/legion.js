import { SlashCommandBuilder, PermissionFlagsBits as PF } from 'discord.js';
import { CH, COLORS, ENTRY_RANK, GATE_ROLE, RANKS } from '../config.js';
import { nextReset } from '../lib/time.js';
import { atLeast, embed, findChannel, findRole, hierarchyError, modlog, rankOf, reply } from '../lib/util.js';

const dm = (user, text) => user.send(text).catch(() => {});

const accept = {
  data: new SlashCommandBuilder().setName('accept').setDescription('Accept an applicant into the Legion (Burseg+)')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('The applicant').setRequired(true)),
  async execute(i) {
    if (!atLeast(i.member, 'Burseg')) return reply(i, 'Only a Burseg or higher can accept applicants.');
    const m = i.options.getMember('member');
    if (!m) return reply(i, 'That user is not in the server.');
    const recruit = findRole(i.guild, ENTRY_RANK);
    if (!recruit) return reply(i, `The role "${ENTRY_RANK}" does not exist. Run setup-server.js first.`);
    if (rankOf(m) >= 0) return reply(i, `${m.user.tag} already holds a rank.`);
    await m.roles.add(recruit, `Accepted by ${i.user.tag}`);
    const gate = findRole(i.guild, GATE_ROLE);
    if (gate && m.roles.cache.has(gate.id)) await m.roles.remove(gate, 'Accepted');
    await dm(m.user, `You have been accepted into **${i.guild.name}**. Welcome, Recruit. Ask for an instructor in the request-an-instructor channel.`);
    const ch = findChannel(i.guild, CH.announce);
    if (ch) await ch.send({ content: `<@${m.id}>`, embeds: [embed('A new Recruit joins the Legion', `${m} has been accepted by ${i.user}. Forged in fire, loyal to the Throne.`)] });
    await modlog(i.guild, embed('Application accepted', `${m} accepted by ${i.user}.`, COLORS.gold));
    return reply(i, `${m.user.tag} is now a Recruit.`);
  },
};

const reject = {
  data: new SlashCommandBuilder().setName('reject').setDescription('Decline an applicant (Burseg+)')
    .setDefaultMemberPermissions(PF.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('The applicant').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Sent to the applicant by DM').setRequired(true)),
  async execute(i) {
    if (!atLeast(i.member, 'Burseg')) return reply(i, 'Only a Burseg or higher can decline applicants.');
    const u = i.options.getUser('member');
    const reason = i.options.getString('reason');
    await dm(u, `Your application to **${i.guild.name}** was not successful: ${reason}`);
    await modlog(i.guild, embed('Application declined', `${u} declined by ${i.user}.\n**Reason:** ${reason}`, COLORS.red));
    return reply(i, `${u.tag} was notified.`);
  },
};

async function move(i, dir) {
  if (!atLeast(i.member, 'Burseg')) return reply(i, 'Only a Burseg or higher can change ranks.');
  const m = i.options.getMember('member');
  if (!m) return reply(i, 'Member not found.');
  const err = hierarchyError(i, m); if (err) return reply(i, err);
  let curIdx = -1; // Supreme Bashar is set by hand, so it is not on the ladder here
  RANKS.slice(0, -1).forEach((n, idx) => { if (m.roles.cache.some((r) => r.name === n)) curIdx = idx; });
  if (curIdx === -1) return reply(i, 'That member has no rank yet. Use /accept first.');
  const next = curIdx + dir;
  if (next < 0) return reply(i, 'They are already at the lowest rank. Use /kick to remove them.');
  if (next >= RANKS.length - 1) return reply(i, 'Supreme Bashar is granted by hand, not by the bot.');
  if (!i.member.permissions.has('Administrator') && next >= rankOf(i.member)) return reply(i, 'You can only promote members to a rank below your own.');
  const newRole = findRole(i.guild, RANKS[next]);
  const oldRole = findRole(i.guild, RANKS[curIdx]);
  if (!newRole || !oldRole) return reply(i, 'A rank role is missing. Run setup-server.js first.');
  await m.roles.add(newRole, `By ${i.user.tag}`);
  await m.roles.remove(oldRole, `By ${i.user.tag}`);
  const word = dir > 0 ? 'promoted' : 'demoted';
  const ch = findChannel(i.guild, CH.announce);
  if (dir > 0 && ch) await ch.send({ embeds: [embed('Promotion', `${m} has risen from **${oldRole.name}** to **${newRole.name}**.`)] });
  await modlog(i.guild, embed(`Member ${word}`, `${m} ${word} from ${oldRole.name} to ${newRole.name} by ${i.user}.`, COLORS.grey));
  return reply(i, `${m.user.tag} ${word} to ${newRole.name}.`);
}

const rankOpts = (b) => b.setDefaultMemberPermissions(PF.ModerateMembers)
  .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true));

const promote = {
  data: rankOpts(new SlashCommandBuilder().setName('promote').setDescription('Raise a member one rank (Burseg+)')),
  execute: (i) => move(i, 1),
};
const demote = {
  data: rankOpts(new SlashCommandBuilder().setName('demote').setDescription('Lower a member one rank (Burseg+)')),
  execute: (i) => move(i, -1),
};

const reset = {
  data: new SlashCommandBuilder().setName('reset').setDescription('Time until the next weekly Arrakis reset'),
  async execute(i) {
    const t = nextReset();
    return i.reply({ embeds: [embed('Weekly reset', `The next reset is <t:${t}:F>, <t:${t}:R>.\nPlan your Deep Desert runs and hand-ins before then.`)] });
  },
};

export default [accept, reject, promote, demote, reset];
