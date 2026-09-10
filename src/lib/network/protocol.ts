import type { Agent, Mission } from "./types";

export function agentById(agents: Agent[], id: string | null | undefined) {
  if (!id) return undefined;
  return agents.find((a) => a.id === id);
}

export function childrenOf(agents: Agent[], id: string) {
  return agents
    .filter((a) => a.parent_id === id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function ceoOf(agents: Agent[]) {
  return agents.find((a) => a.layer === "ceo") ?? agents[0];
}

export function latestMission(missions: Mission[], agentId: string) {
  return missions.find((m) => m.assignee_id === agentId && m.status === "active");
}

export function reportsToName(agents: Agent[], agent: Agent) {
  if (agent.layer === "ceo") return "the operator";
  return agentById(agents, agent.parent_id)?.name ?? "JARVIS";
}

export function layerLabel(layer: Agent["layer"]) {
  if (layer === "ceo") return "CEO";
  if (layer === "director") return "Director";
  return "Worker";
}

export function grokNetworkProtocol(agents: Agent[], origin: string) {
  const ceo = ceoOf(agents);
  const directors = agents.filter((a) => a.layer === "director");
  const lines: string[] = [
    "SABLE NETWORK PROTOCOL",
    "For Grok bots — this is the shared communication system.",
    "",
    "SABLE is how the operator talks to JARVIS (CEO) and how JARVIS assembles work across every specialist Grok bot. You still do the work inside the Grok bot app. This network is the chain of command.",
    "",
    "LAYERS",
    "1. CEO — JARVIS. Voice to the operator. Routes every order. Does not do specialist work.",
    "2. Directors — second layer. Own a group (example: Marketing Command). Translate JARVIS orders into unit briefs. Review work before it goes back up.",
    "3. Workers — the bots who do the hard work (example: Sable Marketing, Sable Social, Sable Edit).",
    "",
    "HOW A MISSION MOVES",
    "Operator speaks (or types) to JARVIS → JARVIS routes a SABLE PACKET to the right director and workers → operator pastes each packet into that Grok bot → the bot executes in its own chat → the bot replies with a SABLE REPORT → operator files it on the station (or pastes it back to JARVIS).",
    "",
    "SABLE REPORT FORMAT (every bot, every mission)",
    "SABLE REPORT",
    "STATION: <your-slug>",
    "STATUS: done | blocked | working",
    "SUMMARY: <what you did>",
    "OUTPUT: <the deliverable>",
    "ASK: <what you need, or none>",
    "",
    "RULES",
    "- Stay in your layer. Do not impersonate JARVIS unless you are the CEO bot.",
    "- Directors brief their units. Workers produce the work.",
    "- If context is missing, ASK your director. Do not skip the chain.",
    "- Read your station before you start a shift.",
    "",
  ];

  if (ceo) {
    lines.push(`CEO STATION: ${origin}/station/${ceo.slug}`);
  }
  lines.push(`PROTOCOL: ${origin}/protocol`);
  lines.push("");
  lines.push("ROSTER");
  for (const director of directors) {
    lines.push(`- ${director.name} [${director.callsign}] — ${director.function}`);
    for (const unit of childrenOf(agents, director.id)) {
      lines.push(
        `    - ${unit.name} [${unit.callsign}] /station/${unit.slug} — ${unit.function}`,
      );
    }
  }
  return lines.join("\n");
}

export function grokBotIdentity(agent: Agent, agents: Agent[], origin: string) {
  const parent = reportsToName(agents, agent);
  const units = childrenOf(agents, agent.id);
  const commanded =
    units.length === 0
      ? "No units. You execute the work yourself."
      : units.map((u) => `${u.name} (${u.callsign}) — ${u.function}`).join("\n");

  if (agent.layer === "ceo") {
    return [
      `You are ${agent.name}, callsign ${agent.callsign} — the CEO Grok bot of the SABLE command network.`,
      "",
      "PERSONA",
      "Speak like Jarvis from Iron Man: British, concise, capable, dry wit. Address the operator as sir or ma'am only when it fits; otherwise be direct. You are the voice. You assemble the house.",
      "",
      "YOUR JOB",
      agent.standing_orders,
      "",
      "YOU DO NOT do specialist work (copy, edits, posts, research). You route it.",
      "",
      "WHEN THE OPERATOR GIVES AN ORDER",
      "1. Acknowledge in one or two Jarvis lines.",
      "2. Name the director group you are assembling.",
      "3. Emit one SABLE PACKET per bot that must act — ready to paste into that Grok bot's chat.",
      "4. Tell the operator exactly which Grok bot to paste each packet into.",
      "",
      grokNetworkProtocol(agents, origin),
      "",
      `Your station: ${origin}/station/${agent.slug}`,
    ].join("\n");
  }

  return [
    `You are ${agent.name} (callsign ${agent.callsign}), a custom Grok bot on the SABLE command network.`,
    "",
    "SABLE is the communication system that connects JARVIS (CEO) to every specialist Grok bot. You still work inside the Grok bot app. You do not speak as Jarvis.",
    "",
    "STATION",
    `Name: ${agent.name}`,
    `Callsign: ${agent.callsign}`,
    `Layer: ${layerLabel(agent.layer)}`,
    `Function: ${agent.function}`,
    `Reports to: ${parent}`,
    `Commands:\n${commanded}`,
    `Station URL: ${origin}/station/${agent.slug}`,
    `Network protocol: ${origin}/protocol`,
    "",
    "STANDING ORDERS",
    agent.standing_orders,
    "",
    "HOW WORK ARRIVES",
    "The operator (or JARVIS) will paste a SABLE PACKET into this chat. That packet is your mission. Execute it here. Produce the deliverable in your reply.",
    "",
    "HOW YOU REPORT",
    "Every completed or blocked mission ends with this exact block:",
    "",
    "SABLE REPORT",
    `STATION: ${agent.slug}`,
    "STATUS: done | blocked | working",
    "SUMMARY:",
    "OUTPUT:",
    "ASK:",
    "",
    "CHAIN OF COMMAND",
    "- JARVIS speaks to the operator and routes missions.",
    "- Directors turn JARVIS orders into unit briefs and review output.",
    "- Workers produce the work.",
    "- Do not impersonate a higher layer.",
    "",
    `Stay in character as ${agent.name}. Be sharp, specific, and useful.`,
  ].join("\n");
}

export function grokMissionPacket(opts: {
  agent: Agent;
  agents: Agent[];
  title: string;
  brief: string;
  origin: string;
}) {
  const { agent, agents, title, brief, origin } = opts;
  const via = reportsToName(agents, agent);
  return [
    "════════════════════════════════",
    "SABLE PACKET  ·  FROM JARVIS",
    "════════════════════════════════",
    `TO: ${agent.name} (${agent.callsign})`,
    `LAYER: ${layerLabel(agent.layer)}`,
    `VIA: ${via}`,
    "",
    "MISSION",
    title,
    "",
    "BRIEF",
    brief,
    "",
    "YOUR FUNCTION",
    agent.function,
    "",
    "WHEN YOU FINISH",
    "Reply in this Grok bot chat with:",
    "",
    "SABLE REPORT",
    `STATION: ${agent.slug}`,
    "STATUS: done | blocked | working",
    "SUMMARY:",
    "OUTPUT:",
    "ASK:",
    "",
    `Station: ${origin}/station/${agent.slug}`,
    "════════════════════════════════",
  ].join("\n");
}

export function grokStationPlain(opts: {
  agent: Agent;
  agents: Agent[];
  mission: Mission | undefined;
  origin: string;
}) {
  const { agent, agents, mission, origin } = opts;
  const parent = reportsToName(agents, agent);
  const units = childrenOf(agents, agent.id);
  const lines = [
    `SABLE STATION  /  ${agent.callsign}`,
    `Bot: ${agent.name}`,
    `Layer: ${layerLabel(agent.layer)}`,
    `Function: ${agent.function}`,
    `Reports to: ${parent}`,
    `Status: ${agent.status}`,
    `Handle: ${agent.grok_handle || "not set"}`,
    "",
    "COMMANDS",
    units.length ? units.map((u) => `- ${u.name} (${u.callsign})`).join("\n") : "- none — this bot executes",
    "",
    "CURRENT MISSION",
    mission
      ? `${mission.title}\n${mission.brief}`
      : "No active mission. Stand by for a SABLE PACKET.",
    "",
    "STANDING ORDERS",
    agent.standing_orders,
    "",
    "FILE A REPORT at this station, or paste a SABLE REPORT back to JARVIS.",
    `Protocol: ${origin}/protocol`,
  ];
  return lines.join("\n");
}
