import 'dotenv/config';

export const env = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  tz: process.env.GUILD_TZ || 'Europe/Berlin',
  resetDow: Number(process.env.RESET_DOW ?? 2),
  resetTime: process.env.RESET_TIME || '05:00',
};

// Names match setup-server.js / the blueprint, so everything is looked up by name.
export const RANKS = ['Recruit', 'Legionnaire', 'Captain', 'Burseg', 'Bashar', 'Supreme Bashar']; // low -> high
export const GATE_ROLE = 'Outlander';
export const ENTRY_RANK = 'Recruit';

export const CH = {
  welcome: 'introductions',
  announce: 'general',
  modlog: 'mod-log',
  applications: 'applications',
  instructor: 'request-an-instructor',
};

export const COLORS = { gold: 0xd4a24c, red: 0xa32020, grey: 0x4a4f57 };

export const ROLE_GROUPS = [
  { id: 'house', title: 'House', max: 1, options: ['House Corrino', 'House Atreides', 'House Harkonnen', 'House Fremen', 'House Neutral'] },
  { id: 'path', title: 'Path', max: 5, options: ['Path: Mentat', 'Path: Bene Gesserit', 'Path: Swordmaster', 'Path: Trooper', 'Path: Planetologist'] },
  { id: 'platform', title: 'Platform', max: 3, options: ['PC', 'PlayStation', 'Xbox'] },
  { id: 'style', title: 'Playstyle', max: 8, options: ['PvE', 'PvP', 'Crafting', 'Trading', 'Exploration', 'Building', 'Spice Harvesting', 'Mentoring'] },
  { id: 'ping', title: 'Pings', max: 6, options: ['Raid Ping', 'Expedition Ping', 'Training Ping', 'Landsraad Ping', 'Social Ping', 'Announcements'] },
];

// Operation types: ping role and the channel the sign-up goes to
export const OP_TYPES = {
  Expedition: { ping: 'Expedition Ping', channel: 'expedition-orders' },
  Raid: { ping: 'Raid Ping', channel: 'raid-planning' },
  Training: { ping: 'Training Ping', channel: 'drill-sessions' },
  Landsraad: { ping: 'Landsraad Ping', channel: 'operations-calendar' },
  Social: { ping: 'Social Ping', channel: 'operations-calendar' },
};

export const WARN_TIMEOUT_AT = 3;      // warnings before an automatic timeout
export const WARN_TIMEOUT_MIN = 60;
export const REMINDER_MIN = 15;
