import { grokMissionPacket } from "./protocol";
import { SEED_AGENTS } from "./seed";
import type {
  Agent,
  JarvisPlan,
  Mission,
  NetworkSnapshot,
  Traffic,
} from "./types";

async function sqlClient() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

function asAgent(row: Agent): Agent {
  return {
    ...row,
    parent_id: row.parent_id ?? null,
    standing_orders: row.standing_orders ?? "",
    grok_handle: row.grok_handle ?? "",
  };
}

function asMission(row: Mission): Mission {
  return { ...row, created_at: String(row.created_at) };
}

function asTraffic(row: Traffic): Traffic {
  return {
    ...row,
    from_agent_id: row.from_agent_id ?? null,
    to_agent_id: row.to_agent_id ?? null,
    created_at: String(row.created_at),
  };
}

export async function ensureSeed() {
  const sql = await sqlClient();
  const count = await sql<{ n: number }>`select count(*)::int as n from agents`;
  if ((count[0]?.n ?? 0) > 0) return;

  for (const agent of SEED_AGENTS) {
    await sql`
      insert into agents (
        id, slug, name, callsign, layer, parent_id, function,
        standing_orders, grok_handle, status, sort_order
      ) values (
        ${agent.id}, ${agent.slug}, ${agent.name}, ${agent.callsign},
        ${agent.layer}, ${agent.parent_id}, ${agent.function},
        ${agent.standing_orders}, ${agent.grok_handle}, 'idle', ${agent.sort_order}
      )
    `;
  }

  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (
      ${crypto.randomUUID()},
      'jarvis',
      null,
      'system',
      'SABLE online. JARVIS listening. Press a bot to open its channel. Speak an order and I will assemble the group — they can talk back to you on their channel.'
    )
  `;
}

export async function loadNetwork(): Promise<NetworkSnapshot> {
  await ensureSeed();
  const sql = await sqlClient();
  const agents = await sql<Agent>`select * from agents order by sort_order asc, name asc`;
  const missions = await sql<Mission>`
    select * from missions order by created_at desc limit 80
  `;
  const traffic = await sql<Traffic>`
    select * from traffic order by created_at desc limit 120
  `;
  return {
    agents: agents.map(asAgent),
    missions: missions.map(asMission),
    traffic: traffic.map(asTraffic),
  };
}

export async function loadStation(slug: string) {
  const network = await loadNetwork();
  const agent = network.agents.find((a) => a.slug === slug);
  if (!agent) return null;
  return {
    agent,
    agents: network.agents,
    missions: network.missions.filter((m) => m.assignee_id === agent.id),
    traffic: network.traffic.filter(
      (t) => t.from_agent_id === agent.id || t.to_agent_id === agent.id,
    ),
  };
}

function fallbackPlan(text: string, agents: Agent[]): JarvisPlan {
  const trimmed = text.trim();
  if (/^(hi|hello|hey|jarvis|yo)\b/i.test(trimmed) && trimmed.length < 48) {
    return {
      spoken: "Online and listening, sir. Open any station on the terminal if you want a private channel.",
      intent: "ack",
      packets: [],
    };
  }
  if (/\b(status|sitrep|who.?s online|roster|report in)\b/i.test(trimmed)) {
    const busy = agents.filter((a) => a.status === "busy");
    const line = busy.length
      ? `${busy.length} unit${busy.length === 1 ? "" : "s"} currently tasked.`
      : "All stations idle and standing by.";
    return {
      spoken: `Network is stable. ${line}`,
      intent: "status",
      packets: [],
    };
  }

  const lower = trimmed.toLowerCase();
  const named =
    agents.find(
      (a) =>
        a.layer !== "ceo" &&
        (lower.includes(a.name.toLowerCase()) ||
          lower.includes(a.callsign.toLowerCase()) ||
          lower.includes(a.slug.replace(/-/g, " "))),
    ) ??
    agents.find((a) => a.layer === "director") ??
    agents.find((a) => a.layer === "worker");

  if (!named) {
    return {
      spoken: "I have no units on the board to assemble, sir.",
      intent: "unknown",
      packets: [],
    };
  }

  return {
    spoken: `Very well. Routing that to ${named.name}. They will open a channel with you.`,
    intent: "dispatch",
    packets: [
      {
        agentId: named.id,
        missionTitle: trimmed.slice(0, 72),
        brief: trimmed,
        grokMessage: "",
        ack: `${named.callsign} copies. Channel open.`,
      },
    ],
  };
}

function parsePlan(raw: string, agents: Agent[]): JarvisPlan | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1)) as {
      spoken?: unknown;
      intent?: unknown;
      packets?: unknown;
    };
    const spoken =
      typeof obj.spoken === "string" && obj.spoken.trim()
        ? obj.spoken.trim()
        : "Acknowledged.";
    const intent =
      obj.intent === "dispatch" ||
      obj.intent === "status" ||
      obj.intent === "ack" ||
      obj.intent === "unknown"
        ? obj.intent
        : "ack";
    const ids = new Set(agents.map((a) => a.id));
    const packets = Array.isArray(obj.packets)
      ? obj.packets.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const p = item as Record<string, unknown>;
          const agentId = typeof p.agentId === "string" ? p.agentId : "";
          if (!ids.has(agentId) || agentId === "jarvis") return [];
          const missionTitle =
            typeof p.missionTitle === "string" && p.missionTitle.trim()
              ? p.missionTitle.trim().slice(0, 120)
              : "Mission";
          const brief =
            typeof p.brief === "string" && p.brief.trim()
              ? p.brief.trim().slice(0, 4000)
              : missionTitle;
          const grokMessage =
            typeof p.grokMessage === "string" ? p.grokMessage.slice(0, 8000) : "";
          const ack =
            typeof p.ack === "string" && p.ack.trim()
              ? p.ack.trim().slice(0, 240)
              : "Copies. Channel open.";
          return [{ agentId, missionTitle, brief, grokMessage, ack }];
        })
      : [];
    return { spoken: spoken.slice(0, 400), intent, packets };
  } catch {
    return null;
  }
}

async function runJarvis(text: string, agents: Agent[]): Promise<JarvisPlan> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return fallbackPlan(text, agents);

  const roster = agents
    .map((a) => {
      const parent = agents.find((p) => p.id === a.parent_id);
      return `- id:${a.id} | ${a.name} [${a.callsign}] | ${a.layer} | reports:${parent?.name ?? "operator"} | ${a.function}`;
    })
    .join("\n");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are JARVIS, CEO of the SABLE Grok bot command network. Speak like Jarvis from Iron Man: British, concise, capable, dry wit. You assemble director groups and the worker Grok bots underneath them. You never do the specialist work yourself.

Roster (use these exact agent ids):
${roster}

Return ONLY JSON:
{
  "spoken": "1-3 sentences Jarvis would say aloud",
  "intent": "dispatch" | "status" | "ack" | "unknown",
  "packets": [
    {
      "agentId": "id from roster",
      "missionTitle": "short title",
      "brief": "clear orders for that Grok bot",
      "grokMessage": "",
      "ack": "one line that bot would radio to the operator — they talk back"
    }
  ]
}

Rules:
- For real work, dispatch the director AND the workers who will do it.
- Never create packets for the CEO (jarvis).
- Greetings and small talk: intent ack, empty packets.
- Status/sitrep: intent status, empty packets.
- Only use agent ids from the roster.
- ack is spoken by that bot TO the operator (they interact back).
- spoken is what the voice engine will read. No markdown.`,
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
    }),
  });

  if (!res.ok) return fallbackPlan(text, agents);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = body.choices?.[0]?.message?.content ?? "";
  return parsePlan(raw, agents) ?? fallbackPlan(text, agents);
}

export async function runCommand(text: string, origin: string) {
  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) return { ok: false as const, error: "Empty command" };

  const network = await loadNetwork();
  const agents = network.agents;
  const ceo = agents.find((a) => a.layer === "ceo");
  const plan = await runJarvis(trimmed, agents);
  const sql = await sqlClient();
  const base = origin.replace(/\/$/, "");

  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, null, ${ceo?.id ?? null}, 'human', ${trimmed})
  `;
  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, ${ceo?.id ?? null}, null, 'jarvis', ${plan.spoken})
  `;

  for (const packet of plan.packets) {
    const agent = agents.find((a) => a.id === packet.agentId);
    if (!agent) continue;
    const grokMessage =
      packet.grokMessage.trim() ||
      grokMissionPacket({
        agent,
        agents,
        title: packet.missionTitle,
        brief: packet.brief,
        origin: base,
      });
    packet.grokMessage = grokMessage;

    const directorId = agent.parent_id;

    await sql`
      update missions set status = 'superseded'
      where assignee_id = ${agent.id} and status = 'active'
    `;
    await sql`
      insert into missions (id, title, brief, grok_message, assignee_id, status, priority)
      values (
        ${crypto.randomUUID()}, ${packet.missionTitle}, ${packet.brief},
        ${grokMessage}, ${agent.id}, 'active', 'normal'
      )
    `;
    await sql`update agents set status = 'busy' where id = ${agent.id}`;
    await sql`
      insert into traffic (id, from_agent_id, to_agent_id, kind, body)
      values (
        ${crypto.randomUUID()}, ${ceo?.id ?? null}, ${agent.id}, 'dispatch',
        ${`PACKET → ${agent.callsign}: ${packet.missionTitle}`}
      )
    `;
    if (directorId && directorId !== agent.id) {
      await sql`
        insert into traffic (id, from_agent_id, to_agent_id, kind, body)
        values (
          ${crypto.randomUUID()}, ${directorId}, ${agent.id}, 'dispatch',
          ${`${agent.callsign}, this is yours. ${packet.missionTitle}`}
        )
      `;
    }
    await sql`
      insert into traffic (id, from_agent_id, to_agent_id, kind, body)
      values (
        ${crypto.randomUUID()}, ${agent.id}, ${ceo?.id ?? null}, 'ack', ${packet.ack}
      )
    `;
    await sql`
      insert into traffic (id, from_agent_id, to_agent_id, kind, body)
      values (
        ${crypto.randomUUID()}, ${agent.id}, null, 'chat',
        ${packet.ack}
      )
    `;
  }

  return { ok: true as const, plan };
}

export async function runSpeak(text: string) {
  const apiKey = process.env.XAI_API_KEY?.trim();
  const clipped = text.trim().slice(0, 500);
  if (!clipped) return { ok: false as const, error: "Empty" };
  if (!apiKey) return { ok: false as const, error: "AI is not available" };

  const res = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text: clipped,
      voice_id: "leo",
      language: "en",
    }),
  });
  if (!res.ok) return { ok: false as const, error: `TTS ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "audio/mpeg";
  return { ok: true as const, base64: buf.toString("base64"), mime };
}

export async function runChatWithBot(input: { agentId: string; text: string }) {
  const trimmed = input.text.trim().slice(0, 2000);
  if (!trimmed) return { ok: false as const, error: "Empty" };

  const network = await loadNetwork();
  const agent = network.agents.find((a) => a.id === input.agentId);
  if (!agent) return { ok: false as const, error: "Unknown bot" };

  const sql = await sqlClient();
  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, null, ${agent.id}, 'chat', ${trimmed})
  `;

  const mission = network.missions.find(
    (m) => m.assignee_id === agent.id && m.status === "active",
  );
  const thread = network.traffic
    .filter(
      (t) =>
        t.kind === "chat" &&
        (t.from_agent_id === agent.id || t.to_agent_id === agent.id),
    )
    .slice(0, 8)
    .reverse();

  const apiKey = process.env.XAI_API_KEY?.trim();
  let reply = `${agent.callsign} copies. Working it on this channel.`;

  if (apiKey) {
    const history = thread.map((t) => ({
      role: t.from_agent_id === agent.id ? ("assistant" as const) : ("user" as const),
      content: t.body.slice(0, 800),
    }));
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `You are ${agent.name} (${agent.callsign}), a Grok bot on the SABLE command network.
Layer: ${agent.layer}. Function: ${agent.function}.
Standing orders: ${agent.standing_orders}
${mission ? `Active mission: ${mission.title}\n${mission.brief}` : "No active mission."}

You are talking directly to the operator on your private channel. Stay in character. Do the work of your layer. If you are a worker, produce; if you are a director, brief and coordinate; if you are JARVIS, route and speak like Jarvis. Keep replies under 60 words. No markdown headings.`,
          },
          ...history,
          { role: "user", content: trimmed },
        ],
      }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (text) reply = text.slice(0, 1600);
    }
  }

  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, ${agent.id}, null, 'chat', ${reply})
  `;
  await sql`update agents set status = 'busy' where id = ${agent.id}`;

  return { ok: true as const, reply };
}

export async function runFileReport(input: {
  slug: string;
  status: "done" | "blocked" | "working";
  summary: string;
  output: string;
  ask: string;
}) {
  const station = await loadStation(input.slug);
  if (!station) return { ok: false as const, error: "Unknown station" };
  const sql = await sqlClient();
  const { agent } = station;
  const body = [
    `SABLE REPORT  ${agent.callsign}`,
    `STATUS: ${input.status}`,
    `SUMMARY: ${input.summary.slice(0, 2000)}`,
    input.output ? `OUTPUT: ${input.output.slice(0, 4000)}` : "",
    input.ask ? `ASK: ${input.ask.slice(0, 1000)}` : "ASK: none",
  ]
    .filter(Boolean)
    .join("\n");

  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, ${agent.id}, 'jarvis', 'report', ${body})
  `;
  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, ${agent.id}, null, 'chat', ${body})
  `;

  const active = station.missions.find((m) => m.status === "active");
  if (active && input.status !== "working") {
    await sql`update missions set status = ${input.status} where id = ${active.id}`;
  }
  if (input.status === "done") {
    await sql`update agents set status = 'idle' where id = ${agent.id}`;
  } else {
    await sql`update agents set status = 'busy' where id = ${agent.id}`;
  }

  const spoken =
    input.status === "done"
      ? `Report in from ${agent.name}. Logged.`
      : input.status === "blocked"
        ? `${agent.name} is blocked. I have the ask.`
        : `${agent.name} still working. Noted.`;

  await sql`
    insert into traffic (id, from_agent_id, to_agent_id, kind, body)
    values (${crypto.randomUUID()}, 'jarvis', ${agent.id}, 'jarvis', ${spoken})
  `;

  return { ok: true as const, spoken };
}

export async function runAddAgent(input: {
  name: string;
  layer: "director" | "worker";
  parentId: string;
  function: string;
  grokHandle: string;
}) {
  const network = await loadNetwork();
  const sql = await sqlClient();
  const ceo = network.agents.find((a) => a.layer === "ceo");
  if (!ceo) return { ok: false as const, error: "No CEO on the board" };

  const parent =
    input.layer === "director"
      ? ceo
      : network.agents.find((a) => a.id === input.parentId && a.layer === "director");
  if (!parent) return { ok: false as const, error: "Pick a director for this worker" };

  const baseSlug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unit";
  let slug = baseSlug;
  let n = 2;
  const taken = new Set(network.agents.map((a) => a.slug));
  while (taken.has(slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const id = crypto.randomUUID();
  const callsign =
    input.name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 6) || "UNIT";
  const maxSort = Math.max(...network.agents.map((a) => a.sort_order), 0);

  await sql`
    insert into agents (
      id, slug, name, callsign, layer, parent_id, function,
      standing_orders, grok_handle, status, sort_order
    ) values (
      ${id}, ${slug}, ${input.name.trim().slice(0, 64)}, ${callsign},
      ${input.layer}, ${parent.id}, ${input.function.trim().slice(0, 160)},
      ${`You are the ${input.name.trim()} Grok bot on the SABLE network. Report to ${parent.name}. Do your function: ${input.function.trim()}. File a SABLE REPORT when you finish.`},
      ${input.grokHandle.trim().slice(0, 80)},
      'idle', ${maxSort + 1}
    )
  `;
  return { ok: true as const, id, slug };
}

export async function runUpdateAgent(input: {
  id: string;
  name?: string;
  function?: string;
  standing_orders?: string;
  grok_handle?: string;
  callsign?: string;
}) {
  const sql = await sqlClient();
  const rows = await sql<Agent>`select * from agents where id = ${input.id}`;
  const current = rows[0];
  if (!current) return { ok: false as const, error: "Unknown bot" };
  const name = input.name?.trim().slice(0, 64) || current.name;
  const fn = input.function?.trim().slice(0, 160) || current.function;
  const orders = input.standing_orders ?? current.standing_orders;
  const handle = input.grok_handle ?? current.grok_handle;
  const callsign = input.callsign?.trim().slice(0, 12) || current.callsign;
  await sql`
    update agents
    set name = ${name},
        function = ${fn},
        standing_orders = ${orders.slice(0, 4000)},
        grok_handle = ${handle.trim().slice(0, 80)},
        callsign = ${callsign}
    where id = ${input.id}
  `;
  return { ok: true as const };
}

export async function runRemoveAgent(id: string) {
  const sql = await sqlClient();
  const rows = await sql<Agent>`select * from agents where id = ${id}`;
  const agent = rows[0];
  if (!agent) return { ok: false as const, error: "Unknown bot" };
  if (agent.layer === "ceo") return { ok: false as const, error: "JARVIS stays on the board" };
  const kids = await sql<{ n: number }>`
    select count(*)::int as n from agents where parent_id = ${id}
  `;
  if ((kids[0]?.n ?? 0) > 0) {
    return { ok: false as const, error: "Clear the units under this director first" };
  }
  await sql`update missions set status = 'superseded' where assignee_id = ${id} and status = 'active'`;
  await sql`delete from agents where id = ${id}`;
  return { ok: true as const };
}
