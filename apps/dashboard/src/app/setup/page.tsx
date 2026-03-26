import { db } from "@/db";
import { costEvents } from "@/db";
import { sql } from "drizzle-orm";
import { CopyButton } from "./copy-button";

export default async function SetupPage() {
  const apiKey = process.env.WARDEN_API_KEY ?? "tw_dev_key";

  const [eventCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(costEvents);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Setup</h1>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-1 text-sm font-medium">Your API Key</h2>
        <p className="mb-4 text-xs text-[var(--muted-foreground)]">
          Use this key to authenticate SDK calls to the ingestion endpoint.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm">
            {apiKey}
          </code>
          <CopyButton text={apiKey} />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-sm font-medium">Integration Guide</h2>

        <div className="space-y-4">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">
            TypeScript / Node.js
          </h3>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs text-[var(--muted-foreground)]">
                1. Install the SDK
              </p>
              <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-3 font-[family-name:var(--font-geist-mono)] text-xs">
                <code>npm install token-warden</code>
              </pre>
            </div>

            <div>
              <p className="mb-1 text-xs text-[var(--muted-foreground)]">
                2. Initialize and wrap your client
              </p>
              <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-3 font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed">
                <code>{`import OpenAI from 'openai';
import warden from 'token-warden';

// Initialize with your API key
warden.init({
  apiKey: '${apiKey}',
  endpoint: '${typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/api/events',
});

// Wrap your OpenAI client — that's it!
const openai = new OpenAI();
const ai = warden.wrap(openai, {
  feature: 'support-bot',  // Tag this feature
  team: 'customer-experience',  // Optional team tag
});

// Use exactly like the original client
const response = await ai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});`}</code>
              </pre>
            </div>

            <div>
              <p className="mb-1 text-xs text-[var(--muted-foreground)]">
                3. Anthropic client support
              </p>
              <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-3 font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed">
                <code>{`import Anthropic from '@anthropic-ai/sdk';
import warden from 'token-warden';

const anthropic = new Anthropic();
const ai = warden.wrap(anthropic, {
  feature: 'summarizer',
});

const msg = await ai.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Summarize this...' }],
});`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-1 text-sm font-medium">Verification</h2>
        <p className="mb-4 text-xs text-[var(--muted-foreground)]">
          Check if events are flowing into the system.
        </p>
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${eventCount.count > 0 ? "bg-[var(--emerald)]" : "bg-[var(--muted)]"}`}
          />
          <span className="text-sm">
            {eventCount.count > 0
              ? `Receiving events \u2014 ${eventCount.count.toLocaleString()} total events recorded.`
              : "No events received yet. Complete the integration above and make an LLM call."}
          </span>
        </div>
      </div>
    </div>
  );
}
