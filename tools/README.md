# LocalRank AI: free outreach toolkit

Finds local businesses with bad or missing websites, builds each one a free preview site,
and writes a personalized cold email sequence. Everything here is $0: no API keys, no card.

## One-time setup
1. Copy `tools/config.example.json` to `tools/config.json` and fill in your name, reply email,
   and a mailing address (cold email law, CAN-SPAM, requires one).
2. Make a free Cloudflare account. Previews deploy to `https://<project>.pages.dev` for free,
   commercial use allowed. Put that URL in `demoBaseUrl`.

## Each batch (about 1 hour)
```bash
npm run leads -- --city "Dallas, TX" --niche roofer          # 1. find businesses (OpenStreetMap)
npm run audit -- --in data/leads-roofer-dallas-tx.csv         # 2. score who needs help most
npm run demos -- --in data/leads-roofer-dallas-tx-audited.csv # 3. build preview sites
npx wrangler pages deploy demos --project-name localrank-demos #    publish them free
npm run emails -- --in data/leads-roofer-dallas-tx-audited.csv # 4. write the emails
```
Then open `data/emails-roofer-dallas-tx.md` and send from Gmail.

Niches: roofer, plumber, electrician, hvac, landscaper, painter, auto-repair, dentist, locksmith, carpenter.

## Sending safely from a free Gmail
- Start at 10–15 emails a day; never more than ~30 from a normal Gmail.
- Send them one at a time (no BCC blasts). Wait 3 days before follow-up #1, 4 more before #2.
- Stop immediately for anyone who says no. Never email someone who opted out.

`data/`, `demos/` and `tools/config.json` are git-ignored so prospect lists stay private.
