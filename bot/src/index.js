import { Client, Events, GatewayIntentBits } from 'discord.js';
import { CH, COLORS, env, GATE_ROLE, REMINDER_MIN } from './config.js';
import { data, save } from './lib/store.js';
import { embed, findChannel, findRole, modlog } from './lib/util.js';
import interactionCreate from './events/interactions.js';

if (!env.token) { console.error('Set DISCORD_TOKEN in .env first.'); process.exit(1); }

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  for (const guild of c.guilds.cache.values()) {
    await guild.roles.fetch();
    if (!findRole(guild, GATE_ROLE)) {
      await guild.roles.create({ name: GATE_ROLE, color: 0x3a3a3a, permissions: [], reason: 'Gate role for new arrivals' })
        .then(() => console.log(`Created the ${GATE_ROLE} role in ${guild.name}`))
        .catch((e) => console.warn(`Could not create ${GATE_ROLE}: ${e.message}`));
    }
  }
  setInterval(reminders, 30_000);
  reminders();
});

client.on(Events.InteractionCreate, interactionCreate);

client.on(Events.GuildMemberAdd, async (m) => {
  if (m.user.bot) return;
  const gate = findRole(m.guild, GATE_ROLE);
  if (gate) await m.roles.add(gate, 'New arrival').catch(() => {});
  const ch = findChannel(m.guild, CH.welcome);
  if (ch) {
    await ch.send({
      content: `${m}`,
      embeds: [embed('An Outlander approaches', `Welcome to **${m.guild.name}**, ${m}.\nRead the Imperial Code, choose your roles, introduce yourself, then apply on our website.`)],
      allowedMentions: { users: [m.id] },
    }).catch(() => {});
  }
  await modlog(m.guild, embed('Member joined', `${m} (${m.user.tag}), account created <t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`, COLORS.grey));
});

client.on(Events.GuildMemberRemove, (m) =>
  modlog(m.guild, embed('Member left', `${m.user.tag} (${m.id})`, COLORS.grey)));
client.on(Events.GuildBanAdd, (b) => modlog(b.guild, embed('Ban', `${b.user.tag} (${b.user.id}) was banned.${b.reason ? `\n${b.reason}` : ''}`, COLORS.red)));
client.on(Events.GuildBanRemove, (b) => modlog(b.guild, embed('Unban', `${b.user.tag} (${b.user.id}) was unbanned.`, COLORS.grey)));

// Remind attendees shortly before an operation starts; drop old operations
async function reminders() {
  const now = Date.now() / 1000;
  let dirty = false;
  for (const [id, op] of Object.entries(data.operations)) {
    if (op.start < now - 3 * 86400) { delete data.operations[id]; dirty = true; continue; }
    if (op.cancelled || op.reminded || op.start - now > REMINDER_MIN * 60 || op.start < now - 600) continue;
    op.reminded = true; dirty = true;
    const ch = client.channels.cache.get(op.channelId);
    const who = Object.entries(op.rsvp).filter(([, v]) => v === 'yes').map(([u]) => u);
    await ch?.send({
      content: `⏰ **${op.title}** starts <t:${op.start}:R>.${who.length ? ` ${who.map((u) => `<@${u}>`).join(' ')}` : ''}`,
      allowedMentions: { users: who.slice(0, 50) },
    }).catch(() => {});
  }
  if (dirty) save();
}

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
client.login(env.token);
