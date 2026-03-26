import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("warden.wrap()", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects OpenAI provider by constructor name", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class OpenAI {}
    const client = new OpenAI();
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

    await wrapped.chat.completions.create({ model: "gpt-4o" });
    await warden.flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].provider).toBe("openai");
    expect(body.events[0].model).toBe("gpt-4o");
    expect(body.events[0].inputTokens).toBe(10);
    expect(body.events[0].outputTokens).toBe(20);
    expect(body.events[0].status).toBe("success");
  });

  it("detects Anthropic provider and captures messages.create", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class Anthropic {}
    const client = new Anthropic();
    const wrapped = warden.wrap(
      Object.assign(client, {
        messages: {
          create: vi.fn().mockResolvedValue({
            usage: { input_tokens: 100, output_tokens: 200 },
          }),
        },
      }),
      { feature: "chat-bot" }
    );

    await wrapped.messages.create({ model: "claude-sonnet-4-6-20260301" });
    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].provider).toBe("anthropic");
    expect(body.events[0].inputTokens).toBe(100);
    expect(body.events[0].outputTokens).toBe(200);
  });

  it("records error status when underlying call throws", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class OpenAI {}
    const client = new OpenAI();
    const wrapped = warden.wrap(
      Object.assign(client, {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("rate limited")),
          },
        },
      }),
      { feature: "test-feature" }
    );

    await expect(
      wrapped.chat.completions.create({ model: "gpt-4o" })
    ).rejects.toThrow("rate limited");

    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].status).toBe("error");
    expect(body.events[0].inputTokens).toBe(0);
  });

  it("captures team and userId in events", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class OpenAI {}
    const client = new OpenAI();
    const wrapped = warden.wrap(
      Object.assign(client, {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              usage: { prompt_tokens: 5, completion_tokens: 5 },
            }),
          },
        },
      }),
      { feature: "test", team: "platform", userId: "user-123" }
    );

    await wrapped.chat.completions.create({ model: "gpt-4o" });
    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].team).toBe("platform");
    expect(body.events[0].userId).toBe("user-123");
  });
});
