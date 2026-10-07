#!/usr/bin/env node
/*
 * Children of Salusa: Discord server builder.
 *
 * Creates roles, categories, channels, permissions, the welcome texts and the
 * website webhook, following children-of-salusa-discord-blueprint.md.
 *
 * Safe to re-run: anything that already exists (matched by name) is skipped.
 *
 *   PowerShell:
 *     $env:DISCORD_TOKEN = "your bot token"
 *     $env:GUILD_ID      = "your server id"
 *     node setup-server.js --dry-run     # preview only
 *     node setup-server.js               # build it
 *
 * The bot must be in the server with the Administrator permission and its role
 * should be the highest role you want it to manage (move it to the top).
 * Requires Node 18+.
 */

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD = process.env.GUILD_ID;
const DRY = process.argv.includes('--dry-run');
const API = 'https://discord.com/api/v10';

if (!TOKEN || !GUILD) {
  console.error('Set DISCORD_TOKEN and GUILD_ID environment variables first.');
  process.exit(1);
}

// ---------- permission bits ----------
const P = {
  INVITE: 1n << 0n, KICK: 1n << 1n, ADMIN: 1n << 3n, REACT: 1n << 6n, STREAM: 1n << 9n,
  VIEW: 1n << 10n, SEND: 1n << 11n, MANAGE_MSG: 1n << 13n, EMBED: 1n << 14n, ATTACH: 1n << 15n,
  HISTORY: 1n << 16n, MENTION_ALL: 1n << 17n, EXT_EMOJI: 1n << 18n, CONNECT: 1n << 20n,
  SPEAK: 1n << 21n, MUTE: 1n << 22n, MOVE: 1n << 24n, VAD: 1n << 25n, NICK: 1n << 26n,
  MANAGE_NICK: 1n << 27n, MANAGE_EVENTS: 1n << 33n, MANAGE_THREADS: 1n << 34n,
  PUB_THREADS: 1n << 35n, SEND_THREADS: 1n << 38n, TIMEOUT: 1n << 40n, CREATE_EVENTS: 1n << 44n,
};
const sum = (...a) => a.reduce((x, y) => x | y, 0n);
const MEMBER = sum(P.INVITE, P.REACT, P.VIEW, P.SEND, P.EMBED, P.ATTACH, P.HISTORY, P.EXT_EMOJI,
  P.CONNECT, P.SPEAK, P.VAD, P.STREAM, P.NICK, P.PUB_THREADS, P.SEND_THREADS);

// ---------- roles, listed top (most senior) to bottom ----------
const RANKS = [
  { name: 'Supreme Bashar', color: 0xd4a24c, perms: P.ADMIN, hoist: true },
  { name: 'Bashar', color: 0xa32020, hoist: true,
    perms: sum(MEMBER, P.KICK, P.MANAGE_MSG, P.MUTE, P.MOVE, P.TIMEOUT, P.MANAGE_EVENTS, P.CREATE_EVENTS, P.MANAGE_THREADS, P.MENTION_ALL) },
  { name: 'Burseg', color: 0x8e44ad, hoist: true,
    perms: sum(MEMBER, P.MANAGE_MSG, P.MANAGE_NICK, P.MANAGE_THREADS, P.MUTE, P.TIMEOUT) },
  { name: 'Captain', color: 0xe0731f, hoist: true, perms: sum(MEMBER, P.CREATE_EVENTS) },
  { name: 'Legionnaire', color: 0x3b82f0, hoist: true, perms: MEMBER },
  { name: 'Recruit', color: 0x8a8a8a, hoist: true, perms: MEMBER },
];
const CAT_ROLES = ['Path: Mentat', 'Path: Bene Gesserit', 'Path: Swordmaster', 'Path: Trooper', 'Path: Planetologist',
  'House Corrino', 'House Atreides', 'House Harkonnen', 'House Fremen', 'House Neutral',
  'PC', 'PlayStation', 'Xbox',
  'PvE', 'PvP', 'Crafting', 'Trading', 'Exploration', 'Building', 'Spice Harvesting', 'Mentoring',
  'Raid Ping', 'Expedition Ping', 'Training Ping', 'Landsraad Ping', 'Social Ping', 'Announcements'];
const ROLE_COLORS = {
  'House Corrino': 0xd4a24c, 'House Atreides': 0x2e8b57, 'House Harkonnen': 0xb22222, 'House Fremen': 0x3b82f0, 'House Neutral': 0x888888,
};

// ---------- channel layout ----------
// access: 'public' (everyone), 'members' (Recruit and up), 'command' (Bashar/Burseg/Supreme only)
// ro: read-only for non-staff; writers: extra roles allowed to post in a read-only channel
const STAFF = ['Supreme Bashar', 'Bashar', 'Burseg'];
const MEMBERS_UP = ['Supreme Bashar', 'Bashar', 'Burseg', 'Captain', 'Legionnaire', 'Recruit'];
const LAYOUT = [
  { name: '🦅 IMPERIAL GATE', access: 'public', channels: [
    { name: 'welcome', ro: true, topic: 'Start here. Children of Salusa: forged in fire, loyal to the Throne.' },
    { name: 'imperial-code', ro: true, topic: 'The rules of the Legion.' },
    { name: 'enlist-here', ro: true, topic: 'How to apply to the Legion.' },
    { name: 'choose-your-role', ro: true, topic: 'Pick your House, path, platform and pings.' },
    { name: 'introductions', topic: 'Tell us who you are and how you play.' },
  ] },
  { name: '🔥 THE PARADE GROUND', access: 'members', channels: [
    { name: 'decrees', ro: true, writers: ['Supreme Bashar', 'Bashar'], topic: 'Official announcements.' },
    { name: 'herald-dispatches', ro: true, writers: [], topic: 'Automatic notices from the guild website: applications, events, chronicles.', webhook: 'Imperial Herald' },
    { name: 'general' }, { name: 'off-duty' }, { name: 'screenshots' }, { name: 'memes' },
  ] },
  { name: '🏜️ THEATRES OF WAR', access: 'members', channels: [
    { name: 'hagga-basin', topic: 'Starter region. Beginner questions welcome.' },
    { name: 'deep-desert', topic: 'High-risk operations, storm timing, rival crews.' },
    { name: 'arrakeen-and-harko', topic: 'Trade, Landsraad politics, neutral ground.' },
    { name: 'spice-and-trade', topic: 'Market prices, spice runs, deals.' },
    { name: 'fortifications', topic: 'Base building and defence.' },
  ] },
  { name: '📚 IMPERIAL ARCHIVES', access: 'members', channels: [
    { name: 'field-manuals', ro: true, writers: ['Supreme Bashar', 'Bashar', 'Burseg'], topic: 'Guides from the website. Survival, Skills, Spice, Building, Politics.' },
    { name: 'questions-and-orders', forum: true, topic: 'Ask for help. Tag your question: Survival, Skills, Spice, Building, Politics.',
      tags: ['Survival', 'Skills', 'Spice', 'Building', 'Politics'] },
    { name: 'lore-of-salusa', topic: 'Dune lore, the Houses, Sardaukar history.' },
  ] },
  { name: '⚔️ THE WAR ROOM', access: 'members', channels: [
    { name: 'operations-calendar', ro: true, writers: ['Supreme Bashar', 'Bashar', 'Captain'], topic: 'Scheduled operations.' },
    { name: 'raid-planning' },
    { name: 'expedition-orders', topic: 'Sign up for expeditions.' },
    { name: 'supply-depot', topic: 'Resource tracker and project progress.' },
    { name: 'spoils-of-war' },
  ] },
  { name: '🎓 TRAINING GROUNDS', access: 'members', channels: [
    { name: 'request-an-instructor', topic: 'Recruits: ask for a Burseg to guide you.' },
    { name: 'drill-sessions' },
  ] },
  { name: '🔊 VOICE', access: 'members', channels: [
    { name: '🔥 Salusa Barracks', voice: true },
    { name: '🏜️ Hagga Basin Squad', voice: true },
    { name: '🪱 Deep Desert Operation', voice: true },
    { name: '⚔️ War Room 1', voice: true },
    { name: '⚔️ War Room 2', voice: true },
    { name: '🛠️ Fortification Crew', voice: true },
    { name: '💤 Stood Down', voice: true },
    { name: '📣 Imperial Assembly', stage: true },
  ] },
  { name: '🔒 HIGH COMMAND', access: 'command', channels: [
    { name: 'applications', topic: 'Review queue for new applications.' },
    { name: 'command' }, { name: 'mod-log' },
    { name: '🔒 Command Voice', voice: true },
  ] },
];

// ---------- texts posted into read-only channels ----------
const TEXTS = {
  'welcome': `# Children of Salusa
*Forged in fire. Loyal to the Throne.*

We are a Dune: Awakening guild of builders, raiders, traders and scholars, forged on the prison world of Salusa Secundus and sworn to the Imperial banner. All Houses, all paths, all playstyles are welcome to walk with us.

**Begin here**
1. Read the Imperial Code in <#{imperial-code}>.
2. Pick your House, path and platform in <#{choose-your-role}>.
3. Introduce yourself in <#{introductions}>.
4. Apply to join: see <#{enlist-here}>.`,

  'imperial-code': `# The Imperial Code

**1. Loyalty to the Legion.** Stores, builds and knowledge belong to all of us. Support your squad.
**2. Discipline above all.** Follow your squad leader's orders on operations. Plan the retreat before the raid.
**3. House feuds stop at the gate.** Atreides, Harkonnen, Corrino or Fremen: out in the desert you may fight for your House. In here we stand together.
**4. Respect every member**, whatever their path, platform or experience. No harassment, hate or slurs.
**5. Rank is earned by deeds, not days.** No begging for roles, no spam, no unsolicited ads or invites.

Also: stay on topic, spoiler-tag lore spoilers, no cheating or exploit sharing, and follow staff instructions.`,

  'enlist-here': `# Enlist in the Legion

Applications are made on our website. Fill in the form with your in-game name, your Discord name, your path and why you want to join.

After you submit, you will receive an **application code**. Keep it: you need it to check your status and we cannot look it up for you later.

A Burseg reads every application and answers you here on Discord. Accepted applicants receive the **Recruit** rank and are paired with an instructor.`,

  'choose-your-role': `# Choose your roles

Your roles show your House, path and how you play. Until the reaction-role bot is set up, ask a Burseg in <#{introductions}> and we will assign them.

**House:** Corrino, Atreides, Harkonnen, Fremen, Neutral
**Path:** Mentat, Bene Gesserit, Swordmaster, Trooper, Planetologist
**Platform:** PC, PlayStation, Xbox
**Playstyle:** PvE, PvP, Crafting, Trading, Exploration, Building, Spice Harvesting, Mentoring
**Pings (opt-in):** Raid, Expedition, Training, Landsraad, Social, Announcements`,

  'field-manuals': `# Field Manuals

Our guides live on the guild website, in five groups: **Survival, Skills, Spice, Building, Politics.** Start with *First Steps on Arrakis* and *Sandworms & Thumpers*.

Burseg: post new guide links here as they are published.`,
};

// ---------- tiny REST client with rate-limit handling ----------
async function api(method, path, body) {
  if (DRY && method !== 'GET') return { id: 'dry-' + Math.random().toString(36).slice(2, 8), name: body && body.name, url: 'dry-run' };
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: 'Bot ' + TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body, (_, v) => (typeof v === 'bigint' ? v.toString() : v)) : undefined,
    });
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      await sleep(((j.retry_after || 1) + 0.25) * 1000);
      continue;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(`${method} ${path} -> ${res.status} ${data && data.message ? data.message : text}`);
      err.status = res.status;
      throw err;
    }
    await sleep(350);
    return data;
  }
  throw new Error('Rate limited too many times: ' + method + ' ' + path);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(m);

// ---------- main ----------
async function main() {
  log(DRY ? '--- DRY RUN: nothing will be created ---' : '--- Building Children of Salusa ---');

  const guild = await api('GET', `/guilds/${GUILD}`);
  log(`Server: ${guild.name}`);
  await api('PATCH', `/guilds/${GUILD}`, { name: 'Children of Salusa', verification_level: 2, default_message_notifications: 1, explicit_content_filter: 2 });
  log('Server renamed, verification set to Medium.');

  // ----- roles -----
  const existingRoles = await api('GET', `/guilds/${GUILD}/roles`);
  const roleByName = new Map(existingRoles.map((r) => [r.name, r]));
  const me = await api('GET', `/guilds/${GUILD}/members/@me`).catch(() => null);
  let botTop = Math.max(...existingRoles.filter((r) => me && me.roles.includes(r.id)).map((r) => r.position), 1);

  async function ensureRole(def) {
    if (roleByName.has(def.name)) { log(`  role exists: ${def.name}`); return roleByName.get(def.name); }
    const r = await api('POST', `/guilds/${GUILD}/roles`, {
      name: def.name, color: def.color || 0, hoist: !!def.hoist, mentionable: !!def.mentionable,
      permissions: String(def.perms !== undefined ? def.perms : 0n),
    });
    roleByName.set(def.name, r);
    log(`  role created: ${def.name}`);
    return r;
  }

  log('Roles:');
  for (const d of RANKS) await ensureRole(d);
  for (const name of CAT_ROLES) {
    await ensureRole({ name, color: ROLE_COLORS[name] || 0, mentionable: /Ping$|^Announcements$/.test(name), perms: 0n });
  }

  // order: ranks on top (just under the bot), then the rest
  if (!DRY) {
    const order = [...RANKS.map((r) => r.name), ...CAT_ROLES];
    const positions = order.map((name, i) => ({ id: roleByName.get(name).id, position: Math.max(botTop - 1 - i, 1) }));
    try { await api('PATCH', `/guilds/${GUILD}/roles`, positions); log('Role order set.'); }
    catch (e) { log('  Could not reorder roles (move the bot role to the top, then re-run): ' + e.message); }
  }

  const rid = (n) => roleByName.get(n).id;
  const everyone = GUILD; // the @everyone role id equals the guild id

  // ----- permission overwrites -----
  const ow = (id, allow, deny) => ({ id, type: 0, allow: String(allow || 0n), deny: String(deny || 0n) });
  function categoryOverwrites(access) {
    if (access === 'public') return [ow(everyone, P.VIEW | P.HISTORY | P.REACT)];
    if (access === 'members') return [ow(everyone, 0n, P.VIEW), ...MEMBERS_UP.map((n) => ow(rid(n), P.VIEW))];
    return [ow(everyone, 0n, P.VIEW), ...STAFF.map((n) => ow(rid(n), P.VIEW))];
  }
  function channelOverwrites(cat, ch) {
    const base = categoryOverwrites(cat.access);
    if (!ch.ro || ch.voice || ch.stage) return base;
    // read-only: nobody posts except the listed writers (default: staff)
    const writers = ch.writers !== undefined ? ch.writers : STAFF;
    const out = base.filter((o) => o.id === everyone || cat.access !== 'public').map((o) => o);
    const deny = P.SEND | P.PUB_THREADS | P.SEND_THREADS;
    const set = new Map(out.map((o) => [o.id, o]));
    const touch = (id, allow, d) => {
      const o = set.get(id) || ow(id);
      o.allow = String(BigInt(o.allow) | (allow || 0n));
      o.deny = String(BigInt(o.deny) | (d || 0n));
      set.set(id, o);
    };
    touch(everyone, 0n, deny);
    for (const n of MEMBERS_UP) touch(rid(n), 0n, deny);
    for (const n of writers) { const o = set.get(rid(n)) || ow(rid(n)); o.deny = '0'; o.allow = String(BigInt(o.allow) | P.SEND | P.VIEW); set.set(rid(n), o); }
    return [...set.values()];
  }

  // ----- channels -----
  const channels = await api('GET', `/guilds/${GUILD}/channels`);
  const findCat = (n) => channels.find((c) => c.type === 4 && c.name === n);
  const findCh = (n, parent) => channels.find((c) => c.type !== 4 && c.parent_id === parent && c.name === n);
  const chId = {}; // plain name -> id, for <#mentions> in texts
  const toPost = [];
  let communityTried = false;

  log('Categories and channels:');
  for (const cat of LAYOUT) {
    let c = findCat(cat.name);
    if (!c) {
      c = await api('POST', `/guilds/${GUILD}/channels`, { name: cat.name, type: 4, permission_overwrites: categoryOverwrites(cat.access) });
      channels.push(c);
      log(`  category created: ${cat.name}`);
    } else log(`  category exists: ${cat.name}`);

    for (const ch of cat.channels) {
      let ex = findCh(ch.name, c.id) || findCh(ch.name.toLowerCase().replace(/\s+/g, '-'), c.id);
      if (!ex) {
        const type = ch.voice ? 2 : ch.stage ? 13 : ch.forum ? 15 : 0;
        const body = { name: ch.name, type, parent_id: c.id, permission_overwrites: channelOverwrites(cat, ch) };
        if (ch.topic) body.topic = ch.topic;
        if (ch.forum && ch.tags) body.available_tags = ch.tags.map((t) => ({ name: t }));
        try { ex = await api('POST', `/guilds/${GUILD}/channels`, body); }
        catch (e) {
          if (ch.forum) { // forum channels need Community; fall back to a text channel
            log(`  forum not available yet (${e.message}); making a text channel instead. Convert it later after enabling Community.`);
            body.type = 0; delete body.available_tags; ex = await api('POST', `/guilds/${GUILD}/channels`, body);
          } else throw e;
        }
        channels.push(ex);
        log(`    channel created: ${ch.name}`);
        if (TEXTS[ch.name]) toPost.push({ ch, id: ex.id });
      } else log(`    channel exists: ${ch.name}`);
      if (ex.id) chId[ch.name] = ex.id;
      if (ch.webhook) ch._id = ex.id;
    }

    // after the Gate exists, try to enable Community so forums and welcome screen work
    if (!communityTried && cat.access === 'public') {
      communityTried = true;
      if (!(guild.features || []).includes('COMMUNITY') && chId['imperial-code']) {
        try {
          await api('PATCH', `/guilds/${GUILD}`, {
            features: [...new Set([...(guild.features || []), 'COMMUNITY'])],
            rules_channel_id: chId['imperial-code'],
            public_updates_channel_id: chId['welcome'],
            preferred_locale: 'en-US',
          });
          log('  Community features enabled.');
        } catch (e) { log('  Could not auto-enable Community (do it in Server Settings): ' + e.message); }
      }
    }
  }

  // ----- welcome texts -----
  log('Posting texts:');
  for (const { ch, id } of toPost) {
    const content = TEXTS[ch.name].replace(/<#\{([^}]+)\}>/g, (_, n) => (chId[n] ? `<#${chId[n]}>` : '#' + n));
    try { await api('POST', `/channels/${id}/messages`, { content }); log(`  posted: #${ch.name}`); }
    catch (e) { log(`  could not post in #${ch.name}: ${e.message}`); }
  }

  // ----- webhook for the website -----
  for (const cat of LAYOUT) for (const ch of cat.channels) {
    if (!ch.webhook || !ch._id) continue;
    try {
      const hooks = DRY ? [] : await api('GET', `/channels/${ch._id}/webhooks`);
      let hook = hooks.find((h) => h.name === ch.webhook);
      if (!hook) hook = await api('POST', `/channels/${ch._id}/webhooks`, { name: ch.webhook });
      log('\nWEBHOOK for the website (paste into admin > Settings > Webhook URL; keep it secret):');
      log('  ' + (hook.url || `https://discord.com/api/webhooks/${hook.id}/${hook.token}`));
    } catch (e) { log('  Could not create the webhook: ' + e.message); }
  }

  log('\nDone. Remaining manual steps:');
  log(' - Give yourself the Supreme Bashar role.');
  log(' - Server Settings > Community: set up Welcome Screen/Onboarding (or add Carl-bot or Sapphire for reaction roles).');
  log(' - Create a permanent invite and put it into the website settings (discord_invite).');
  log(' - Server Settings > Widget: enable it and choose #welcome as the invite channel.');
}

main().catch((e) => { console.error('\nFAILED: ' + e.message); process.exit(1); });
