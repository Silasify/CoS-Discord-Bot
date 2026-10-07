# Sietch Zahir: Discord Server Blueprint

Built from the guild website (Dune: Awakening community). Names, ranks, paths, event types and guide categories all mirror the site so the two feel like one place.

Server name: **Sietch Zahir**
Tagline: *Share the water. Walk without rhythm.*
Colour theme for roles: spice orange `#E0731F`, deep sand `#A85E34`, night blue `#3B82F0`, stone `#4A2413`.

---

## 1. Roles (top to bottom)

### Staff and ranks (match the site's rank ladder)
| Role | Colour | Perms | Notes |
|---|---|---|---|
| Naib | #E0731F | Administrator | Guild leader(s) |
| Fedaykin | #C0392B | Manage Messages, Kick, Mute, Move Members, Manage Events | Officers and raid leads |
| Sayyadina | #9B59B6 | Manage Messages, Manage Nicknames, Manage Threads, Mute | Mentors, recruiters, onboarding. Read and answer applications |
| Sandrider | #D4A24C | Create Events, Mention @everyone off | Expedition leaders |
| Water-Bearer | #3B82F0 | Standard member | Contributors |
| Initiate | #8A8A8A | Standard member | Default role for accepted applicants |
| Wanderer | #4A2413 | Read-only on public channels | Default for everyone who just joined, before acceptance |

### Path roles (self-assign, cosmetic, no colour or a muted one)
Mentat, Bene Gesserit, Swordmaster, Trooper, Planetologist

### House roles (self-assign, one each)
Fremen, Atreides, Harkonnen, Undecided (neutral grey)

### Platform roles (self-assign)
PC, PlayStation, Xbox

### Playstyle roles (self-assign, optional)
PvE, PvP, Crafting, Trading, Exploration, Building, Spice Harvesting, Mentoring

### Ping roles (opt-in)
Raid Ping, Expedition Ping, Training Ping, Landsraad Ping, Social Ping, Announcements

### Bot roles
Sietch Herald (webhook / site bot), plus any moderation or reaction-role bot. Keep these below Fedaykin.

---

## 2. Categories and channels

### 📜 GATE OF THE SIETCH (visible to Wanderer and above)
- `#welcome`: read-only. Server intro, links to the website, how to join.
- `#sietch-accord`: read-only. The 5 rules (below).
- `#apply-here`: read-only. How to apply: link to the website's Apply page and how the status code works.
- `#get-roles`: reaction or button roles for House, Path, Platform, Playstyle, Pings.
- `#introductions`: Wanderers and Initiates can post. Sayyadina greet here.

### 🔥 THE GATHERING FIRE (Initiate and above)
- `#announcements`: Naib/Fedaykin post only.
- `#sietch-notices`: **the website webhook posts here** (see section 4).
- `#general`
- `#off-topic`
- `#screenshots`
- `#memes`

### 🏜️ THE LANDS
- `#hagga-basin`: starter region, beginner questions welcome.
- `#deep-desert`: high-risk planning, storm timing, rival crews.
- `#arrakeen-and-harko`: trade, politics, Landsraad chatter, neutral ground.
- `#spice-and-trade`: market prices, spice runs, deals.
- `#base-building`: layouts, builds, base defence.

### 📚 KNOWLEDGE OF THE SANDS (mirrors website guide categories: Survival, Skills, Spice, Building, Politics)
- `#guides-and-links`: read-only for most; Sayyadina post. Link to the site's guides page.
- `#help-and-questions`: forum channel. Tags: Survival, Skills, Spice, Building, Politics.
- `#lore`: Dune lore and Houses discussion.

### ⚔️ THE FEDAYKIN (event coordination)
- `#event-calendar`: Discord scheduled events live here; website events mirrored by hand or bot.
- `#raid-planning`
- `#expedition-signup`: sign-ups for the Saturday Deep Desert run.
- `#resource-tracker`: project and stock updates (the site's tracker: Water Cistern, Supply Cache, etc.). Good home for "project fully stocked" alerts if you later use a second webhook.
- `#loot-and-spoils`

### 🎓 TEACHING (Sayyadina)
- `#mentor-requests`: Initiates ask for a mentor.
- `#training-sessions`

### 🔊 VOICE
- `🔥 Gathering Fire` (general, open)
- `🏜️ Hagga Basin Crew`
- `🪱 Deep Desert Expedition`
- `⚔️ Raid Voice 1` / `Raid Voice 2`
- `🛠️ Building Session`
- `💤 AFK in the Sietch`
- Stage channel: `📣 Sietch Assembly` (monthly meetings)

### 🔒 COUNCIL (Naib + Fedaykin + Sayyadina only)
- `#applications`: **review queue** (the site posts "New application…" alerts here if you give it its own webhook; see section 4).
- `#officers`
- `#mod-log`
- `#council-voice`

---

## 3. The Sietch Accord (rules text for `#sietch-accord`)

1. **Share the water.** Stores, builds and knowledge belong to the sietch. Help each other.
2. **Atreides or Harkonnen, the feud ends at our walls.** Out in the desert, fight for your House. In here, keep the peace.
3. **Respect every member**, whatever their path, platform or experience. No harassment, hate or slurs.
4. **Bring the crew home.** Plan the retreat before the raid. Follow the expedition lead's call.
5. **Ranks are earned by deeds, not days.** Do not beg for roles. No spamming, no unsolicited ads or invites.

Plus: keep channels on topic, spoiler-tag lore spoilers, no cheating or exploit sharing, listen to staff.

---

## 4. Wiring the website to Discord

What the site sends (via its webhook, one URL = one channel):
- New application, accepted application, new event, event reminder, new chronicle (blog post), project fully stocked.

Recommendation:
1. Create `#sietch-notices` → Channel Settings → Integrations → Webhooks → New Webhook (name it *Sietch Herald*). Paste its URL in admin → Settings.
2. Optional: the site has a single `webhook_url`, so all alerts land in one channel. If you want applications private in `#applications` (Council), say so and I will add a second webhook setting to the site code. Application alerts include names and Discord handles, so keeping them in a staff-only channel is better than a public one.
3. Set `discord_invite` in the site settings to the real permanent invite once the server exists. It is still the placeholder `https://discord.gg/your-invite`.
4. The site already has a Discord guild ID configured for the "Gathered now" widget. Enable **Server Settings → Widget** and pick `#welcome` as the invite channel so the online count and member list work. If the new server has a different ID, update `discord_guild_id`.

**Security note:** `data/settings.json` holds your live webhook URL. Anyone with that URL can post to your channel. Don't share it or upload that file anywhere. If it has been exposed, delete the webhook and make a new one.

---

## 5. Onboarding flow
1. New person joins → gets **Wanderer** (auto-role) → sees only the Gate category.
2. They read the Accord, pick House / Path / Platform in `#get-roles`, introduce themselves.
3. They apply on the website → alert in `#applications`.
4. A Sayyadina reviews, accepts on the site, then gives the **Initiate** role (and removes Wanderer). The site posts the "has been accepted" message.
5. Initiate asks for a mentor in `#mentor-requests`; Sayyadina runs the Hagga Basin with them.

Enable Discord **Community** features with `#welcome` as the Rules/Welcome screen and `#announcements` as the updates channel. Set Verification Level to Medium.

---

## 6. Suggested bots
- Carl-bot or Sapphire: reaction roles, auto-role (Wanderer), logging.
- Discord's built-in Scheduled Events for the calendar, with ping roles.
- Optional: a small custom bot to mirror the site's events into Discord events.

---

## 7. Build order
1. Create server → set name, icon (the site's favicon SVG works), enable Community.
2. Create roles in the order above and drag them into hierarchy.
3. Create categories, then channels, then set permissions per category.
4. Add bots, set up reaction roles, post welcome / Accord / apply text.
5. Create the webhook, paste into site admin, send the test message.
6. Create a permanent invite, update the site's `discord_invite`.
