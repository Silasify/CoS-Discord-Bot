# Children of Salusa: Discord Server Blueprint

Dune: Awakening guild. Sardaukar lore: the Padishah Emperor's elite troops, forged on the prison world Salusa Secundus.

Server name: **Children of Salusa**
Tag: `[SALU]` (or `[COS]`)
Tagline: *Forged in fire. Loyal to the Throne.*
Colours: Imperial gold `#D4A24C`, blood red `#A32020`, iron grey `#4A4F57`, black `#0E0E10`.

> Assumption: the guild is Imperial in spirit but, like the current site, still open to members of any House. If you want a strictly Imperial guild, drop the Atreides/Harkonnen/Fremen roles and keep only Corrino and Neutral.

---

## 1. Roles

### Ranks (replaces the Fremen ladder)
| Role | Replaces | Colour | Perms | Purpose |
|---|---|---|---|---|
| Supreme Bashar | Naib | #D4A24C | Administrator | Guild leader(s) |
| Bashar | Fedaykin | #A32020 | Manage Messages, Kick, Mute, Move Members, Manage Events | Officers, raid and PvP leads |
| Burseg | Sayyadina | #8E44AD | Manage Messages, Manage Nicknames, Manage Threads, Mute | Instructors, recruiters, application review |
| Captain | Sandrider | #E0731F | Create Events | Expedition and squad leaders |
| Legionnaire | Water-Bearer | #3B82F0 | Standard member | Established members |
| Recruit | Initiate | #8A8A8A | Standard member | Accepted applicants, in training |
| Outlander | (new) | #3A3A3A | Gate channels only, read-only | Everyone who just joined, before acceptance |

### Path roles (same as the site; self-assign)
Mentat, Bene Gesserit, Swordmaster, Trooper, Planetologist

### House allegiance (self-assign)
Corrino, Atreides, Harkonnen, Fremen, Neutral

### Platform: PC, PlayStation, Xbox
### Playstyle: PvE, PvP, Crafting, Trading, Exploration, Building, Spice Harvesting, Mentoring
### Ping roles
Raid Ping, Expedition Ping, Training Ping, Landsraad Ping, Social Ping, Announcements

### Bots
Imperial Herald (website webhook), plus a moderation / reaction-role bot. Keep them below Bashar.

---

## 2. Categories and channels

### 🦅 IMPERIAL GATE (Outlander and up)
- `#welcome`: read-only intro and website link
- `#imperial-code`: read-only rules
- `#enlist-here`: read-only; how to apply on the website and use the status code
- `#choose-your-role`: reaction roles for House, Path, Platform, Playstyle, Pings
- `#introductions`

### 🔥 THE PARADE GROUND (Recruit and up)
- `#decrees`: announcements; Supreme Bashar and Bashar post only
- `#herald-dispatches`: **the website webhook posts here**
- `#general`
- `#off-duty`
- `#screenshots`
- `#memes`

### 🏜️ THEATRES OF WAR
- `#hagga-basin`: starter region and beginner questions
- `#deep-desert`: high-risk operations, storm timing, rival crews
- `#arrakeen-and-harko`: trade, Landsraad politics, neutral ground
- `#spice-and-trade`: market, spice runs
- `#fortifications`: base building and defence

### 📚 IMPERIAL ARCHIVES (mirrors the site's guide categories)
- `#field-manuals`: links to guides on the website; Burseg post
- `#questions-and-orders`: forum channel with tags Survival, Skills, Spice, Building, Politics
- `#lore-of-salusa`: Dune lore, the Houses, Sardaukar history

### ⚔️ THE WAR ROOM (operations)
- `#operations-calendar`: scheduled events
- `#raid-planning`
- `#expedition-orders`: sign-ups, for example the Saturday Deep Desert run
- `#supply-depot`: resource tracker updates and project progress
- `#spoils-of-war`

### 🎓 TRAINING GROUNDS
- `#request-an-instructor`: Recruits ask for a Burseg mentor
- `#drill-sessions`

### 🔊 VOICE
- `🔥 Salusa Barracks` (general)
- `🏜️ Hagga Basin Squad`
- `🪱 Deep Desert Operation`
- `⚔️ War Room 1` / `War Room 2`
- `🛠️ Fortification Crew`
- `💤 Stood Down` (AFK)
- Stage: `📣 Imperial Assembly`

### 🔒 HIGH COMMAND (Supreme Bashar, Bashar, Burseg only)
- `#applications`: review queue
- `#command`
- `#mod-log`
- `#command-voice`

---

## 3. The Imperial Code (text for `#imperial-code`)

1. **Loyalty to the Legion.** Stores, builds and knowledge belong to all of us. Support your squad.
2. **Discipline above all.** Follow your squad leader's orders on operations. Plan the retreat before the raid.
3. **House feuds stop at the gate.** Atreides, Harkonnen, Corrino or Fremen: out in the desert you may fight for your House, in here you stand together.
4. **Respect every member**, whatever their path, platform or experience. No harassment, hate or slurs.
5. **Rank is earned by deeds, not days.** No begging for roles, no spam, no unsolicited ads or invites.

Also: stay on topic, spoiler-tag lore spoilers, no cheating or exploit sharing, follow staff instructions.

---

## 4. Wiring the website to Discord

The site posts these via one webhook: new application, accepted application, new event, event reminder, new chronicle, project fully stocked.

1. Create `#herald-dispatches` → Channel Settings → Integrations → Webhooks → New Webhook (name: *Imperial Herald*). Paste its URL in the site admin under Settings.
2. Application alerts include names and Discord handles. With one webhook they go to the public channel. If you want them in `#applications` (staff only), the site needs a second webhook setting. That is a small code change.
3. Set `discord_invite` in the site settings to the permanent invite once the server exists. It is currently the placeholder `https://discord.gg/your-invite`.
4. The site has a guild ID set for the "Gathered now" widget. If this is a new server, update `discord_guild_id` and enable Server Settings → Widget with `#welcome` as the invite channel.

**Security:** `data/settings.json` contains your live webhook URL. Never share that file. If it has been exposed, delete the webhook and make a new one.

---

## 5. Onboarding flow
1. New member joins → auto-role **Outlander** → sees only the Imperial Gate.
2. They read the Code, choose House / Path / Platform, introduce themselves.
3. They apply on the website → alert reaches the Burseg.
4. A Burseg accepts on the site, gives **Recruit**, removes **Outlander**.
5. Recruit requests an instructor in `#request-an-instructor` and runs the Hagga Basin with them.

Turn on **Community** features: `#welcome` as the welcome screen, `#imperial-code` as the rules channel, `#decrees` as the updates channel. Verification level: Medium.

---

## 6. Suggested bots
- Carl-bot or Sapphire: auto-role (Outlander), reaction roles, logging.
- Discord's built-in Scheduled Events for the calendar.
- Optional: a small custom bot that mirrors the website's events into Discord events.

---

## 7. Build order
1. Create the server, set the name and icon, enable Community.
2. Create roles in the order above and set the hierarchy.
3. Create categories, then channels, then per-category permissions.
4. Add bots, set up reaction roles, post the welcome, Code and enlist text.
5. Create the webhook, paste it into site admin, send the test message.
6. Create a permanent invite and update `discord_invite` on the site.

---

## 8. Website rebrand checklist (not done yet)
- Site name and hero: Sietch Zahir → Children of Salusa
- Ranks array in `inc/data.php` and the rank descriptions in `index.php`
- Rewrite "Sietch Accord", "Share the Water" and "Walk Without Rhythm" copy in Sardaukar voice
- Seed members, posts, apply page, footer, favicon and OG image
- Apply-form codes currently start with `SZ-`
