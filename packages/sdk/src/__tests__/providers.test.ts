import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("expanded provider detection", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["DeepSeek", "deepseek"],
    ["Mistral", "mistral"],
    ["MistralClient", "mistral"],
    ["XAI", "xai"],
    ["Cohere", "cohere"],
    ["CohereClient", "cohere"],
    ["CohereClientV2", "cohere"],
    ["BedrockRuntimeClient", "amazon"],
  ])("detects %s as %s provider", async (className, expectedProvider) => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    const ClientClass = { [className]: class {} }[className]!;
    const client = new ClientClass();
    const wrapped = warden.wrap(
      Object.assign(client, {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              usage: { prompt_tokens: 10, completion_tokens: 20 },
            }),
          },
        },
      }),
      { feature: "test-feature" }
    );

    await wrapped.chat.completions.create({ model: "test-model" });
    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].provider).toBe(expectedProvider);
  });

  it("wraps Amazon Bedrock invokeModel calls", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class BedrockRuntimeClient {
      send = vi.fn().mockResolvedValue({
        usage: { inputTokens: 50, outputTokens: 100 },
        $metadata: {},
      });
    }

    const client = new BedrockRuntimeClient();
    const wrapped = warden.wrap(client, { feature: "bedrock-test" });

    await wrapped.send({ modelId: "amazon.nova-pro-v1:0", body: "{}" });
    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].provider).toBe("amazon");
    expect(body.events[0].model).toBe("amazon.nova-pro-v1:0");
    expect(body.events[0].inputTokens).toBe(50);
    expect(body.events[0].outputTokens).toBe(100);
  });
});
