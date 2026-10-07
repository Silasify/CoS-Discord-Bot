import { REST, Routes } from 'discord.js';
import { env } from './config.js';
import { commands } from './lib/commands.js';

if (!env.token || !env.clientId || !env.guildId) {
  console.error('Set DISCORD_TOKEN, CLIENT_ID and GUILD_ID in .env first.');
  process.exit(1);
}
const rest = new REST().setToken(env.token);
const body = commands.map((c) => c.data.toJSON());
await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body });
console.log(`Registered ${body.length} commands in guild ${env.guildId}.`);
