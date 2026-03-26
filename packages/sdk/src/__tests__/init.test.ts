import { describe, it, expect, beforeEach, vi } from "vitest";

describe("warden.init()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws if endpoint is missing", async () => {
    const { warden } = await import("../index");
    // @ts-expect-error — intentionally omitting endpoint to test validation
    expect(() => warden.init({ apiKey: "test-key" })).toThrow(
      "endpoint is required"
    );
  });

  it("stores config when endpoint is provided", async () => {
    const { warden } = await import("../index");
    expect(() =>
      warden.init({
        apiKey: "test-key",
        endpoint: "http://localhost:3100/api/events",
      })
    ).not.toThrow();
  });

  it("throws on double init", async () => {
    const { warden } = await import("../index");
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
    });
    expect(() =>
      warden.init({
        apiKey: "test",
        endpoint: "http://test/api/events",
      })
    ).toThrow("already initialized");
  });

  it("allows re-init after shutdown", async () => {
    const { warden } = await import("../index");
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    warden.init({
      apiKey: "test",
      endpoint: "http://test/api/events",
    });
    await warden.shutdown();
    expect(() =>
      warden.init({
        apiKey: "test2",
        endpoint: "http://test2/api/events",
      })
    ).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("warden.wrap()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws if init() was not called", async () => {
    const { warden } = await import("../index");
    expect(() => warden.wrap({}, { feature: "test" })).toThrow(
      "call warden.init()"
    );
  });
});
