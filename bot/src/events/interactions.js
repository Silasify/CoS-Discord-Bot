import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { ROLE_GROUPS } from '../config.js';
import { commands } from '../lib/commands.js';
import { opButtons, opEmbed } from '../commands/operations.js';
import { data, save } from '../lib/store.js';
import { atLeast, embed, findRole, reply } from '../lib/util.js';

// ----- role menus -----
async function roleMenu(i, groupId) {
  const g = ROLE_GROUPS.find((x) => x.id === groupId);
  if (!g) return;
  await i.deferReply({ ephemeral: true });
  const chosen = new Set(i.values);
  const add = [], remove = [];
  for (const name of g.options) {
    const role = findRole(i.guild, name);
    if (!role) continue;
    const has = i.member.roles.cache.has(role.id);
    if (chosen.has(name) && !has) add.push(role);
    if (!chosen.has(name) && has) remove.push(role);
  }
  try {
    if (add.length) await i.member.roles.add(add);
    if (remove.length) await i.member.roles.remove(remove);
  } catch {
    return reply(i, 'I could not change your roles. A staff member needs to move my role above the self-assign roles.');
  }
  const now = g.options.filter((n) => chosen.has(n));
  return reply(i, `${g.title} updated: ${now.length ? now.join(', ') : 'none'}.`);
}

// ----- operation sign-ups -----
async function rsvp(i, id, status) {
  const op = data.operations[id];
  if (!op || op.cancelled) return i.reply({ content: 'This operation is no longer active.', ephemeral: true });
  if (op.rsvp[i.user.id] === status) delete op.rsvp[i.user.id]; else op.rsvp[i.user.id] = status;
  save();
  return i.update({ embeds: [opEmbed(op)], components: [opButtons(op)] });
}

// ----- instructor requests -----
const insRow = (userId, claimed) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`ins:claim:${userId}`).setLabel(claimed ? 'Claimed' : 'Claim').setStyle(ButtonStyle.Success).setDisabled(claimed),
  new ButtonBuilder().setCustomId(`ins:close:${userId}`).setLabel('Close').setStyle(ButtonStyle.Secondary),
);

function insModal() {
  return new ModalBuilder().setCustomId('ins:modal').setTitle('Request an instructor').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('topic').setLabel('What do you need help with?')
      .setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)));
}

async function insCreate(i) {
  await i.deferReply({ ephemeral: true });
  const topic = i.fields.getTextInputValue('topic');
  const parent = i.channel.isThread() ? i.channel.parent : i.channel;
  const thread = await parent.threads.create({
    name: `instructor-${i.user.username}`.slice(0, 100), type: ChannelType.PublicThread, autoArchiveDuration: 1440,
    reason: `Instructor request by ${i.user.tag}`,
  });
  const burseg = findRole(i.guild, 'Burseg');
  await thread.send({
    content: `${burseg ?? ''} ${i.user}`.trim(),
    embeds: [embed('Instructor requested', `**From:** ${i.user}\n**Needs help with:** ${topic}`)],
    components: [insRow(i.user.id, false)],
    allowedMentions: { users: [i.user.id], roles: burseg ? [burseg.id] : [] },
  });
  return reply(i, `Your request is open in ${thread}. A Burseg will be with you soon.`);
}

async function insClaim(i, userId) {
  if (!atLeast(i.member, 'Burseg')) return i.reply({ content: 'Only a Burseg can claim requests.', ephemeral: true });
  await i.update({ components: [insRow(userId, true)] });
  return i.channel.send({ content: `${i.user} will instruct <@${userId}>.`, allowedMentions: { users: [userId, i.user.id] } });
}

async function insClose(i, userId) {
  if (i.user.id !== userId && !atLeast(i.member, 'Burseg')) return i.reply({ content: 'Only the requester or a Burseg can close this.', ephemeral: true });
  await i.reply('Request closed.');
  await i.channel.setLocked(true).catch(() => {});
  return i.channel.setArchived(true).catch(() => {});
}

export default async function interactionCreate(i) {
  try {
    if (i.isChatInputCommand()) {
      const cmd = commands.get(i.commandName);
      if (cmd) await cmd.execute(i);
    } else if (i.isStringSelectMenu() && i.customId.startsWith('rr:')) {
      await roleMenu(i, i.customId.slice(3));
    } else if (i.isButton()) {
      const [ns, a, b] = i.customId.split(':');
      if (ns === 'op') await rsvp(i, a, b);
      else if (ns === 'ins' && a === 'request') await i.showModal(insModal());
      else if (ns === 'ins' && a === 'claim') await insClaim(i, b);
      else if (ns === 'ins' && a === 'close') await insClose(i, b);
    } else if (i.isModalSubmit() && i.customId === 'ins:modal') {
      await insCreate(i);
    }
  } catch (e) {
    console.error(`Interaction error (${i.commandName || i.customId}):`, e);
    const msg = 'Something went wrong. The error has been logged.';
    if (i.deferred || i.replied) await i.editReply({ content: msg }).catch(() => {});
    else if (i.isRepliable()) await i.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
}
