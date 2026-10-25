import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.SALESMAN_MODEL ?? "claude-opus-5-5";

// Resolves ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
export const client = new Anthropic();

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export const WEB_TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: 15 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10 },
];

/** A client-side tool: its schema plus the function that runs it. */
export interface LocalTool {
  definition: Anthropic.Beta.BetaTool;
  run: (input: unknown) => Promise<string> | string;
}

export interface RunOptions {
  system: Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  effort: Effort;
  web?: boolean;
  localTools?: LocalTool[];
  /** Called with each chunk of visible text as it streams in. */
  onText?: (text: string) => void;
  /** Called when Claude starts a web search or fetch, for progress output. */
  onActivity?: (label: string) => void;
}

const MAX_STEPS = 25;

/**
 * Runs Claude until it finishes its turn: resumes server-tool pauses, executes
 * local tools, and returns the final text. `messages` is extended in place so
 * callers can keep the conversation going.
 */
export async function run(opts: RunOptions): Promise<string> {
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    ...(opts.web ? WEB_TOOLS : []),
    ...(opts.localTools ?? []).map((t) => t.definition),
  ];

  let finalText = "";
  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort },
      cache_control: { type: "ephemeral" },
      system: opts.system,
      messages: opts.messages,
      ...(tools.length ? { tools } : {}),
    });

    stream.on("text", (delta) => opts.onText?.(delta));
    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use" && opts.onActivity) {
        const input = block.input as { query?: string; url?: string };
        opts.onActivity(
          block.name === "web_search" ? `searching: ${input.query ?? ""}` : `reading: ${input.url ?? ""}`,
        );
      }
    });

    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      throw new Error(
        `Claude declined this request${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."}`,
      );
    }

    opts.messages.push({ role: "assistant", content: response.content });
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (text) finalText = text;

    if (response.stop_reason === "pause_turn") continue;

    if (response.stop_reason === "tool_use") {
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const tool = opts.localTools?.find((t) => t.definition.name === block.name);
        opts.onActivity?.(block.name);
        try {
          if (!tool) throw new Error(`Unknown tool: ${block.name}`);
          results.push({ type: "tool_result", tool_use_id: block.id, content: await tool.run(block.input) });
        } catch (err) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : String(err),
            is_error: true,
          });
        }
      }
      opts.messages.push({ role: "user", content: results });
      continue;
    }

    if (response.stop_reason === "max_tokens") {
      console.warn("\n[warning] response hit the output limit and may be cut off");
    }
    return finalText;
  }
  throw new Error(`Stopped after ${MAX_STEPS} steps without finishing.`);
}

export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Authentication failed. Set ANTHROPIC_API_KEY (or run `ant auth login`) and try again.";
  }
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the API. Wait a minute and retry.";
  if (err instanceof Anthropic.APIError) return `API error ${err.status ?? ""}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
