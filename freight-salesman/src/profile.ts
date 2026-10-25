import fs from "node:fs";

export interface BrokerageProfile {
  brokerage: {
    name: string;
    website?: string;
    mcNumber?: string;
    headquarters?: string;
    yearsInBusiness?: number;
    physicalAddress?: string;
  };
  rep: {
    name: string;
    title?: string;
    phone?: string;
    email?: string;
  };
  services: string[];
  equipment: string[];
  strongLanes: string[];
  targetIndustries: string[];
  targetRegions: string[];
  differentiators: string[];
  proofPoints: string[];
  thingsWeDoNotDo?: string[];
  notes?: string;
}

export function loadProfile(path = process.env.SALESMAN_PROFILE ?? "brokerage.json"): BrokerageProfile {
  if (!fs.existsSync(path)) {
    throw new Error(
      `No brokerage profile at ${path}. Copy brokerage.example.json to brokerage.json and fill it in.`,
    );
  }
  return JSON.parse(fs.readFileSync(path, "utf8")) as BrokerageProfile;
}

export function profileToText(p: BrokerageProfile): string {
  const list = (items?: string[]) => (items?.length ? items.map((i) => `- ${i}`).join("\n") : "- (not provided)");
  return `# Who you sell for

Brokerage: ${p.brokerage.name}${p.brokerage.website ? ` (${p.brokerage.website})` : ""}
${p.brokerage.mcNumber ? `MC#: ${p.brokerage.mcNumber}\n` : ""}${p.brokerage.headquarters ? `HQ: ${p.brokerage.headquarters}\n` : ""}${p.brokerage.yearsInBusiness ? `Years in business: ${p.brokerage.yearsInBusiness}\n` : ""}${p.brokerage.physicalAddress ? `Mailing address (for email footers): ${p.brokerage.physicalAddress}\n` : ""}
Rep (the person whose voice you write in): ${p.rep.name}${p.rep.title ? `, ${p.rep.title}` : ""}
${p.rep.phone ? `Phone: ${p.rep.phone}\n` : ""}${p.rep.email ? `Email: ${p.rep.email}\n` : ""}
## Services
${list(p.services)}

## Equipment we can cover
${list(p.equipment)}

## Lanes where we are strongest
${list(p.strongLanes)}

## Industries we want
${list(p.targetIndustries)}

## Regions we want
${list(p.targetRegions)}

## Real differentiators
${list(p.differentiators)}

## Proof points (only cite these, never invent others)
${list(p.proofPoints)}

## Things we do NOT do (never promise these)
${list(p.thingsWeDoNotDo)}
${p.notes ? `\n## Notes from the rep\n${p.notes}\n` : ""}`;
}
