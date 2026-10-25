import { parseArgs } from "node:util";
import { describeError } from "./claude.js";
import { coach } from "./commands/coach.js";
import { findLeads } from "./commands/find.js";
import { hunt, type HuntSource } from "./commands/hunt.js";
import { pitchFromCsv, pitchOne } from "./commands/pitch.js";
import { loadProfile } from "./profile.js";

const USAGE = `Kyle Duncan: Summit Transit's freight salesman. Hunts awards and projects, finds shippers, writes the outreach, coaches the calls.

Usage:
  npm run hunt  -- [--area "Houston metro"] [--focus "highway and pipeline"] [--days 30] [--count 25] [--source all|federal|web] [--out output/targets.csv]
  npm run find  -- [--industry "food manufacturers"] [--region "Dallas-Fort Worth"] [--count 15] [--out output/leads.csv]
  npm run pitch -- --company "Acme Foods" [--website acme.com] [--city Dallas] [--contact "Jane Doe, Logistics Manager"] [--notes "..."]
  npm run pitch -- --csv output/targets.csv [--limit 5] [--min-fit 7]
  npm run coach

Setup: fill in summit-transit.json. Set ANTHROPIC_API_KEY.
Everything is a draft for you to review. Nothing is ever sent automatically.
`;

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") {
    console.log(USAGE);
    return;
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      area: { type: "string", default: "Houston metro and the Texas Gulf Coast" },
      focus: { type: "string" },
      days: { type: "string", default: "30" },
      source: { type: "string", default: "all" },
      industry: { type: "string" },
      region: { type: "string" },
      count: { type: "string" },
      out: { type: "string" },
      company: { type: "string" },
      website: { type: "string" },
      city: { type: "string" },
      contact: { type: "string" },
      notes: { type: "string" },
      csv: { type: "string" },
      limit: { type: "string" },
      "min-fit": { type: "string" },
    },
  });

  const profile = loadProfile();

  switch (command) {
    case "hunt": {
      const source = values.source as HuntSource;
      if (!["all", "federal", "web"].includes(source)) throw new Error("--source must be all, federal or web");
      await hunt(profile, {
        area: values.area!,
        focus: values.focus,
        days: Number(values.days),
        count: Number(values.count ?? 25),
        source,
        out: values.out ?? "output/targets.csv",
      });
      break;
    }
    case "find":
      await findLeads(profile, {
        industry: values.industry,
        region: values.region,
        count: Number(values.count ?? 15),
        out: values.out ?? "output/leads.csv",
      });
      break;
    case "pitch": {
      const outDir = values.out ?? "output/kits";
      if (values.csv) {
        await pitchFromCsv(profile, values.csv, {
          outDir,
          limit: values.limit ? Number(values.limit) : undefined,
          minFit: values["min-fit"] ? Number(values["min-fit"]) : undefined,
        });
      } else if (values.company) {
        await pitchOne(
          profile,
          {
            company: values.company,
            website: values.website ?? "",
            city: values.city ?? "",
            contact: values.contact ?? "",
            notes: values.notes ?? "",
          },
          { outDir },
        );
      } else {
        throw new Error("pitch needs --company or --csv");
      }
      break;
    }
    case "coach":
      await coach(profile);
      break;
    default:
      console.log(USAGE);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\n[error] ${describeError(err)}`);
  process.exitCode = 1;
});
