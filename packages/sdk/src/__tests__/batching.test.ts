import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("event batching", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("flushes when buffer reaches batchSize", async () => {
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      batchSize: 2,
    });

    class OpenAI {}
    const client = new OpenAI();
    const wrapped = warden.wrap(
      Object.assign(client, {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
          },
        },
      }),
      { feature: "test" }
    );

    await wrapped.chat.completions.create({ model: "gpt-4o" });
    expect(global.fetch).not.toHaveBeenCalled();

    await wrapped.chat.completions.create({ model: "gpt-4o" });
    await vi.advanceTimersByTimeAsync(0);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events).toHaveLength(2);
  });

  it("flushes on interval", async () => {
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      flushIntervalMs: 1000,
    });

    class OpenAI {}
    const client = new OpenAI();
    const wrapped = warden.wrap(
      Object.assign(client, {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
          },
        },
      }),
      { feature: "test" }
    );

    await wrapped.chat.completions.create({ model: "gpt-4o" });
    expect(global.fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1100);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not flush when buffer is empty", async () => {
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      flushIntervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1100);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends correct auth header on flush", async () => {
    const { warden } = await import("../index");
    warden.init({
      apiKey: "my-secret-key",
      endpoint: "http://test/api/events",
    });

    class OpenAI {}
    const client = new OpenAI();
    const wrapped = warden.wrap(
      Object.assign(client, {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            }),
          },
        },
      }),
      { feature: "test" }
    );

    await wrapped.chat.completions.create({ model: "gpt-4o" });
    await warden.flush();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://test/api/events",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-secret-key",
        }),
      })
    );
  });
});
