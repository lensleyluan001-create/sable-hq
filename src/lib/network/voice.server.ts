import { env } from "@/lib/env.server";

export type VoiceSessionSecret = {
  clientSecret: string;
  expiresAt?: number;
  model: "grok-voice-latest";
};

function pickSecret(data: Record<string, unknown>): {
  clientSecret: string;
  expiresAt?: number;
} {
  const nested =
    data.client_secret && typeof data.client_secret === "object"
      ? (data.client_secret as Record<string, unknown>)
      : null;

  const raw =
    (typeof data.value === "string" && data.value) ||
    (typeof data.client_secret === "string" && data.client_secret) ||
    (typeof data.secret === "string" && data.secret) ||
    (nested && typeof nested.value === "string" && nested.value) ||
    (nested && typeof nested.secret === "string" && nested.secret) ||
    null;

  if (!raw) {
    throw new Error(
      "xAI client_secrets response missing secret (expected value / client_secret / secret)",
    );
  }

  const expiresRaw =
    (typeof data.expires_at === "number" && data.expires_at) ||
    (nested && typeof nested.expires_at === "number" && nested.expires_at) ||
    undefined;

  return { clientSecret: raw, expiresAt: expiresRaw };
}

/** Mint an ephemeral realtime client secret. Never expose XAI_API_KEY to the browser. */
export async function runCreateVoiceSession(): Promise<VoiceSessionSecret> {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "XAI_API_KEY is not set. Add it on Vercel (Production + Preview) to enable Grok Voice Mode.",
    );
  }

  const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expires_after: { seconds: 300 } }),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`xAI client_secrets returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg =
      (typeof data.error === "string" && data.error) ||
      (data.error &&
        typeof data.error === "object" &&
        typeof (data.error as { message?: string }).message === "string" &&
        (data.error as { message: string }).message) ||
      text.slice(0, 300) ||
      res.statusText;
    throw new Error(`xAI client_secrets failed (${res.status}): ${msg}`);
  }

  const { clientSecret, expiresAt } = pickSecret(data);
  return { clientSecret, expiresAt, model: "grok-voice-latest" };
}
