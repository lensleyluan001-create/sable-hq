import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  oneJobFromOrder,
  openUrl,
  roomById,
  routeOrder,
} from "@/lib/hq/catalog";
import { EMPTY, loadHq, saveHq, type HqPersist } from "@/lib/hq/storage";
import type { ActionLog, MissionPack } from "@/lib/hq/types";
import { createRecognizer, playJarvisLine, speechSupported } from "@/lib/network/voice";
import { ChannelPanel } from "./channel-panel";
import { CommandBar } from "./command-bar";
import { CommsFeed } from "./comms-feed";
import { JarvisCore, type CorePhase } from "./jarvis-core";
import { LinksDialog } from "./links-dialog";
import { NetTerminal } from "./net-terminal";
import { OptionalApiPanel } from "./optional-api";
import { OrgTree } from "./org-tree";
import { ProfitChecklist } from "./profit-checklist";
import { StatusBar } from "./status-bar";

type Tab = "terminal" | "comms" | "channel";

export function CommandDeck() {
  const [hq, setHq] = useState<HqPersist>(EMPTY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<CorePhase>("idle");
  const [caption, setCaption] = useState("");
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [profitOpen, setProfitOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("terminal");
  const listening = useRef(false);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const finalRef = useRef("");
  const runRef = useRef<(text: string) => Promise<void>>(async () => {});
  const hqRef = useRef(hq);
  hqRef.current = hq;

  const selected = roomById(selectedId) ?? null;

  function persist(next: HqPersist) {
    hqRef.current = next;
    setHq(next);
    saveHq(next);
  }

  function pushLog(entry: Omit<ActionLog, "id" | "at">) {
    const item: ActionLog = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
    };
    persist({ ...hqRef.current, log: [item, ...hqRef.current.log].slice(0, 40) });
  }

  runRef.current = async (text: string) => {
    const order = text.trim();
    if (!order || phase === "thinking") return;
    setPhase("thinking");
    setCaption(order);
    setDraft("");
    const who = routeOrder(order);
    const pack: MissionPack = {
      whoId: who.id,
      who: who.name,
      job: oneJobFromOrder(order, who),
      doneCheck: who.doneCheck,
      createdAt: Date.now(),
    };
    persist({ ...hqRef.current, mission: pack });
    pushLog({
      kind: "pack",
      roomId: who.id,
      body: `JARVIS assembled ${who.name}: ${pack.job}`,
    });
    const spoken = `Pack ready for ${who.name}. Copy it, then open the bot.`;
    setHighlightIds([who.id, who.parentId].filter(Boolean) as string[]);
    setCaption(spoken);
    setSelectedId(who.id);
    setTab("channel");
    setPhase("speaking");
    await playJarvisLine(spoken, muted);
    setPhase("idle");
    window.setTimeout(() => setHighlightIds([]), 8000);
  };

  function startListen() {
    if (phase === "thinking" || listening.current) return;
    const rec = recRef.current;
    if (!rec) {
      toast("Voice is not available here — type the order instead");
      return;
    }
    finalRef.current = "";
    listening.current = true;
    setPhase("listening");
    setCaption("Listening…");
    try {
      rec.start();
    } catch {
      listening.current = false;
      setPhase("idle");
    }
  }

  function stopListen() {
    if (!listening.current) return;
    try {
      recRef.current?.stop();
    } catch {
      listening.current = false;
    }
  }

  useEffect(() => {
    persist(loadHq());
  }, []);

  useEffect(() => {
    if (!speechSupported()) return;
    recRef.current = createRecognizer({
      onInterim: (text) => setCaption(text),
      onFinal: (text) => {
        finalRef.current = text;
        setCaption(text);
      },
      onEnd: () => {
        listening.current = false;
        const spoken = finalRef.current.trim();
        if (spoken) void runRef.current(spoken);
        else setPhase("idle");
      },
    });
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        setSelectedId(null);
        setTab("terminal");
        return;
      }
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      if (e.type === "keydown") startListen();
      else stopListen();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  });

  function pickBot(id: string) {
    setSelectedId(id);
    setTab("channel");
  }

  const channel = selected ? (
    <ChannelPanel
      room={selected}
      pack={hq.mission}
      openTarget={openUrl(selected, hq.linkOverrides)}
      onOpen={() =>
        pushLog({
          kind: "open",
          roomId: selected.id,
          body: `Opened ${selected.name}`,
        })
      }
      onCopied={(kind) =>
        pushLog({
          kind: "copy",
          roomId: selected.id,
          body: kind === "pack" ? `Copied mission pack for ${selected.name}` : `Copied GPT-6 job for ${selected.name}`,
        })
      }
      onClose={() => setSelectedId(null)}
    />
  ) : (
    <CommsFeed log={hq.log} />
  );

  return (
    <div className="hud-root">
      <StatusBar
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onOpenLinks={() => setLinksOpen(true)}
        onOpenProfit={() => setProfitOpen(true)}
        onOpenApi={() => setApiOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 lg:px-6">
        <div className="hidden shrink-0 lg:block">
          <NetTerminal
            selectedId={selectedId}
            highlightIds={highlightIds}
            onSelect={pickBot}
          />
        </div>

        <div className="hidden min-h-0 flex-1 grid-cols-3 gap-3 overflow-hidden lg:grid">
          <div className="min-h-0 min-w-0 overflow-hidden">
            <OrgTree
              selectedId={selectedId}
              onSelect={pickBot}
              highlightIds={highlightIds}
              pack={hq.mission}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden">
            <JarvisCore
              phase={phase}
              caption={caption}
              onPressStart={startListen}
              onPressEnd={stopListen}
            />
          </div>
          <div className="min-h-0 min-w-0 overflow-hidden">{channel}</div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:hidden">
          <div className="shrink-0">
            <JarvisCore
              phase={phase}
              caption={caption}
              onPressStart={startListen}
              onPressEnd={stopListen}
            />
          </div>
          <div className="flex shrink-0 rounded-md border border-border p-1">
            {(["terminal", "comms", "channel"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`h-11 flex-1 rounded-sm text-xs tracking-widest uppercase ${tab === id ? "bg-elevated text-fg" : "text-muted"}`}
              >
                {id === "channel" ? "Channel" : id === "comms" ? "Comms" : "Terminal"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "terminal" ? (
              <NetTerminal
                selectedId={selectedId}
                highlightIds={highlightIds}
                onSelect={pickBot}
              />
            ) : tab === "comms" ? (
              <CommsFeed log={hq.log} />
            ) : selected ? (
              <ChannelPanel
                room={selected}
                pack={hq.mission}
                openTarget={openUrl(selected, hq.linkOverrides)}
                onOpen={() =>
                  pushLog({
                    kind: "open",
                    roomId: selected.id,
                    body: `Opened ${selected.name}`,
                  })
                }
                onCopied={(kind) =>
                  pushLog({
                    kind: "copy",
                    roomId: selected.id,
                    body:
                      kind === "pack"
                        ? `Copied mission pack for ${selected.name}`
                        : `Copied GPT-6 job for ${selected.name}`,
                  })
                }
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <section className="hud-panel h-full p-4 text-sm text-muted">
                Press a bot on the terminal. HQ opens a channel to copy a job and deep-link the Grok
                bot — it does not run the agent here.
              </section>
            )}
          </div>
        </div>
      </div>

      <CommandBar
        value={draft}
        onChange={setDraft}
        onSubmit={() => void runRef.current(draft)}
        onListen={startListen}
        disabled={phase === "thinking"}
        listening={phase === "listening"}
      />

      <LinksDialog
        open={linksOpen}
        overrides={hq.linkOverrides}
        onClose={() => setLinksOpen(false)}
        onChange={(linkOverrides) => persist({ ...hq, linkOverrides })}
      />
      <ProfitChecklist
        open={profitOpen}
        items={hq.profit}
        onClose={() => setProfitOpen(false)}
        onChange={(profit) => persist({ ...hq, profit })}
      />
      <OptionalApiPanel open={apiOpen} onClose={() => setApiOpen(false)} />
    </div>
  );
}
