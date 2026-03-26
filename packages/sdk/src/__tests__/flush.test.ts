import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("flush semantics", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retains events in buffer when flush fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    warden.track({
      feature: "test",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      latencyMs: 100,
      status: "success",
    });

    await warden.flush();

    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    await warden.flush();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[1][1]!.body as string
    );
    expect(body.events).toHaveLength(1);
  });

  it("retains events when server returns non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    warden.track({
      feature: "test",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      latencyMs: 100,
      status: "success",
    });

    await warden.flush();

    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[1][1]!.body as string
    );
    expect(body.events).toHaveLength(1);
  });

  it("calls onError callback on flush failure", async () => {
    const networkError = new Error("network error");
    global.fetch = vi.fn().mockRejectedValue(networkError);

    const onError = vi.fn();
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      onError,
    });

    warden.track({
      feature: "test",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      latencyMs: 100,
      status: "success",
    });

    await warden.flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(networkError);
  });

  it("calls onError on non-2xx response", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503 } as Response);

    const onError = vi.fn();
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      onError,
    });

    warden.track({
      feature: "test",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      latencyMs: 100,
      status: "success",
    });

    await warden.flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toContain("503");
  });

  it("drops oldest events when buffer exceeds 1000", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      batchSize: 2000,
    });

    for (let i = 0; i < 1001; i++) {
      warden.track({
        feature: `feature-${i}`,
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        latencyMs: 10,
        status: "success",
      });
    }

    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events).toHaveLength(1000);
    expect(body.events[0].feature).toBe("feature-1");
    expect(body.events[999].feature).toBe("feature-1000");
  });
});
