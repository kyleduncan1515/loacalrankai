import fs from "node:fs";
import path from "node:path";
import { appendCsv, readCsv } from "../csv.js";
import { type LocalTool, run } from "../claude.js";
import { systemBlocks } from "../playbook.js";
import type { BrokerageProfile } from "../profile.js";

export const LEAD_COLUMNS = [
  "company",
  "website",
  "city",
  "state",
  "industry",
  "what_they_ship",
  "likely_equipment",
  "buying_signal",
  "signal_source",
  "contact_name",
  "contact_title",
  "contact_source",
  "fit_score",
  "why_fit",
];

const COLUMN_HINTS: Record<string, string> = {
  likely_equipment: "dry van, reefer, flatbed, etc.",
  signal_source: "URL where the buying signal was found",
  contact_source: "URL where the contact was found",
  fit_score: "1-10, how well this shipper fits the brokerage",
};

const leadProperties = Object.fromEntries(
  LEAD_COLUMNS.map((c) => [c, COLUMN_HINTS[c] ? { type: "string", description: COLUMN_HINTS[c] } : { type: "string" }]),
);

interface FindOptions {
  industry?: string;
  region?: string;
  count: number;
  out: string;
}

export async function findLeads(profile: BrokerageProfile, opts: FindOptions): Promise<void> {
  const existing = fs.existsSync(opts.out) ? readCsv(opts.out) : [];
  const known = new Set(existing.map((r) => (r.company ?? "").trim().toLowerCase()).filter(Boolean));
  let saved = 0;

  const saveLeads: LocalTool = {
    definition: {
      name: "save_leads",
      description:
        "Save verified shipper prospects to the rep's lead list. Call it whenever you have a batch of researched leads. Use empty strings for anything you could not verify.",
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["leads"],
        properties: {
          leads: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: LEAD_COLUMNS,
              properties: leadProperties,
            },
          },
        },
      },
    },
    run(input) {
      const { leads } = input as { leads: Record<string, string>[] };
      if (!Array.isArray(leads)) throw new Error("leads must be an array");
      const fresh: Record<string, string>[] = [];
      for (const l of leads) {
        const key = l.company?.trim().toLowerCase();
        if (!key || known.has(key)) continue;
        known.add(key);
        fresh.push(l);
      }
      if (fresh.length) {
        fs.mkdirSync(path.dirname(opts.out), { recursive: true });
        appendCsv(opts.out, LEAD_COLUMNS, fresh);
      }
      saved += fresh.length;
      for (const l of fresh) console.log(`  + ${l.company} (${l.city}, ${l.state}) fit ${l.fit_score}`);
      const skipped = leads.length - fresh.length;
      return `Saved ${fresh.length} new leads (${saved} total this run)${skipped ? `, skipped ${skipped} duplicates` : ""}.`;
    },
  };

  const industry = opts.industry ?? profile.targetIndustries.join(", ");
  const region = opts.region ?? profile.targetRegions.join(", ");
  const task = `Find ${opts.count} new shipper prospects for us.

Industry focus: ${industry || "any industry that fits our services"}
Region focus: ${region || "anywhere our strong lanes run"}
${known.size ? `\nAlready on our list (skip these): ${[...known].join("; ")}\n` : ""}
Use web search to find real companies that ship freight we can haul. Favor mid-market manufacturers and distributors with a fresh buying signal (expansion, new facility, hiring logistics staff, seasonal peak, hard-to-cover equipment, freight on our strong lanes). For each one, try to find the person who runs logistics or transportation (company site, press releases, news, public LinkedIn results) and record where you found them.

Only save companies you actually found evidence for. Put the URL for the signal in signal_source. Save them with the save_leads tool as you go, in batches. When done, give a two-line summary of the best three and why.`;

  console.log(`Prospecting for ${opts.count} shippers: ${industry} / ${region}\n`);
  const summary = await run({
    system: systemBlocks(profile),
    messages: [{ role: "user", content: task }],
    effort: "high",
    web: true,
    localTools: [saveLeads],
    onActivity: (label) => console.log(`  ... ${label}`),
  });
  console.log(`\n${summary}\n\n${saved} new leads saved to ${opts.out}`);
}
