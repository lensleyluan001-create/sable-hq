export type Layer = "ceo" | "director" | "worker";
export type AgentStatus = "idle" | "busy" | "offline";
export type MissionStatus = "active" | "done" | "blocked" | "superseded";
export type TrafficKind =
  | "human"
  | "jarvis"
  | "dispatch"
  | "ack"
  | "report"
  | "system"
  | "chat";

export type Agent = {
  id: string;
  slug: string;
  name: string;
  callsign: string;
  layer: Layer;
  parent_id: string | null;
  function: string;
  standing_orders: string;
  grok_handle: string;
  status: AgentStatus;
  sort_order: number;
};

export type Mission = {
  id: string;
  title: string;
  brief: string;
  grok_message: string;
  assignee_id: string;
  status: MissionStatus;
  priority: string;
  created_at: string;
};

export type Traffic = {
  id: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  kind: TrafficKind;
  body: string;
  created_at: string;
};

export type NetworkSnapshot = {
  agents: Agent[];
  missions: Mission[];
  traffic: Traffic[];
};

export type JarvisPacket = {
  agentId: string;
  missionTitle: string;
  brief: string;
  grokMessage: string;
  ack: string;
};

export type JarvisPlan = {
  spoken: string;
  intent: "dispatch" | "status" | "ack" | "unknown";
  packets: JarvisPacket[];
};

export type CommandResult =
  | { ok: true; plan: JarvisPlan }
  | { ok: false; error: string };

export type SpeakResult =
  | { ok: true; base64: string; mime: string }
  | { ok: false; error: string };

export type ChatResult =
  | { ok: true; reply: string }
  | { ok: false; error: string };
