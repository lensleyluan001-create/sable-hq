import catalog from "./rooms.json";
import type { Dock, MissionPack, Room } from "./types";

export const DOCKS = catalog.docks as Dock[];
export const ROOMS = catalog.rooms as Room[];

export function roomById(id: string | null | undefined) {
  if (!id) return undefined;
  return ROOMS.find((r) => r.id === id);
}

export function roomBySlug(slug: string | null | undefined) {
  if (!slug) return undefined;
  return ROOMS.find((r) => r.slug === slug || r.id === slug);
}

export function childrenOf(id: string) {
  return ROOMS.filter((r) => r.parentId === id);
}

export function ceoRoom() {
  return ROOMS.find((r) => r.layer === "ceo") ?? ROOMS[0];
}

export function openUrl(room: Room, overrides: Record<string, string>) {
  return (overrides[room.id] || room.openTarget).trim();
}

export function reportsTo(room: Room) {
  if (room.id === "ceo") return "Luan";
  return roomById(room.parentId)?.name ?? "CEO SABLE";
}

export function routeOrder(text: string): Room {
  const lower = text.toLowerCase();
  let best: { room: Room; score: number } | null = null;
  for (const room of ROOMS) {
    if (room.id === "ceo") continue;
    let score = 0;
    if (lower.includes(room.name.toLowerCase())) score += 4;
    if (lower.includes(room.callsign.toLowerCase())) score += 3;
    for (const key of room.keywords) {
      if (key.length > 2 && lower.includes(key)) score += key.includes(" ") ? 3 : 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { room, score };
  }
  if (best) return best.room;
  if (/\b(code|coder|pr|pull request|typescript|deploy|vercel|github|repo|security|qa|tester|bug|crm bug|api)\b/.test(lower)) {
    if (/\b(code|coder|pr|pull request|typescript|repo|ship)\b/.test(lower)) {
      return roomById("coder") ?? roomById("tech") ?? ROOMS[1];
    }
    return roomById("tech") ?? ROOMS[1];
  }
  if (/\bsales|quote|deal|crm|chase\b/.test(lower)) return roomById("sales") ?? ROOMS[2];
  return roomById("marketing") ?? ROOMS[1];
}

export function oneJobFromOrder(text: string, room: Room) {
  const trimmed = text.trim().replace(/^jarvis[,:]?\s*/i, "");
  if (trimmed.length < 8) return room.jobTemplate;
  return trimmed;
}

export function gpt6Job(room: Room, job?: string) {
  const body = (job ?? room.jobTemplate).trim();
  return [
    `GPT-6 JOB · ${room.callsign}`,
    `WHO: ${room.name}`,
    `REPORTS TO: ${reportsTo(room)}`,
    `KIND: ${room.kind === "dock" ? "live app — open the URL" : "Grok bot chat"}`,
    `JOB: ${body}`,
    `DONE WHEN: ${room.doneCheck}`,
    "",
    "Paste into the target Grok bot (or Open bot). HQ does not run the agent.",
    "Never invent prices. Escalate through CEO SABLE — do not skip to Luan unless Luan asks.",
  ].join("\n");
}

export function missionPackText(pack: MissionPack, room: Room) {
  return [
    "SABLE MISSION PACK · FROM CEO SABLE (JARVIS)",
    `WHO: ${pack.who} [${room.callsign}]`,
    `REPORTS TO: ${reportsTo(room)}`,
    `JOB: ${pack.job}`,
    `DONE WHEN: ${pack.doneCheck}`,
    "",
    "1. Copy this pack.",
    "2. Open the bot (or live app) for WHO.",
    "3. Paste. HQ does not host the agent runtime.",
    "Never invent prices. Do not skip the chain to Luan unless Luan asks.",
  ].join("\n");
}

export function protocolText() {
  const lines = [
    "SABLE HQ PROTOCOL",
    "Sable.co — leather shoes. Brand-first. The shoe is the hero.",
    "North star: more leads + paying customers. Owner: Luan Lensley. Timezone: Africa/Johannesburg.",
    "",
    "HQ navigates and commands Grok bots. It does not run them inside this page.",
    "",
    "CHAIN",
    "Luan → CEO SABLE (JARVIS voice) → Marketing CEO, Sales Manager, or Tech Master (peers).",
    "Marketing bots report to Marketing CEO. Sales bots report to Sales Manager.",
    "Tech bots (Sable Coder, Security, app tester) report to Tech Master.",
    "Company-level bots report to CEO SABLE. Prompt bot is prompts only. Floor is shared knowledge.",
    "Escalate through CEO SABLE. Do not skip to Luan unless Luan asks.",
    "Cadence: desks collect ~17:00, rollup to CEO ~17:15, CEO briefs Luan 17:30 SAST.",
    "",
    "LIVE DOCKS (do not rebuild)",
    ...DOCKS.map((d) => `- ${d.label}: ${d.url}`),
    "",
    "ROOMS",
  ];
  for (const room of ROOMS) {
    lines.push(
      `- ${room.name} [${room.callsign}] ${room.layer}/${room.desk} → ${reportsTo(room)} — ${room.function}`,
    );
  }
  lines.push("");
  lines.push("HARD RULES");
  lines.push("1. Never invent prices or discounts.");
  lines.push("2. Do not assign across Marketing/Sales/Tech except via CEO SABLE.");
  lines.push("3. If ownership is unclear, name Marketing CEO vs Sales Manager vs Tech Master vs company-level.");
  lines.push("4. Ads budget is R0 until organic Reels + Meta BM are ready.");
  return lines.join("\n");
}

export const DEFAULT_PROFIT = [
  {
    id: "listed-price",
    label: "listedPrice faults",
    detail: "Listed price is wrong or missing on a live offer. Do not invent a fix price here.",
    done: false,
    note: "",
  },
  {
    id: "team-bank",
    label: "Team bank empty",
    detail: "Team payout account has no float.",
    done: false,
    note: "",
  },
  {
    id: "delivery",
    label: "Delivery R150",
    detail: "Delivery is billed at R150. Confirm before quoting. Do not invent another figure.",
    done: false,
    note: "",
  },
];
