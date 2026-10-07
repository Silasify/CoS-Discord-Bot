# Imperial Legate: Children of Salusa bot

Discord bot for the Children of Salusa Dune: Awakening guild. It matches the roles and channels that
`../setup-server.js` creates (everything is looked up by name), so run that script first.

## Features

| Area | What it does |
|---|---|
| Gate | New members get the **Outlander** role (the bot creates it if missing) and a welcome in `#introductions`. |
| Enlistment | `/accept` (Burseg+) gives Recruit, removes Outlander, announces in `#general`. `/reject` DMs the applicant. |
| Ranks | `/promote` `/demote` move a member along Recruit, Legionnaire, Captain, Burseg, Bashar. You can only promote to a rank below your own. Supreme Bashar stays manual. |
| Roles | `/panel roles` posts select menus for House, Path, Platform, Playstyle and Pings. Persistent across restarts. |
| Instructors | `/panel instructor` posts a button in `#request-an-instructor`. It opens a thread, pings Burseg, with Claim and Close. |
| Operations | `/operation create` (Captain+) posts a sign-up with Attending/Maybe/Can't buttons in the right channel (expedition-orders, raid-planning, drill-sessions, operations-calendar), pings the matching ping role, creates a Discord scheduled event and reminds attendees 15 min before. `/operation list`, `/operation cancel`. |
| Embeds | `/embed create` opens a live-preview builder (buttons and forms for text, colour, author, footer, images, fields, JSON import). `/embed edit` changes an embed the bot posted. Burseg+. |
| Reset | `/reset` shows the next weekly reset (Tuesday 05:00 Europe/Berlin, same as the website). |
| Moderation | `/kick` `/ban` `/unban` `/timeout` `/untimeout` `/warn` `/warnings` `/delwarn` `/purge` `/slowmode`. Case numbers, `#mod-log` entries, 3 warnings = 1 h timeout. Role hierarchy is enforced. |
| AutoMod | `/automod` creates native Discord rules: invite links, mention spam, spam content. Staff from Burseg up are exempt. |
| Logging | Joins, leaves, bans, unbans and every action go to `#mod-log`. |

## Setup

1. <https://discord.com/developers/applications> > New Application > Bot. Copy the token.
   Enable the **Server Members Intent**. No Message Content intent is needed.
2. Invite it with the `bot` and `applications.commands` scopes and the **Administrator** permission.
   Move the bot role to the top of the role list (it must sit above every role it hands out).
3. Configure and run (Node 20+):

```powershell
cd bot
copy .env.example .env        # fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm install
npm run deploy                # registers the slash commands in your guild
npm start
```

4. In the server: `/panel roles` in `#choose-your-role`, `/panel instructor` in `#request-an-instructor`,
   `/automod` once.

Data (cases, operations) is kept in `data/db.json`. Keep the bot running (a small VPS, or `pm2` / Task Scheduler).

## Not included yet

- Application alerts from the website into `#applications` (needs a second webhook setting in the site code).
- Supply depot tracker commands (the website tracker is the source of truth).
