import readline from "node:readline/promises";
import type Anthropic from "@anthropic-ai/sdk";
import { describeError, run } from "../claude.js";
import { systemBlocks } from "../playbook.js";
import type { BrokerageProfile } from "../profile.js";

const HELP = `
Commands:
  /roleplay [scenario]  I play a tough shipper so you can practice (e.g. /roleplay food plant logistics mgr, happy with carriers)
  /debrief              End the roleplay and get scored feedback
  /coach                Back to coaching mode
  /reset                Start a fresh conversation
  /help                 Show this
  /quit                 Exit

In coaching mode, paste what a shipper said (email, call notes, objection) and get the best reply.
`;

const COACH_MODE = `Mode: live coaching. The rep will paste what a shipper said or describe a situation. Reply fast and practical: the best word-for-word response first (for a call or an email, whichever fits), then one line on why it works, then an alternative if useful. Keep it short; the rep may be mid-call. Latency-sensitive; begin your visible answer immediately.`;

function roleplayMode(scenario: string): string {
  return `Mode: roleplay practice. Play a realistic shipper being cold-called by the rep. Scenario: ${scenario || "pick a realistic mid-market shipper with a full routing guide and a mild bad experience with brokers"}. Stay in character: busy, skeptical, short answers, real objections. Warm up only if the rep earns it with good questions and specifics. Never break character or coach until the rep types /debrief. Start by answering the phone.`;
}

const DEBRIEF = `Mode: debrief. Step out of character. Score the rep's call 1-10 on opener, discovery, objection handling, and the close, quote the moments that worked and the ones that didn't, and give the three best lines they should have said instead.`;

export async function coach(profile: BrokerageProfile): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let messages: Anthropic.Beta.BetaMessageParam[] = [];
  let mode = COACH_MODE;
  let label = "coach";

  console.log(`Kyle Duncan, ${profile.brokerage.name} sales coach. Locked in.${HELP}`);

  const send = async (text: string) => {
    // The current mode rides on the user turn so it never edits the cached system prompt.
    messages.push({ role: "user", content: `<mode>${mode}</mode>\n\n${text}` });
    process.stdout.write("\n");
    await run({
      system: systemBlocks(profile),
      messages,
      effort: label === "debrief" ? "high" : "low",
      onText: (t) => process.stdout.write(t),
    });
    process.stdout.write("\n\n");
  };

  rl.on("SIGINT", () => {
    rl.close();
    process.exit(0);
  });

  rl.setPrompt(`[${label}] > `);
  rl.prompt();
  // Iterating the interface (rather than rl.question) buffers lines typed or piped while Claude is replying.
  for await (const raw of rl) {
    const line = raw.trim();
    if (line === "/quit" || line === "/exit") break;
    try {
      if (!line) {
        // nothing to send
      } else if (line === "/help") {
        console.log(HELP);
      } else if (line === "/reset") {
        messages = [];
        mode = COACH_MODE;
        label = "coach";
        console.log("Fresh start.\n");
      } else if (line === "/coach") {
        mode = COACH_MODE;
        label = "coach";
        console.log("Coaching mode. Paste what the shipper said.\n");
      } else if (line.startsWith("/roleplay")) {
        messages = [];
        mode = roleplayMode(line.slice("/roleplay".length).trim());
        label = "roleplay";
        await send("(The phone rings. You pick up.)");
      } else if (line === "/debrief") {
        mode = DEBRIEF;
        label = "debrief";
        await send("Debrief my call.");
        mode = COACH_MODE;
        label = "coach";
      } else {
        await send(line);
      }
    } catch (err) {
      console.error(`\n[error] ${describeError(err)}\n`);
      // Drop the unanswered user turn so the conversation stays valid.
      if (messages.at(-1)?.role === "user") messages.pop();
    }
    rl.setPrompt(`[${label}] > `);
    rl.prompt();
  }
  rl.close();
}
