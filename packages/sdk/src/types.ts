export type WardenConfig = {
  apiKey: string;
  endpoint: string;
  batchSize?: number;
  flushIntervalMs?: number;
  onError?: (error: unknown) => void;
};

export type WrapOptions = {
  feature: string;
  team?: string;
  userId?: string;
};

export type CostEvent = {
  feature: string;
  team?: string;
  userId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: "success" | "error";
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type TrackEvent = Omit<CostEvent, "timestamp">;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type TokenExtractor = (result: unknown) => TokenUsage;

export type MethodProxyConfig = {
  methodName: string;
  provider: string;
  modelExtractor: (args: unknown[]) => string;
  tokenExtractor: TokenExtractor;
  opts: WrapOptions;
  pushEvent: (event: CostEvent) => void;
  shouldFlush: () => boolean;
  triggerFlush: () => void;
};
