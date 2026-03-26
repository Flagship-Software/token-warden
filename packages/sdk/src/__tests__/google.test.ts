import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("Google AI wrapping", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects Google provider and intercepts generateContent", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class GoogleGenerativeAI {
      getGenerativeModel(_opts: { model: string }) {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              usageMetadata: {
                promptTokenCount: 50,
                candidatesTokenCount: 150,
                totalTokenCount: 200,
              },
            },
          }),
        };
      }
    }

    const client = new GoogleGenerativeAI();
    const wrapped = warden.wrap(client, { feature: "summarizer" });
    const model = wrapped.getGenerativeModel({ model: "gemini-2.5-pro" });
    await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "hello" }] }],
    });
    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].provider).toBe("google");
    expect(body.events[0].model).toBe("gemini-2.5-pro");
    expect(body.events[0].inputTokens).toBe(50);
    expect(body.events[0].outputTokens).toBe(150);
    expect(body.events[0].totalTokens).toBe(200);
  });

  it("records error when Google generateContent throws", async () => {
    const { warden } = await import("../index");
    warden.init({ apiKey: "test", endpoint: "http://test/api/events" });

    class GoogleGenerativeAI {
      getGenerativeModel(_opts: { model: string }) {
        return {
          generateContent: vi
            .fn()
            .mockRejectedValue(new Error("quota exceeded")),
        };
      }
    }

    const client = new GoogleGenerativeAI();
    const wrapped = warden.wrap(client, { feature: "summarizer" });
    const model = wrapped.getGenerativeModel({ model: "gemini-2.5-pro" });

    await expect(
      model.generateContent({ contents: [] })
    ).rejects.toThrow("quota exceeded");

    await warden.flush();

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string
    );
    expect(body.events[0].status).toBe("error");
    expect(body.events[0].provider).toBe("google");
  });
});
