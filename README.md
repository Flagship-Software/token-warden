# Token Warden

Track LLM costs per feature, team, and user — with budget alerts and anomaly detection.

[![npm version](https://img.shields.io/npm/v/token-warden)](https://www.npmjs.com/package/token-warden)
[![CI](https://github.com/Flagship-Software/token-warden/actions/workflows/ci.yml/badge.svg)](https://github.com/Flagship-Software/token-warden/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why

LLM API costs are opaque and hard to attribute. When multiple features share the same API keys, you can't tell which feature is responsible for cost spikes. Token Warden wraps your LLM clients to automatically capture token usage and attribute costs per feature.

## Quick Start

```bash
npm install token-warden
```

```typescript
import { warden } from "token-warden";
import OpenAI from "openai";

// Initialize Token Warden
warden.init({
  apiKey: "tw_your_api_key",
  endpoint: "https://your-token-warden-endpoint.com/v1/events",
});

// Wrap your OpenAI client — tracking happens automatically
const openai = warden.wrap(new OpenAI(), {
  feature: "chat-support",
  team: "cx-team",
});

// Use the client as usual
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

// In serverless environments, flush before the function exits
await warden.flush();
```

## Manual Tracking

For custom providers or direct HTTP calls that bypass SDK clients, use `warden.track()` to record usage manually.

```typescript
warden.track({
  provider: "together",
  model: "llama-3.1-70b",
  feature: "document-summary",
  inputTokens: 1200,
  outputTokens: 350,
  durationMs: 820,
});
```

## Supported Providers

| Provider             | SDK Pattern             | Auto-detected |
| -------------------- | ----------------------- | ------------- |
| OpenAI               | `new OpenAI()`          | ✓             |
| Anthropic            | `new Anthropic()`       | ✓             |
| Google Generative AI | `new GoogleGenerativeAI()` | ✓          |
| Amazon Bedrock       | `new BedrockRuntimeClient()` | ✓       |
| DeepSeek             | `new OpenAI()` (compatible) | ✓        |
| Mistral              | `new Mistral()`         | ✓             |
| xAI                  | `new OpenAI()` (compatible) | ✓        |
| Cohere               | `new CohereClient()`    | ✓             |

## API Reference

### `warden.init(config)`

Initialize Token Warden. Call once at application startup.

| Parameter   | Type     | Required | Description                                      |
| ----------- | -------- | -------- | ------------------------------------------------ |
| `apiKey`    | `string` | Yes      | Your Token Warden API key                        |
| `endpoint`  | `string` | Yes      | URL of the Token Warden ingestion endpoint       |
| `flushIntervalMs` | `number` | No | How often to flush events (default: `5000`)  |
| `maxBatchSize` | `number` | No    | Max events per batch (default: `100`)            |
| `debug`     | `boolean` | No     | Enable debug logging (default: `false`)          |

### `warden.wrap(client, opts)`

Wrap an LLM SDK client to automatically capture usage.

| Parameter   | Type     | Required | Description                                      |
| ----------- | -------- | -------- | ------------------------------------------------ |
| `client`    | `object` | Yes      | An LLM SDK client instance                      |
| `opts.feature` | `string` | No   | Feature name for cost attribution                |
| `opts.team` | `string` | No      | Team name for cost attribution                   |
| `opts.user` | `string` | No      | User identifier for cost attribution             |
| `opts.metadata` | `Record<string, string>` | No | Additional key-value metadata       |

### `warden.track(event)`

Manually record a usage event.

| Parameter       | Type     | Required | Description                                  |
| --------------- | -------- | -------- | -------------------------------------------- |
| `provider`      | `string` | Yes      | LLM provider name                           |
| `model`         | `string` | Yes      | Model identifier                             |
| `feature`       | `string` | No       | Feature name for cost attribution            |
| `team`          | `string` | No       | Team name for cost attribution               |
| `user`          | `string` | No       | User identifier for cost attribution         |
| `inputTokens`   | `number` | Yes      | Number of input tokens consumed             |
| `outputTokens`  | `number` | Yes      | Number of output tokens generated           |
| `durationMs`    | `number` | No       | Request duration in milliseconds             |
| `metadata`      | `Record<string, string>` | No | Additional key-value metadata     |

### `warden.flush()`

Flush all pending events to the ingestion endpoint. Returns a promise that resolves when all events have been sent. Call this before process exit in serverless environments.

### `warden.shutdown()`

Flush pending events and stop the background flush interval. Call this during graceful application shutdown.

## Dashboard

Token Warden includes a self-hosted dashboard for visualizing costs, setting budgets, and detecting anomalies.

### Features

- **Per-feature cost breakdown** with daily spend charts and sparkline trends
- **Feature drill-down** with model usage, cost over time, and recent request history
- **Budget alerts** — set daily, weekly, or monthly limits per feature with configurable thresholds
- **Anomaly detection** — automatically flags cost spikes exceeding 3x the 7-day hourly average
- **Webhook notifications** — Slack-compatible alerts when budgets are breached
- **Dual database support** — SQLite for local dev, PostgreSQL for production

### Setup

```bash
cd apps/dashboard
npm install
npm run db:setup        # Create tables + seed model pricing
npm run db:seed-demo    # Optional: generate 30 days of demo data
npm run dev             # Start on http://localhost:3100
```

### Connect the SDK

Point your Token Warden SDK at the dashboard's ingestion endpoint:

```typescript
import { warden } from "token-warden";

warden.init({
  apiKey: process.env.WARDEN_API_KEY,      // Set this on the dashboard too
  endpoint: "http://localhost:3100/api/events",
});
```

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `WARDEN_API_KEY` | `tw_dev_key` | Bearer token for event ingestion (set to match your SDK config) |
| `DATABASE_URL` | SQLite (`./data/warden.db`) | Set to `postgres://...` for PostgreSQL |

### Routes

| Route | Description |
| --- | --- |
| `/` | Dashboard overview — total spend, feature breakdown, daily trend |
| `/features/[name]` | Feature detail — cost over time, model usage, recent requests |
| `/alerts` | Budget management and alert history |
| `/setup` | API key display and integration guide |
| `/api/events` | `POST` — event ingestion endpoint |
| `/api/health` | `GET` — health check |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.
