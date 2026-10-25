# Freight Salesman

An AI outbound sales rep for a freight brokerage. It finds shippers worth calling, researches them, writes the outreach, and coaches you through the calls.

It drafts. You review and send. Nothing is ever emailed, messaged or dialed automatically.

## What it does

| Command | What you get |
|---|---|
| `find` | Searches the web for real shippers in your target industries and regions, looks for buying signals (new facilities, expansions, logistics hiring, seasonal peaks, hard-to-cover equipment) and the person who runs logistics, and saves them to `output/leads.csv` with a fit score and source links. |
| `pitch` | For one company, or every lead in a CSV, it researches the shipper and writes a complete outreach kit to `output/kits/<company>.md`: research brief with sources, who to contact, a cold call script, voicemail, a 3-week multi-touch sequence (emails, LinkedIn, calls, breakup email), the objections that shipper is likely to raise with word-for-word answers, and what to ask for when they say yes. |
| `coach` | A live terminal coach. Paste what a shipper just said and get the best reply. Type `/roleplay` to practice a cold call against a tough shipper, then `/debrief` for a scored critique. |

The salesman's playbook is in `src/playbook.ts`: who to target, which signals matter, how to position as backup capacity and win one lane at a time, writing rules, call structure, objection handling, and honesty and compliance rules (no invented facts, CAN-SPAM footer, opt-outs, no auto-dialing). Edit it to match how you sell.

## Setup

Requires Node 20+ and an Anthropic API key.

```bash
cd freight-salesman
npm install
cp brokerage.example.json brokerage.json   # then fill it in
export ANTHROPIC_API_KEY=sk-ant-...
```

`brokerage.json` is what makes the salesman yours: your brokerage, your name and contact info, equipment, strong lanes, target industries and regions, real differentiators, and proof points. **Only put true proof points in it.** The salesman will only cite what's there and won't invent anything. List what you *don't* do so it never promises it.

## Usage

```bash
# 1. Find prospects (defaults to the industries/regions in brokerage.json)
npm run find -- --industry "frozen food manufacturers" --region "Chicagoland" --count 15

# 2. Build outreach kits for the best ones
npm run pitch -- --csv output/leads.csv --min-fit 7 --limit 5

#    ...or for one company you already have in mind
npm run pitch -- --company "Acme Foods" --website acmefoods.com --city Joliet --notes "they're hiring a logistics coordinator"

# 3. Get coached live, or practice
npm run coach
```

Running `find` again adds new companies to the same CSV and skips ones already there. Running `pitch --csv` again skips companies that already have a kit, so you can work through a list in batches.

You can also bring your own list: any CSV with a `company` column works with `pitch --csv` (see `prospects.example.csv`). Extra columns such as website, city, contact or notes are passed along as context.

## Settings

| Env var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | API key |
| `SALESMAN_PROFILE` | `brokerage.json` | Path to the brokerage profile |
| `SALESMAN_MODEL` | `claude-opus-5-5` | Model to use |

Requests use adaptive thinking (high effort for research and writing, low effort for live coaching so replies come fast), server-side web search and fetch for research, prompt caching on the playbook and profile, and the API's default refusal fallback.

## Cost

Research is the expensive part. Each `pitch` or `find` run does a number of web searches and page reads, so expect anywhere from a few cents to roughly a dollar per company, depending on how much there is to read. Coaching turns are cheap. Check usage in the Anthropic Console as you go.

## Before you send anything

- Read every fact in the research brief against its source. The salesman is told not to invent anything, but verify before you put your name on it.
- Bulk commercial email needs your physical mailing address and an opt-out (CAN-SPAM). Honor opt-outs right away.
- Don't auto-dial or text cell phones without consent (TCPA).
- Check your company's policy on prospecting tools and on what you can say about rates and capacity.
