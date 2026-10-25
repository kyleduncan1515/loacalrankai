import fs from "node:fs";
import path from "node:path";
import { readCsv } from "../csv.js";
import { run } from "../claude.js";
import { systemBlocks } from "../playbook.js";
import type { BrokerageProfile } from "../profile.js";

export type Prospect = Record<string, string>;

interface PitchOptions {
  outDir: string;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "prospect";
}

function describeProspect(p: Prospect): string {
  return Object.entries(p)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

const KIT_INSTRUCTIONS = `Research this shipper on the web, then build the rep a complete outreach kit in Markdown with exactly these sections:

## 1. Research brief
What they make and ship, facilities and locations, likely lanes and equipment, estimated shipping volume (say how you estimated it), recent news and buying signals, and who runs logistics. Cite a source URL for every fact. Finish with "Fit for us" (score 1-10 and why, referencing our strong lanes and equipment) and "Best angle" (the one specific reason they'd take our call).

## 2. Who to contact
Primary and backup contacts with titles and where you found them. If you couldn't find names, give the exact titles to look for and a search string for LinkedIn.

## 3. Cold call script
Opener, reason for the call tied to their freight, three discovery questions specific to them, the small ask, and a voicemail script.

## 4. Outreach sequence (about 3 weeks)
A day-by-day sequence of 8-10 touches mixing calls, emails, LinkedIn and voicemail. Write every email and LinkedIn message out in full, with subject lines. Include the breakup email. Put the brokerage's mailing address and a one-line opt-out in the email footer if we have an address.

## 5. Objections they're likely to raise
The 4 or 5 objections most likely from this specific shipper, each with a word-for-word response.

## 6. Next step if they say yes
What to ask for (lanes, volumes, appointment requirements, accessorials, payment terms, credit check) to quote and onboard them.

Only use facts you can verify. If the company can't be found or clearly isn't a shipper we can serve, say so plainly at the top and keep the kit short.`;

export async function pitchOne(profile: BrokerageProfile, prospect: Prospect, opts: PitchOptions): Promise<string> {
  const name = prospect.company || prospect.name || "Unknown company";
  const file = path.join(opts.outDir, `${slug(name)}.md`);
  console.log(`\n=== ${name} ===`);

  const kit = await run({
    system: systemBlocks(profile),
    messages: [{ role: "user", content: `Prospect:\n${describeProspect(prospect)}\n\n${KIT_INSTRUCTIONS}` }],
    effort: "high",
    web: true,
    onActivity: (label) => console.log(`  ... ${label}`),
  });

  fs.mkdirSync(opts.outDir, { recursive: true });
  const header = `# Outreach kit: ${name}\n\n_Generated ${new Date().toISOString().slice(0, 10)}. Drafts only: verify facts and review before sending._\n\n`;
  fs.writeFileSync(file, header + kit + "\n");
  console.log(`  saved ${file}`);
  return file;
}

export async function pitchFromCsv(
  profile: BrokerageProfile,
  csvPath: string,
  opts: PitchOptions & { limit?: number; minFit?: number },
): Promise<void> {
  let prospects = readCsv(csvPath).filter((p) => p.company);
  if (opts.minFit !== undefined) {
    prospects = prospects.filter((p) => Number(p.fit_score || 0) >= opts.minFit!);
  }
  prospects = prospects.filter((p) => !fs.existsSync(path.join(opts.outDir, `${slug(p.company)}.md`)));
  if (opts.limit) prospects = prospects.slice(0, opts.limit);

  console.log(`Building kits for ${prospects.length} prospects (existing kits are skipped).`);
  for (const p of prospects) {
    try {
      await pitchOne(profile, p, opts);
    } catch (err) {
      console.error(`  failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
