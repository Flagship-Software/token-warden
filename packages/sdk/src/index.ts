import type {
  WardenConfig,
  WrapOptions,
  CostEvent,
  TrackEvent,
} from "./types";
import { detectProvider } from "./providers";
import {
  createMethodProxy,
  extractCompletionTokens,
  extractGoogleTokens,
  modelFromArgs,
} from "./proxy";

export type { WardenConfig, WrapOptions, CostEvent, TrackEvent };
export type { TokenUsage } from "./types";

const MAX_BUFFER_SIZE = 1000;

let config: WardenConfig | null = null;
const buffer: CostEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let flushing = false;

function pushEvent(event: CostEvent): void {
  if (buffer.length >= MAX_BUFFER_SIZE) {
    buffer.shift();
  }
  buffer.push(event);
}

function shouldFlush(): boolean {
  return buffer.length >= (config?.batchSize ?? 50);
}

function triggerFlush(): void {
  void flush();
}

async function flush(): Promise<void> {
  if (!config || buffer.length === 0 || flushing) return;
  flushing = true;
  const batch = buffer.slice();
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ events: batch }),
    });
    if (!response.ok) {
      const error = new Error(
        `Token Warden: flush failed with status ${response.status}`
      );
      config.onError?.(error);
      return;
    }
    buffer.splice(0, batch.length);
  } catch (err) {
    config.onError?.(err);
  } finally {
    flushing = false;
  }
}

const beforeExitHandler = () => void flush();

function scheduleFlush(): void {
  if (flushTimer) return;
  const interval = config?.flushIntervalMs ?? 5000;
  flushTimer = setInterval(() => {
    void flush();
  }, interval);
  flushTimer.unref();

  if (typeof process !== "undefined" && process.once) {
    process.once("beforeExit", beforeExitHandler);
  }
}

export const warden = {
  init(cfg: WardenConfig): void {
    if (initialized) {
      throw new Error(
        "Token Warden: already initialized. Call warden.shutdown() before re-initializing."
      );
    }
    if (!cfg.endpoint) {
      throw new Error("Token Warden: endpoint is required in config");
    }
    config = cfg;
    initialized = true;
    scheduleFlush();
  },

  wrap<T>(client: T, opts: WrapOptions): T {
    if (!initialized || !config) {
      throw new Error(
        "Token Warden: call warden.init() before guardian.wrap()"
      );
    }
    const provider = detectProvider(client);

    return new Proxy(client as object, {
      get(target, prop) {
        const value = (target as Record<string | symbol, unknown>)[prop];

        if (prop === "chat" && value && typeof value === "object") {
          return new Proxy(value, {
            get(chatTarget, chatProp) {
              if (chatProp === "completions") {
                const completions = (
                  chatTarget as Record<string | symbol, unknown>
                ).completions;
                if (completions && typeof completions === "object") {
                  return createMethodProxy(
                    completions as Record<string, unknown>,
                    {
                      methodName: "create",
                      provider,
                      modelExtractor: modelFromArgs,
                      tokenExtractor: extractCompletionTokens,
                      opts,
                      pushEvent,
                      shouldFlush,
                      triggerFlush,
                    }
                  );
                }
              }
              return (chatTarget as Record<string | symbol, unknown>)[chatProp];
            },
          });
        }

        if (prop === "messages" && value && typeof value === "object") {
          return createMethodProxy(value as Record<string, unknown>, {
            methodName: "create",
            provider: provider === "unknown" ? "anthropic" : provider,
            modelExtractor: modelFromArgs,
            tokenExtractor: extractCompletionTokens,
            opts,
            pushEvent,
            shouldFlush,
            triggerFlush,
          });
        }

        if (
          prop === "getGenerativeModel" &&
          typeof value === "function"
        ) {
          return (...args: unknown[]) => {
            const modelInstance = (value as Function).apply(target, args);
            const modelName =
              ((args[0] as Record<string, unknown>)?.model as string) ??
              "unknown";
            return createMethodProxy(
              modelInstance as Record<string, unknown>,
              {
                methodName: "generateContent",
                provider: provider === "unknown" ? "google" : provider,
                modelExtractor: () => modelName,
                tokenExtractor: extractGoogleTokens,
                opts,
                pushEvent,
                shouldFlush,
                triggerFlush,
              }
            );
          };
        }

        if (
          prop === "send" &&
          typeof value === "function" &&
          provider === "amazon"
        ) {
          return async (...args: unknown[]) => {
            const start = Date.now();
            const command = args[0] as Record<string, unknown> | undefined;
            const modelId =
              (command?.modelId as string) ??
              ((command?.input as Record<string, unknown>)?.modelId as string) ??
              "unknown";
            try {
              const result = await (value as Function).apply(target, args);
              const usage = (result as Record<string, unknown>).usage as
                | { inputTokens?: number; outputTokens?: number }
                | undefined;
              const inputTokens = usage?.inputTokens ?? 0;
              const outputTokens = usage?.outputTokens ?? 0;

              pushEvent({
                feature: opts.feature,
                team: opts.team,
                userId: opts.userId,
                provider,
                model: modelId,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                latencyMs: Date.now() - start,
                status: "success",
                timestamp: Date.now(),
              });

              if (shouldFlush()) triggerFlush();
              return result;
            } catch (err) {
              pushEvent({
                feature: opts.feature,
                team: opts.team,
                userId: opts.userId,
                provider,
                model: modelId,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                latencyMs: Date.now() - start,
                status: "error",
                timestamp: Date.now(),
              });
              throw err;
            }
          };
        }

        return value;
      },
    }) as T;
  },

  track(event: TrackEvent): void {
    if (!initialized || !config) {
      throw new Error(
        "Token Warden: call warden.init() before guardian.track()"
      );
    }
    if (!event.feature) {
      throw new Error("Token Warden: feature is required in track event");
    }
    if (!event.provider) {
      throw new Error("Token Warden: provider is required in track event");
    }
    if (!event.model) {
      throw new Error("Token Warden: model is required in track event");
    }

    pushEvent({
      ...event,
      timestamp: Date.now(),
    });

    if (shouldFlush()) triggerFlush();
  },

  flush,

  async shutdown(): Promise<void> {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    if (typeof process !== "undefined") {
      process.removeListener("beforeExit", beforeExitHandler);
    }
    flushing = false;
    await flush();
    buffer.length = 0;
    config = null;
    initialized = false;
  },
};
