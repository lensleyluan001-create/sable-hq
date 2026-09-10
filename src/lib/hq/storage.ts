import { DEFAULT_PROFIT } from "./catalog";
import type { ActionLog, MissionPack, ProfitItem } from "./types";

const KEY = "sable-hq-v1";

export type HqPersist = {
  linkOverrides: Record<string, string>;
  log: ActionLog[];
  profit: ProfitItem[];
  mission: MissionPack | null;
};

export const EMPTY: HqPersist = {
  linkOverrides: {},
  log: [],
  profit: DEFAULT_PROFIT,
  mission: null,
};

export function loadHq(): HqPersist {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<HqPersist>;
    const profit =
      Array.isArray(parsed.profit) && parsed.profit.length
        ? DEFAULT_PROFIT.map((row) => {
            const hit = parsed.profit?.find((p) => p.id === row.id);
            return hit
              ? {
                  ...row,
                  done: Boolean(hit.done),
                  note: typeof hit.note === "string" ? hit.note : "",
                  label: typeof hit.label === "string" && hit.label.trim() ? hit.label : row.label,
                }
              : row;
          })
        : DEFAULT_PROFIT;
    return {
      linkOverrides: parsed.linkOverrides ?? {},
      log: Array.isArray(parsed.log) ? parsed.log.slice(0, 40) : [],
      profit,
      mission: parsed.mission ?? null,
    };
  } catch {
    return EMPTY;
  }
}

export function saveHq(state: HqPersist) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}
