import { ROOMS } from "@/lib/hq/catalog";
import { createVoiceSession } from "./network.functions";

const SAMPLE_RATE = 24000;
const WS_URL = "wss://api.x.ai/v1/realtime?model=grok-voice-latest";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

export type VoiceSessionHandlers = {
  onPhase?: (phase: VoicePhase) => void;
  onTranscript?: (text: string, interim: boolean) => void;
  onAssistantText?: (text: string) => void;
  onError?: (message: string) => void;
};

type SpeechRec = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

function getRecognizer(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when mic + WebSocket are available (Grok Voice path). */
export function speechSupported() {
  if (typeof window === "undefined") return false;
  const hasMedia =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";
  const hasWs = typeof WebSocket !== "undefined";
  return hasMedia && hasWs;
}

/** Browser SpeechRecognition still present (fallback only). */
export function browserSttSupported() {
  return getRecognizer() !== null;
}

function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function pcm16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i += 1) float32[i] = pcm16[i]! / 32768;
  return float32;
}

function jarvisInstructions(): string {
  const roster = ROOMS.map(
    (r) => `${r.name} [${r.callsign}] desk=${r.desk} → ${r.parentId ?? "Luan"}`,
  ).join("; ");
  return [
    "You are JARVIS, voice of CEO SABLE at Sable HQ for Sable.co (leather shoes).",
    "Speak briefly, calm, and precise. Brand-first; the shoe is the hero.",
    "HQ navigates and commands Grok bots. It does NOT run agent runtimes in-page.",
    "When the operator addresses a bot by name or callsign, acknowledge briefly.",
    "Do not invent prices or discounts. Escalate through CEO SABLE; do not skip to Luan unless Luan asks.",
    "Peers under CEO SABLE: Marketing CEO [MKT], Sales Manager [SLS], Tech Master [TECH].",
    "Sable Coder [CODER], Security [SEC], and app tester [QA] report to Tech Master.",
    `Roster: ${roster}`,
  ].join(" ");
}

function keytermsFromRooms(): string[] {
  const terms = new Set<string>();
  for (const r of ROOMS) {
    terms.add(r.name);
    terms.add(r.callsign);
    for (const k of r.keywords.slice(0, 3)) terms.add(k);
  }
  terms.add("JARVIS");
  terms.add("Sable");
  terms.add("Luan");
  return [...terms].filter((t) => t.length <= 50).slice(0, 100);
}

export type MintedVoiceSession = {
  clientSecret: string;
  expiresAt?: number;
  model: string;
};

/** POST to server fn; never sends XAI_API_KEY to the browser. */
export async function mintSession(): Promise<MintedVoiceSession> {
  const result = await createVoiceSession();
  return {
    clientSecret: result.clientSecret,
    expiresAt: result.expiresAt,
    model: result.model,
  };
}

export class GrokVoiceSession {
  private handlers: VoiceSessionHandlers;
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private playCtx: AudioContext | null = null;
  private playTime = 0;
  private listening = false;
  private connected = false;
  private phase: VoicePhase = "idle";
  private assistantBuf = "";
  private lastFinalUser = "";

  constructor(handlers: VoiceSessionHandlers = {}) {
    this.handlers = handlers;
  }

  get isListening() {
    return this.listening;
  }

  get isConnected() {
    return this.connected && !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  private setPhase(phase: VoicePhase) {
    this.phase = phase;
    this.handlers.onPhase?.(phase);
  }

  async connect(secret?: MintedVoiceSession): Promise<void> {
    if (this.isConnected) return;
    const minted = secret ?? (await mintSession());
    const token = minted.clientSecret;
    if (!token) throw new Error("Empty ephemeral client secret");

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL, [`xai-client-secret.${token}`]);
      this.ws = ws;
      let settled = false;

      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        this.connected = false;
        reject(new Error(msg));
      };

      ws.onopen = () => {
        this.connected = true;
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              voice: "eve",
              instructions: jarvisInstructions(),
              turn_detection: { type: "server_vad" },
              audio: {
                input: {
                  format: { type: "audio/pcm", rate: SAMPLE_RATE },
                  transcription: {
                    language_hint: "en",
                    keyterms: keytermsFromRooms(),
                  },
                },
                output: {
                  format: { type: "audio/pcm", rate: SAMPLE_RATE },
                },
              },
            },
          }),
        );
        settled = true;
        resolve();
      };

      ws.onerror = () => fail("Grok Voice WebSocket error");
      ws.onclose = () => {
        this.connected = false;
        if (!settled) fail("Grok Voice WebSocket closed before open");
      };
      ws.onmessage = (ev) => this.onMessage(ev);
    });
  }

  private onMessage(ev: MessageEvent) {
    if (typeof ev.data !== "string") return;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(ev.data) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(event.type ?? "");

    if (type === "error" || type === "response.failed") {
      const err =
        (event.error &&
          typeof event.error === "object" &&
          typeof (event.error as { message?: string }).message === "string" &&
          (event.error as { message: string }).message) ||
        (typeof event.message === "string" && event.message) ||
        type;
      this.handlers.onError?.(err);
      return;
    }

    if (
      type === "input_audio_buffer.speech_started" ||
      type === "conversation.item.input_audio_transcription.updated"
    ) {
      if (this.listening) this.setPhase("listening");
    }

    if (
      type === "conversation.item.input_audio_transcription.updated" ||
      type === "conversation.item.input_audio_transcription.delta"
    ) {
      const text =
        (typeof event.transcript === "string" && event.transcript) ||
        (typeof event.delta === "string" && event.delta) ||
        "";
      if (text) this.handlers.onTranscript?.(text, true);
    }

    if (
      type === "conversation.item.input_audio_transcription.completed" ||
      type === "conversation.item.input_audio_transcription.done"
    ) {
      const text =
        (typeof event.transcript === "string" && event.transcript) ||
        (event.item &&
          typeof event.item === "object" &&
          typeof (event.item as { transcript?: string }).transcript === "string" &&
          (event.item as { transcript: string }).transcript) ||
        "";
      const trimmed = text.trim();
      if (trimmed) {
        this.lastFinalUser = trimmed;
        this.handlers.onTranscript?.(trimmed, false);
      }
    }

    if (type === "response.created" || type === "response.output_item.added") {
      this.assistantBuf = "";
      this.setPhase("thinking");
    }

    if (
      type === "response.output_audio.delta" ||
      type === "response.audio.delta"
    ) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta) {
        this.setPhase("speaking");
        this.enqueueAudio(delta);
      }
    }

    if (
      type === "response.output_audio_transcript.delta" ||
      type === "response.audio_transcript.delta" ||
      type === "response.output_text.delta"
    ) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta) {
        this.assistantBuf += delta;
        this.handlers.onAssistantText?.(this.assistantBuf);
      }
    }

    if (
      type === "response.output_audio_transcript.done" ||
      type === "response.audio_transcript.done" ||
      type === "response.output_text.done"
    ) {
      const text =
        (typeof event.transcript === "string" && event.transcript) ||
        (typeof event.text === "string" && event.text) ||
        this.assistantBuf;
      if (text) this.handlers.onAssistantText?.(text);
    }

    if (type === "response.done" || type === "response.output_audio.done") {
      if (!this.listening) this.setPhase("idle");
      else this.setPhase("listening");
    }
  }

  private enqueueAudio(base64: string) {
    try {
      const float32 = base64ToFloat32(base64);
      if (!float32.length) return;
      if (!this.playCtx) {
        this.playCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        this.playTime = this.playCtx.currentTime;
      }
      const ctx = this.playCtx;
      const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      const startAt = Math.max(this.playTime, ctx.currentTime);
      src.start(startAt);
      this.playTime = startAt + buffer.duration;
    } catch {
      /* ignore decode/play glitches */
    }
  }

  async startListening(): Promise<void> {
    if (this.listening) return;
    if (!this.isConnected) await this.connect();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.mediaStream = stream;
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.audioCtx = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    this.source = source;
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    this.processor = processor;
    processor.onaudioprocess = (e) => {
      if (!this.listening || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = floatTo16BitPCM(input);
      const audio = pcm16ToBase64(pcm);
      this.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    this.listening = true;
    this.lastFinalUser = "";
    this.setPhase("listening");
  }

  stopListening(opts?: { commit?: boolean }) {
    if (!this.listening) return;
    this.listening = false;
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    this.processor = null;
    this.source = null;
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
    }
    if (this.mediaStream) {
      for (const t of this.mediaStream.getTracks()) t.stop();
      this.mediaStream = null;
    }
    if (opts?.commit && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      } catch {
        /* ignore */
      }
    }
    if (this.phase === "listening") this.setPhase("idle");
  }

  /** Last final user transcript observed from Grok transcription events. */
  getLastFinalUser() {
    return this.lastFinalUser;
  }

  close() {
    this.stopListening();
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.connected = false;
    if (this.playCtx) {
      void this.playCtx.close().catch(() => undefined);
      this.playCtx = null;
    }
    this.setPhase("idle");
  }
}

/**
 * @deprecated Prefer GrokVoiceSession. Thin browser STT fallback when mint fails.
 */
export function createRecognizer(handlers: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
}) {
  const Ctor = getRecognizer();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-ZA";
  rec.onresult = (ev) => {
    let interim = "";
    let finalText = "";
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const piece = ev.results[i];
      if (!piece) continue;
      if (piece.isFinal) finalText += piece[0].transcript;
      else interim += piece[0].transcript;
    }
    if (interim) handlers.onInterim(interim);
    if (finalText.trim()) handlers.onFinal(finalText.trim());
  };
  rec.onerror = () => handlers.onEnd();
  rec.onend = () => handlers.onEnd();
  return rec;
}

function fallbackSpeak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices.find((v) => /en-ZA/i.test(v.lang)) ||
    voices.find((v) => /en-US/i.test(v.lang));
  if (pick) utter.voice = pick;
  utter.rate = 1.02;
  utter.pitch = 0.92;
  window.speechSynthesis.speak(utter);
}

/** Deterministic pack-confirm TTS (speechSynthesis). Used so pack UX does not fight Grok audio. */
export async function playJarvisLine(text: string, muted: boolean) {
  if (muted || !text.trim()) return;
  fallbackSpeak(text);
}
