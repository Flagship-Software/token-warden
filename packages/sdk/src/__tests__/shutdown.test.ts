import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("warden.shutdown()", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flushes remaining events on shutdown", async () => {
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

    await warden.shutdown();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events).toHaveLength(1);
  });

  it("allows re-init after shutdown", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    await warden.shutdown();

    expect(() =>
      warden.init({ apiKey: "test2", endpoint: "http://test2/api/events" })
    ).not.toThrow();
  });

  it("clears buffer on shutdown", async () => {
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

    await warden.shutdown();

    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    await warden.flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("wrap throws after shutdown", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    await warden.shutdown();

    expect(() => warden.wrap({}, { feature: "test" })).toThrow(
      "call warden.init()"
    );
  });

  it("track throws after shutdown", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    await warden.shutdown();

    expect(() =>
      warden.track({
        feature: "test",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
        status: "success",
      })
    ).toThrow("call warden.init()");
  });
});
