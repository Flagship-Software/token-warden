import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("warden.track()", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws if init() was not called", async () => {
    const { warden } = await import("../index");
    expect(() =>
      warden.track({
        feature: "test",
        provider: "custom",
        model: "my-model",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
        status: "success",
      })
    ).toThrow("call warden.init()");
  });

  it("throws if feature is missing", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    expect(() =>
      warden.track({
        feature: "",
        provider: "custom",
        model: "my-model",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
        status: "success",
      })
    ).toThrow("feature is required");
  });

  it("throws if provider is missing", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    expect(() =>
      warden.track({
        feature: "test",
        provider: "",
        model: "my-model",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
        status: "success",
      })
    ).toThrow("provider is required");
  });

  it("throws if model is missing", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });
    expect(() =>
      warden.track({
        feature: "test",
        provider: "custom",
        model: "",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 100,
        status: "success",
      })
    ).toThrow("model is required");
  });

  it("records event and flushes correctly", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    warden.track({
      feature: "custom-pipeline",
      provider: "together",
      model: "llama-3.1-70b",
      inputTokens: 500,
      outputTokens: 200,
      totalTokens: 700,
      latencyMs: 350,
      status: "success",
      team: "ml-team",
      userId: "user-456",
      metadata: { pipeline: "rag" },
    });

    await warden.flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    const event = body.events[0];
    expect(event.feature).toBe("custom-pipeline");
    expect(event.provider).toBe("together");
    expect(event.model).toBe("llama-3.1-70b");
    expect(event.inputTokens).toBe(500);
    expect(event.outputTokens).toBe(200);
    expect(event.totalTokens).toBe(700);
    expect(event.latencyMs).toBe(350);
    expect(event.status).toBe("success");
    expect(event.team).toBe("ml-team");
    expect(event.userId).toBe("user-456");
    expect(event.metadata).toEqual({ pipeline: "rag" });
    expect(event.timestamp).toBeTypeOf("number");
  });

  it("auto-flushes when batchSize is reached", async () => {
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
      batchSize: 2,
    });

    const baseEvent = {
      feature: "test",
      provider: "custom",
      model: "m",
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      latencyMs: 10,
      status: "success" as const,
    };

    warden.track(baseEvent);
    expect(global.fetch).not.toHaveBeenCalled();

    warden.track(baseEvent);
    await new Promise((r) => setTimeout(r, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
