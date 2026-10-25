import fs from "node:fs";
import path from "node:path";
import { appendCsv, readCsv } from "../csv.js";
import { type LocalTool, run } from "../claude.js";
import { systemBlocks } from "../playbook.js";
import type { BrokerageProfile } from "../profile.js";
import { federalAwardsTool } from "../sources/usaspending.js";

export const TARGET_COLUMNS = [
  "company",
  "role",
  "event_type",
  "event",
  "award_amount",
  "event_date",
  "location",
  "event_source",
  "freight_needed",
  "equipment",
  "freight_timing",
  "contact_name",
  "contact_title",
  "contact_source",
  "phone",
  "website",
  "priority",
  "angle",
];

const COLUMN_HINTS: Record<string, string> = {
  role: "prime/GC, subcontractor, supplier, facility owner, shipper",
  event_type: "federal award, state/local award, private project, new facility, expansion, other",
  event: "One line: what was awarded or announced",
  award_amount: "Dollar value if known, else empty",
  event_date: "YYYY-MM-DD if known",
  event_source: "URL proving the event",
  freight_needed: "What this event will put on trucks",
  equipment: "Trailer types needed",
  freight_timing: "When the freight likely moves",
  contact_source: "URL where the contact was found",
  phone: "Public main or office line only, if found",
  priority: "1-10: size of the freight opportunity x fit for us x freshness",
  angle: "The one-sentence opener for the first call or email",
};

const targetProperties = Object.fromEntries(
  TARGET_COLUMNS.map((c) => [c, COLUMN_HINTS[c] ? { type: "string", description: COLUMN_HINTS[c] } : { type: "string" }]),
);

export type HuntSource = "all" | "federal" | "web";

interface HuntOptions {
  area: string;
  focus?: string;
  days: number;
  count: number;
  source: HuntSource;
  out: string;
}

function targetKey(t: Record<string, string>): string {
  return `${(t.company ?? "").trim().toLowerCase()}|${(t.event ?? "").trim().toLowerCase().slice(0, 60)}`;
}

export async function hunt(profile: BrokerageProfile, opts: HuntOptions): Promise<void> {
  const existing = fs.existsSync(opts.out) ? readCsv(opts.out) : [];
  const known = new Set(existing.map(targetKey));
  const knownCompanies = [...new Set(existing.map((t) => t.company).filter(Boolean))];
  let saved = 0;

  const saveTargets: LocalTool = {
    definition: {
      name: "save_targets",
      description:
        "Save verified targets (a company plus the event that gives them freight) to the hit list. Call it as you go, in batches. Use empty strings for anything you couldn't verify.",
      strict: true,
      input_schema: {
        type: "object",
        additionalProperties: false,
        required: ["targets"],
        properties: {
          targets: {
            type: "array",
            items: { type: "object", additionalProperties: false, required: TARGET_COLUMNS, properties: targetProperties },
          },
        },
      },
    },
    run(input) {
      const { targets } = input as { targets: Record<string, string>[] };
      if (!Array.isArray(targets)) throw new Error("targets must be an array");
      const fresh: Record<string, string>[] = [];
      for (const t of targets) {
        const key = targetKey(t);
        if (!t.company?.trim() || known.has(key)) continue;
        known.add(key);
        fresh.push(t);
      }
      if (fresh.length) {
        fs.mkdirSync(path.dirname(opts.out), { recursive: true });
        appendCsv(opts.out, TARGET_COLUMNS, fresh);
      }
      saved += fresh.length;
      for (const t of fresh) console.log(`  >> [${t.priority}] ${t.company}: ${t.event}`);
      const skipped = targets.length - fresh.length;
      return `Saved ${fresh.length} new targets (${saved} total this run)${skipped ? `, skipped ${skipped} already on the list` : ""}.`;
    },
  };

  const sources: string[] = [];
  if (opts.source !== "web") {
    sources.push(
      "Federal: use search_federal_awards for new awards in the area (try construction 23, oil/gas 21, manufacturing 31-33, wholesale 42, and a broad search with no NAICS). Skip awards that create no freight (pure services, software, consulting, staffing).",
    );
  }
  if (opts.source !== "federal") {
    sources.push(
      `Web: search for recent awards and projects in ${opts.area}: TxDOT letting results and low bidders, county commissioners court and city council contract awards, Port Houston, METRO, school district and university construction awards, water and utility projects, and news of new plants, warehouses, distribution centers, expansions, groundbreakings, petrochemical/LNG/pipeline projects, data centers and energy projects (local business journals, ENR, Construction Dive, economic development announcements, company press releases).`,
    );
  }

  const task = `Go hunting. Find up to ${opts.count} fresh targets: companies that, in the last ${opts.days} days, won a contract, started a project, or announced something that is about to put freight on trucks.

Area: ${opts.area}
${opts.focus ? `Focus: ${opts.focus}\n` : ""}We haul everything, so any freight counts. Bigger, fresher and closer to Houston ranks higher.

Sources to work:
${sources.map((s) => `- ${s}`).join("\n")}

For each event, follow the freight: decide who controls the trucks (prime, a sub, a supplier, or the facility owner) and target that company. Work out what the event will put on trucks, which equipment, and when. Find a contact (project manager, procurement, equipment manager, logistics) and a public main phone number if you can, and record where you found them. Write the "angle": the one-sentence opener Kyle uses on the first call, naming the specific job.
${knownCompanies.length ? `\nAlready on the hit list (only add these again for a new event): ${knownCompanies.join("; ")}\n` : ""}
Every target needs a real source URL for the event. Never guess an award, amount or contact. Save targets with save_targets as you go. When done, give a short briefing: the top 3 targets and exactly why to hit them first.`;

  console.log(`Kyle Duncan is hunting ${opts.area} (last ${opts.days} days, source: ${opts.source})\n`);
  const briefing = await run({
    system: systemBlocks(profile),
    messages: [{ role: "user", content: task }],
    effort: "high",
    web: opts.source !== "federal",
    localTools: opts.source === "web" ? [saveTargets] : [federalAwardsTool, saveTargets],
    onActivity: (label) => console.log(`  ... ${label}`),
  });
  console.log(`\n${briefing}\n\n${saved} new targets saved to ${opts.out}`);
}
