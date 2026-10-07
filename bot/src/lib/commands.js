import { Collection } from 'discord.js';
import moderation from '../commands/moderation.js';
import legion from '../commands/legion.js';
import operations from '../commands/operations.js';
import panels from '../commands/panels.js';
import embed from '../commands/embed.js';

export const commands = new Collection();
for (const c of [...moderation, ...legion, ...operations, ...panels, ...embed]) commands.set(c.data.name, c);
