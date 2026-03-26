"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs transition-colors hover:bg-[var(--accent)]"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
