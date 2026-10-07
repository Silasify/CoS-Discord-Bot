import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, SlashCommandBuilder,
  TextInputBuilder, TextInputStyle, PermissionFlagsBits as PF,
} from 'discord.js';
import { COLORS } from '../config.js';
import { reply } from '../lib/util.js';

// Server owner or the Supreme Bashar role only
const allowed = (m) => m.id === m.guild.ownerId || m.roles.cache.some((r) => r.name === 'Supreme Bashar');
const DENIED = 'Only the server owner and the Supreme Bashar can use the embed editor.';

// One editing session per user, kept in memory (a restart ends open sessions).
const sessions = new Map();

const isUrl = (s) => /^https?:\/\/\S+$/i.test(s);
const hex = (s) => /^#?[0-9a-f]{6}$/i.test(s.trim());

// <#channel-name> -> <#id>, <@&Role Name> -> <@&id>. Real IDs and unknown names are left alone.
const norm = (n) => n.trim().replace(/^#/, '').toLowerCase();
export function resolveMentions(guild, text) {
  if (!text) return text;
  const swap = (m, n, prefix, pool, key) => {
    if (/^\d+$/.test(n)) return m;
    const hit = pool.cache.find((x) => key(x) === norm(n));
    return hit ? `<${prefix}${hit.id}>` : m;
  };
  return text
    .replace(/<#([^>]+)>/g, (m, n) => swap(m, n, '#', guild.channels, (c) => c.name.toLowerCase()))
    .replace(/<@&([^>]+)>/g, (m, n) => swap(m, n, '@&', guild.roles, (r) => r.name.toLowerCase()));
}

function preview(s) {
  const d = { ...s.data };
  if (s.guild) {   // only description and field values render mentions
    d.description = resolveMentions(s.guild, d.description);
    if (d.fields) d.fields = d.fields.map((f) => ({ ...f, value: resolveMentions(s.guild, f.value) }));
  }
  if (!d.title && !d.description && !d.fields?.length && !d.image && !d.thumbnail && !d.author && !d.footer) d.description = '*(empty embed: use the buttons below)*';
  if (d.color === undefined) d.color = COLORS.gold;
  return new EmbedBuilder(d);
}

const btn = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(`emb:${id}`).setLabel(label).setStyle(style);
const rows = (s) => [
  new ActionRowBuilder().addComponents(btn('main', 'Title / text / colour'), btn('extra', 'Author / footer / images'),
    btn('field', 'Add field'), btn('unfield', 'Remove last field')),
  new ActionRowBuilder().addComponents(btn('json', 'Import JSON'), btn('send', s.edit ? 'Save changes' : `Send to #${s.channelName}`, ButtonStyle.Success), btn('cancel', 'Cancel', ButtonStyle.Danger)),
];

const view = (s, content) => ({
  content: content || (s.edit ? 'Editing an existing embed. Nothing changes until you press Save.' : 'Live preview. Nothing is posted until you press Send.'),
  embeds: [preview(s)], components: rows(s),
});

const input = (id, label, o = {}) => {
  const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(o.long ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(!!o.required).setMaxLength(o.max || 256);
  if (o.value) t.setValue(String(o.value).slice(0, o.max || 256));
  if (o.ph) t.setPlaceholder(o.ph);
  return new ActionRowBuilder().addComponents(t);
};

function modalFor(kind, s) {
  const d = s.data;
  if (kind === 'main') {
    return new ModalBuilder().setCustomId('emb:m:main').setTitle('Embed text').addComponents(
      input('title', 'Title', { value: d.title, max: 256 }),
      input('description', 'Description (Discord markdown works)', { value: d.description, max: 4000, long: true }),
      input('color', 'Colour (hex, e.g. #D4A24C)', { value: d.color !== undefined ? '#' + d.color.toString(16).padStart(6, '0') : '', max: 7 }),
      input('url', 'Title link (optional URL)', { value: d.url, max: 500 }));
  }
  if (kind === 'extra') {
    return new ModalBuilder().setCustomId('emb:m:extra').setTitle('Author, footer, images').addComponents(
      input('author', 'Author name', { value: d.author?.name, max: 256 }),
      input('footer', 'Footer text', { value: d.footer?.text, max: 2048 }),
      input('thumbnail', 'Thumbnail image URL (small, top right)', { value: d.thumbnail?.url, max: 500 }),
      input('image', 'Large image URL', { value: d.image?.url, max: 500 }),
      input('timestamp', 'Show timestamp? (yes / no)', { value: d.timestamp ? 'yes' : 'no', max: 3 }));
  }
  if (kind === 'field') {
    return new ModalBuilder().setCustomId('emb:m:field').setTitle('Add a field').addComponents(
      input('name', 'Field name', { required: true, max: 256 }),
      input('value', 'Field value', { required: true, max: 1024, long: true }),
      input('inline', 'Inline? (yes / no)', { value: 'no', max: 3 }));
  }
  return new ModalBuilder().setCustomId('emb:m:json').setTitle('Import embed JSON').addComponents(
    input('json', 'Embed JSON (replaces the current embed)', { required: true, max: 4000, long: true, ph: '{"title":"Hello","description":"World","color":13803084}' }));
}

function parseLink(link) {
  const m = /channels\/(\d+)\/(\d+)\/(\d+)/.exec(link || '');
  return m ? { guildId: m[1], channelId: m[2], messageId: m[3] } : null;
}

async function create(i) {
  if (!allowed(i.member)) return reply(i, DENIED);
  const ch = i.options.getChannel('channel') || i.channel;
  const s = { guild: i.guild, data: { color: COLORS.gold }, channelId: ch.id, channelName: ch.name };
  sessions.set(i.user.id, s);
  return i.reply({ ...view(s), ephemeral: true });
}

async function edit(i) {
  if (!allowed(i.member)) return reply(i, DENIED);
  const ref = parseLink(i.options.getString('message'));
  if (!ref || ref.guildId !== i.guildId) return reply(i, 'Give me a message link from this server (right-click the message, Copy Message Link).');
  const ch = i.guild.channels.cache.get(ref.channelId);
  const msg = await ch?.messages?.fetch(ref.messageId).catch(() => null);
  if (!msg) return reply(i, 'I could not find that message.');
  if (msg.author.id !== i.client.user.id) return reply(i, 'I can only edit embeds that I posted myself.');
  if (!msg.embeds.length) return reply(i, 'That message has no embed.');
  const s = { guild: i.guild, data: msg.embeds[0].toJSON(), channelId: ch.id, channelName: ch.name, edit: { channelId: ch.id, messageId: msg.id } };
  sessions.set(i.user.id, s);
  return i.reply({ ...view(s), ephemeral: true });
}

const embedCmd = {
  data: new SlashCommandBuilder().setName('embed').setDescription('Build or edit an embed with a live preview (owner and Supreme Bashar)')
    .setDefaultMemberPermissions(PF.Administrator)
    .addSubcommand((s) => s.setName('create').setDescription('Build a new embed')
      .addChannelOption((o) => o.setName('channel').setDescription('Where to post it (default: this channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('edit').setDescription('Edit an embed that the bot posted')
      .addStringOption((o) => o.setName('message').setDescription('Link to the message (Copy Message Link)').setRequired(true))),
  execute: (i) => (i.options.getSubcommand() === 'create' ? create(i) : edit(i)),
};

export default [embedCmd];

// ----- component handlers (called from events/interactions.js) -----
const expired = (i) => i.reply({ content: 'This editor session has expired. Run /embed again.', ephemeral: true });

export async function embedButton(i) {
  const s = sessions.get(i.user.id);
  if (!s) return expired(i);
  if (!allowed(i.member)) return i.reply({ content: DENIED, ephemeral: true });
  const action = i.customId.split(':')[1];
  if (['main', 'extra', 'field', 'json'].includes(action)) return i.showModal(modalFor(action, s));
  if (action === 'unfield') { s.data.fields?.pop(); return i.update(view(s)); }
  if (action === 'cancel') { sessions.delete(i.user.id); return i.update({ content: 'Cancelled.', embeds: [], components: [] }); }
  if (action === 'send') {
    const e = preview(s);
    if (e.data.description === '*(empty embed: use the buttons below)*') return i.reply({ content: 'The embed is empty.', ephemeral: true });
    try {
      let url;
      if (s.edit) {
        const m = await i.guild.channels.cache.get(s.edit.channelId).messages.fetch(s.edit.messageId);
        await m.edit({ embeds: [e] });
        url = m.url;
      } else {
        const m = await i.guild.channels.cache.get(s.channelId).send({ embeds: [e] });
        url = m.url;
      }
      sessions.delete(i.user.id);
      return i.update({ content: `${s.edit ? 'Updated' : 'Posted'}: ${url}`, embeds: [], components: [] });
    } catch (err) {
      return i.reply({ content: `Could not post it: ${err.message}`, ephemeral: true });
    }
  }
}

export async function embedModal(i) {
  const s = sessions.get(i.user.id);
  if (!s) return expired(i);
  if (!allowed(i.member)) return i.reply({ content: DENIED, ephemeral: true });
  const kind = i.customId.split(':')[2];
  const v = (k) => i.fields.getTextInputValue(k).trim();
  const d = structuredClone(s.data);   // work on a copy so a rejected edit changes nothing
  const bad = (m) => i.reply({ content: m, ephemeral: true });
  const set = (k, val) => { if (val) d[k] = val; else delete d[k]; };

  if (kind === 'main') {
    if (v('color') && !hex(v('color'))) return bad('Colour must be a hex code such as #D4A24C.');
    if (v('url') && !isUrl(v('url'))) return bad('The title link must start with http:// or https://');
    set('title', v('title')); set('description', v('description')); set('url', v('url'));
    d.color = v('color') ? parseInt(v('color').replace('#', ''), 16) : COLORS.gold;
  } else if (kind === 'extra') {
    for (const k of ['thumbnail', 'image']) if (v(k) && !isUrl(v(k))) return bad(`The ${k} must be an http(s) image URL.`);
    set('author', v('author') ? { name: v('author') } : null);
    set('footer', v('footer') ? { text: v('footer') } : null);
    set('thumbnail', v('thumbnail') ? { url: v('thumbnail') } : null);
    set('image', v('image') ? { url: v('image') } : null);
    set('timestamp', /^y/i.test(v('timestamp')) ? (d.timestamp || new Date().toISOString()) : null);
  } else if (kind === 'field') {
    if ((d.fields?.length || 0) >= 25) return bad('An embed can hold at most 25 fields.');
    d.fields = [...(d.fields || []), { name: v('name'), value: v('value'), inline: /^y/i.test(v('inline')) }];
  } else if (kind === 'json') {
    try {
      const j = JSON.parse(v('json'));
      if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('JSON must be a single embed object.');
      new EmbedBuilder(j).toJSON();
      Object.keys(d).forEach((k) => delete d[k]);
      Object.assign(d, j);
    } catch (err) { return bad(`Invalid embed JSON: ${err.message}`); }
  }
  try {
    const e = preview({ data: d, guild: s.guild });
    e.toJSON();
    if (e.length > 6000) throw new Error('Embeds are limited to 6000 characters in total.');
  } catch (err) {
    return bad(`That would make an invalid embed: ${err.message}. Your previous version is unchanged.`);
  }
  s.data = d;
  return i.update(view(s));
}
