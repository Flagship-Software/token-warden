import type { TokenUsage, MethodProxyConfig } from "./types";

export function extractCompletionTokens(result: unknown): TokenUsage {
  const usage = (result as Record<string, unknown>).usage as
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        input_tokens?: number;
        output_tokens?: number;
      }
    | undefined;
  const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

export function extractGoogleTokens(result: unknown): TokenUsage {
  const usageMetadata = (
    (result as Record<string, unknown>).response as
      | Record<string, unknown>
      | undefined
  )?.usageMetadata as
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined;
  const inputTokens = usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

export function modelFromArgs(args: unknown[]): string {
  return ((args[0] as Record<string, unknown>)?.model as string) ?? "unknown";
}

export function createMethodProxy<T extends Record<string, unknown>>(
  original: T,
  cfg: MethodProxyConfig,
): T {
  return new Proxy(original, {
    get(target, prop) {
      if (prop === cfg.methodName) {
        return async (...args: unknown[]) => {
          const start = Date.now();
          const model = cfg.modelExtractor(args);
          try {
            const fn = target[cfg.methodName] as (...a: unknown[]) => Promise<unknown>;
            const result = await fn.apply(target, args);
            const usage = cfg.tokenExtractor(result);

            cfg.pushEvent({
              feature: cfg.opts.feature,
              team: cfg.opts.team,
              userId: cfg.opts.userId,
              provider: cfg.provider,
              model,
              ...usage,
              latencyMs: Date.now() - start,
              status: "success",
              timestamp: Date.now(),
            });

            if (cfg.shouldFlush()) cfg.triggerFlush();
            return result;
          } catch (err) {
            cfg.pushEvent({
              feature: cfg.opts.feature,
              team: cfg.opts.team,
              userId: cfg.opts.userId,
              provider: cfg.provider,
              model,
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
      return (target as Record<string | symbol, unknown>)[prop];
    },
  }) as T;
}
