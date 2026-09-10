import { createServerFn } from "@tanstack/react-start";
import type { ChatResult, CommandResult, NetworkSnapshot, SpeakResult } from "./types";

export const getNetwork = createServerFn({ method: "GET" }).handler(
  async (): Promise<NetworkSnapshot> => {
    const { loadNetwork } = await import("./network.server");
    return loadNetwork();
  },
);

export const getStation = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadStation } = await import("./network.server");
    return loadStation(data.slug);
  });

export const issueCommand = createServerFn({ method: "POST" })
  .validator((data: { text: string; origin: string }) => data)
  .handler(async ({ data }): Promise<CommandResult> => {
    const { runCommand } = await import("./network.server");
    return runCommand(data.text, data.origin);
  });

export const speakJarvis = createServerFn({ method: "POST" })
  .validator((data: { text: string }) => data)
  .handler(async ({ data }): Promise<SpeakResult> => {
    const { runSpeak } = await import("./network.server");
    return runSpeak(data.text);
  });

export const chatWithBot = createServerFn({ method: "POST" })
  .validator((data: { agentId: string; text: string }) => data)
  .handler(async ({ data }): Promise<ChatResult> => {
    const { runChatWithBot } = await import("./network.server");
    return runChatWithBot(data);
  });

export const fileReport = createServerFn({ method: "POST" })
  .validator(
    (data: {
      slug: string;
      status: "done" | "blocked" | "working";
      summary: string;
      output: string;
      ask: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { runFileReport } = await import("./network.server");
    return runFileReport(data);
  });

export const addAgent = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      layer: "director" | "worker";
      parentId: string;
      function: string;
      grokHandle: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { runAddAgent } = await import("./network.server");
    return runAddAgent(data);
  });

export const updateAgent = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      name?: string;
      function?: string;
      standing_orders?: string;
      grok_handle?: string;
      callsign?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { runUpdateAgent } = await import("./network.server");
    return runUpdateAgent(data);
  });

export const removeAgent = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { runRemoveAgent } = await import("./network.server");
    return runRemoveAgent(data.id);
  });

/** Mint ephemeral Grok Voice Mode client secret (server-only XAI_API_KEY). */
export const createVoiceSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    clientSecret: string;
    expiresAt?: number;
    model: "grok-voice-latest";
  }> => {
    const { runCreateVoiceSession } = await import("./voice.server");
    return runCreateVoiceSession();
  },
);
