export function detectProvider(client: unknown): string {
  const proto = Object.getPrototypeOf(client) as {
    constructor?: { name?: string };
  } | null;
  const name = proto?.constructor?.name?.toLowerCase() ?? "";
  if (name.includes("openai")) return "openai";
  if (name.includes("anthropic")) return "anthropic";
  if (name.includes("google") || name.includes("generativeai")) return "google";
  if (name.includes("deepseek")) return "deepseek";
  if (name.includes("mistral")) return "mistral";
  if (name.includes("xai")) return "xai";
  if (name.includes("cohere")) return "cohere";
  if (name.includes("bedrock")) return "amazon";
  return "unknown";
}
