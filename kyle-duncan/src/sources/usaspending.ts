import type { LocalTool } from "../claude.js";

// Public, keyless API. Docs: https://github.com/fedspendingtransparency/usaspending-api
const ENDPOINT =
  process.env.USASPENDING_URL ?? "https://api.usaspending.gov/api/v2/search/spending_by_award/";

/** Houston metro county FIPS codes (all in TX). */
export const HOUSTON_COUNTIES: Record<string, string> = {
  Harris: "201",
  "Fort Bend": "157",
  Montgomery: "339",
  Brazoria: "039",
  Galveston: "167",
  Waller: "473",
  Liberty: "291",
  Chambers: "071",
};

interface Location {
  state: string;
  county_fips: string;
  city: string;
}

interface AwardSearch {
  days_back: number;
  locations: Location[];
  naics_prefixes: string[];
  keywords: string[];
  min_amount: number;
  limit: number;
}

interface AwardRow {
  "Award ID"?: string;
  "Recipient Name"?: string;
  "Award Amount"?: number;
  Description?: string;
  "Start Date"?: string;
  "End Date"?: string;
  "Awarding Agency"?: string;
  "Awarding Sub Agency"?: string;
  NAICS?: { code?: string; description?: string } | string | null;
  "Primary Place of Performance"?: unknown;
  "Recipient Location"?: unknown;
  generated_internal_id?: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function searchFederalAwards(search: AwardSearch): Promise<string> {
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(1, search.days_back) * 86_400_000);

  const locations = search.locations.length
    ? search.locations.map((l) => ({
        country: "USA",
        state: l.state || "TX",
        ...(l.county_fips ? { county: l.county_fips } : {}),
        ...(l.city ? { city: l.city } : {}),
      }))
    : [{ country: "USA", state: "TX" }];

  const filters: Record<string, unknown> = {
    award_type_codes: ["A", "B", "C", "D"],
    time_period: [{ start_date: isoDate(start), end_date: isoDate(end), date_type: "new_awards_only" }],
    place_of_performance_locations: locations,
  };
  if (search.naics_prefixes.length) filters.naics_codes = { require: search.naics_prefixes };
  // The API ignores keywords shorter than 3 characters and rejects an empty list.
  const keywords = search.keywords.filter((k) => k.trim().length >= 3);
  if (keywords.length) filters.keywords = keywords;
  if (search.min_amount > 0) filters.award_amounts = [{ lower_bound: search.min_amount }];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filters,
      fields: [
        "Award ID",
        "Recipient Name",
        "Award Amount",
        "Description",
        "Start Date",
        "End Date",
        "Awarding Agency",
        "Awarding Sub Agency",
        "NAICS",
        "Primary Place of Performance",
        "Recipient Location",
        "generated_internal_id",
      ],
      limit: Math.min(Math.max(search.limit, 1), 100),
      page: 1,
      sort: "Award Amount",
      order: "desc",
      subawards: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`USAspending returned ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const data = (await res.json()) as { results?: AwardRow[] };
  const awards = (data.results ?? []).map((r) => ({
    award_id: r["Award ID"],
    recipient: r["Recipient Name"],
    amount: r["Award Amount"],
    description: r.Description,
    start: r["Start Date"],
    end: r["End Date"],
    agency: [r["Awarding Agency"], r["Awarding Sub Agency"]].filter(Boolean).join(" / "),
    naics: r.NAICS,
    place_of_performance: r["Primary Place of Performance"],
    recipient_location: r["Recipient Location"],
    url: r.generated_internal_id ? `https://www.usaspending.gov/award/${r.generated_internal_id}` : undefined,
  }));
  return JSON.stringify({ window: `${isoDate(start)} to ${isoDate(end)}`, count: awards.length, awards });
}

export const federalAwardsTool: LocalTool = {
  definition: {
    name: "search_federal_awards",
    description: `Search new federal contract awards (USAspending.gov) by place of performance, industry and size. Returns recipient, amount, description, agency, NAICS, locations and a source URL for each award. Federal data lags: most contracts appear within days, Defense contracts up to 90 days later.
Houston metro county FIPS codes (state TX): ${Object.entries(HOUSTON_COUNTIES)
      .map(([n, c]) => `${n} ${c}`)
      .join(", ")}.
Useful NAICS prefixes: 23 construction (236 buildings, 237 heavy and civil/highway/pipeline, 238 specialty trades), 21 oil, gas and mining, 31-33 manufacturing, 42 wholesale, 562 waste and remediation.`,
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["days_back", "locations", "naics_prefixes", "keywords", "min_amount", "limit"],
      properties: {
        days_back: { type: "integer", description: "How many days back to look for new awards, e.g. 30" },
        locations: {
          type: "array",
          description: "Places of performance. Use empty strings for unused fields. Empty list means all of Texas.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["state", "county_fips", "city"],
            properties: {
              state: { type: "string", description: "2-letter state, e.g. TX" },
              county_fips: { type: "string", description: "3-digit county FIPS code, or empty" },
              city: { type: "string", description: "City name, or empty" },
            },
          },
        },
        naics_prefixes: { type: "array", items: { type: "string" }, description: "NAICS code prefixes to include, or empty for all" },
        keywords: { type: "array", items: { type: "string" }, description: "Keywords to match, at least 3 characters each, or empty" },
        min_amount: { type: "number", description: "Minimum award amount in dollars, e.g. 250000" },
        limit: { type: "integer", description: "Max results, up to 100" },
      },
    },
  },
  run: (input) => searchFederalAwards(input as AwardSearch),
};
