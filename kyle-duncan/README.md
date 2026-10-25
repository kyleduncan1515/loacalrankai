# Kyle Duncan: Summit Transit's freight salesman

Kyle Duncan is an AI outbound sales agent for Summit Transit in Houston. Kyle works like a sniper in the grass: he hunts down companies that just got a reason to need trucks (a contract award, a new project, a new plant or warehouse), figures out exactly what freight that creates, and lines up a precise first shot. Summit hauls it all, so every kind of freight counts.

Kyle drafts. You review and send. Nothing is ever emailed, messaged or dialed automatically.

## The commands

| Command | What you get |
|---|---|
| `hunt` | **The sniper.** Hunts trigger events in the Houston area: new federal contract awards (straight from USAspending.gov), TxDOT lettings, county, city, port, METRO and school-district awards, and news of new plants, warehouses, expansions, and petrochemical, LNG, pipeline and energy projects. For each event it follows the freight to whoever controls the trucks (prime, sub, supplier or owner) and records what will ship, which trailers, when, who to call, and the one-line opener. Everything is saved to `output/targets.csv`, ranked by priority, with source links. |
| `find` | Classic prospecting: shippers in an industry and region with buying signals, saved to `output/leads.csv`. |
| `pitch` | Researches a company, or every row of a CSV best-first, and writes a full outreach kit to `output/kits/<company>.md`: research brief with sources, who to contact, cold call script and voicemail, a 3-week multi-touch sequence (emails, LinkedIn, calls, breakup email), likely objections with word-for-word answers, and what to ask for when they say yes. If the row came from `hunt`, the award or project is the hook in every touch. |
| `coach` | Live coaching in the terminal. Paste what a prospect said and get the best reply. `/roleplay` to practice a cold call against a tough prospect, `/debrief` for a scored critique. |

Kyle's sales brain is in `src/playbook.ts`: hunting trigger events, following the freight from an award to whoever controls the trucks, what freight each kind of job creates, call timing, writing rules, call structure, objection handling, and the honesty and compliance rules. Edit it to sharpen how Kyle sells.

## Setup

Requires Node 20+ and an Anthropic API key.

```bash
cd kyle-duncan
npm install
export ANTHROPIC_API_KEY=sk-ant-...
```

Then finish `summit-transit.json`. The company, Houston location, equipment, lanes and target industries are already filled in. Add:
- Kyle's title, phone and email (outreach is signed with these)
- MC# and mailing address (the address is required in commercial email footers)
- **Real proof points**: years in business, loads moved, on-time %, a customer story you're allowed to share. Kyle only cites what's listed here and never invents any.

## The daily hunt

```bash
# 1. Hunt: everything in the Houston area from the last 30 days
npm run hunt

#    Aim it
npm run hunt -- --focus "highway, levee and pipeline jobs" --days 14 --count 30
npm run hunt -- --area "Beaumont and Port Arthur" --focus "petrochemical turnarounds and plant expansions"
npm run hunt -- --source federal --days 60          # federal awards only
npm run hunt -- --source web                        # local and private projects only

# 2. Build the kits for the best targets (highest priority first)
npm run pitch -- --csv output/targets.csv --min-fit 7 --limit 5

#    Or one company you already have in mind
npm run pitch -- --company "Acme Steel" --city Pasadena --notes "just won the Port Houston wharf job"

# 3. Coach and practice
npm run coach
```

Run `hunt` daily or a few times a week. It remembers what's already on the hit list and adds only new targets or new events. `pitch --csv` skips companies that already have a kit, so you can work through the list in batches.

To run the hunt automatically every weekday morning, add a cron entry (`crontab -e`):

```
0 6 * * 1-5 cd /path/to/kyle-duncan && ANTHROPIC_API_KEY=sk-ant-... npm run hunt -- --days 3 >> output/hunt.log 2>&1
```

## Settings

| Env var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | API key |
| `SALESMAN_PROFILE` | `summit-transit.json` | Company profile |
| `SALESMAN_MODEL` | `claude-opus-5-5` | Model |
| `USASPENDING_URL` | USAspending's public endpoint | Override for testing |

## Notes

- **Federal data lags.** Most contract awards appear on USAspending within days, but Defense awards can take up to 90 days. That's why `hunt` also works local sources and the news.
- **Cost.** Each hunt or pitch does a lot of web research, from a few cents to around a dollar or more per run depending on how much it reads. Coaching is cheap. Watch usage in the Anthropic Console.
- **Before you send:**
  - Check every fact against its source link.
  - Commercial email needs your mailing address and an opt-out (CAN-SPAM). Honor opt-outs right away.
  - Don't auto-dial or text cell phones without consent (TCPA).
  - Never promise a truck or a rate before it's confirmed.
