export type RoomLayer = "ceo" | "director" | "worker";
export type RoomKind = "grok-bot" | "dock";
export type Desk = "command" | "marketing" | "sales" | "company" | "channel";

export type Room = {
  id: string;
  slug: string;
  name: string;
  callsign: string;
  layer: RoomLayer;
  parentId: string | null;
  kind: RoomKind;
  desk: Desk;
  function: string;
  openTarget: string;
  keywords: string[];
  doneCheck: string;
  jobTemplate: string;
  layout: { x: number; y: number };
};

export type Dock = {
  id: string;
  label: string;
  url: string;
};

export type MissionPack = {
  whoId: string;
  who: string;
  job: string;
  doneCheck: string;
  createdAt: number;
};

export type ActionLog = {
  id: string;
  at: number;
  kind: "pack" | "copy" | "open" | "note";
  roomId: string | null;
  body: string;
};

export type ProfitItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  note: string;
};
