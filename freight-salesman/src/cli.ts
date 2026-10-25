import { parseArgs } from "node:util";
import { describeError } from "./claude.js";
import { coach } from "./commands/coach.js";
import { findLeads } from "./commands/find.js";
import { pitchFromCsv, pitchOne } from "./commands/pitch.js";
import { loadProfile } from "./profile.js";

const USAGE = `freight-salesman: finds shippers, writes the outreach, coaches the calls.

Usage:
  npm run find  -- [--industry "food manufacturers"] [--region "Dallas-Fort Worth"] [--count 15] [--out output/leads.csv]
  npm run pitch -- --company "Acme Foods" [--website acme.com] [--city Dallas] [--contact "Jane Doe, Logistics Manager"] [--notes "..."]
  npm run pitch -- --csv output/leads.csv [--limit 5] [--min-fit 7]
  npm run coach

Setup: copy brokerage.example.json to brokerage.json and fill it in. Set ANTHROPIC_API_KEY.
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
      industry: { type: "string" },
      region: { type: "string" },
      count: { type: "string", default: "15" },
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
    case "find":
      await findLeads(profile, {
        industry: values.industry,
        region: values.region,
        count: Number(values.count),
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
