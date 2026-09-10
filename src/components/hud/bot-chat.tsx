import { Link } from "@tanstack/react-router";
import { Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { grokBotIdentity, grokMissionPacket, latestMission } from "@/lib/network/protocol";
import type { Agent, Mission, Traffic } from "@/lib/network/types";
import { copyText } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  agent: Agent;
  agents: Agent[];
  missions: Mission[];
  traffic: Traffic[];
  sending: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
};

export function BotChat({
  agent,
  agents,
  missions,
  traffic,
  sending,
  onSend,
  onClose,
}: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const mission = latestMission(missions, agent.id);
  const thread = [...traffic]
    .filter(
      (t) =>
        t.from_agent_id === agent.id ||
        t.to_agent_id === agent.id ||
        (agent.layer === "ceo" && (t.kind === "human" || t.kind === "jarvis")),
    )
    .reverse();

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thread.length, sending]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function copyIdentity() {
    await copyText(grokBotIdentity(agent, agents, origin));
    toast("Grok bot instructions copied");
  }

  async function copyPacket() {
    const text = mission
      ? mission.grok_message ||
        grokMissionPacket({
          agent,
          agents,
          title: mission.title,
          brief: mission.brief,
          origin,
        })
      : grokBotIdentity(agent, agents, origin);
    await copyText(text);
    toast("Packet copied — paste it into this Grok bot");
  }

  return (
    <section className="hud-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <header className="mb-3 flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.62rem] tracking-[0.28em] text-accent uppercase">
            Channel · {agent.callsign}
          </p>
          <h2 className="truncate text-lg font-semibold leading-tight">{agent.name}</h2>
          <p className="truncate text-xs text-muted">{agent.function}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
          aria-label="Close channel"
        >
          <X className="size-4" />
        </button>
      </header>

      {mission ? (
        <p className="mb-2 rounded-md bg-elevated px-3 py-2 font-mono text-[0.68rem] text-muted">
          Mission · {mission.title}
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-2">
        <Button variant="subtle" size="sm" onClick={() => void copyPacket()}>
          <Copy className="size-3.5" />
          Copy packet
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void copyIdentity()}>
          Grok instructions
        </Button>
        <Link
          to="/station/$slug"
          params={{ slug: agent.slug }}
          className="inline-flex h-9 items-center rounded-sm border border-border px-3 text-xs text-fg no-underline hover:bg-elevated"
        >
          Station
        </Link>
      </div>

      <div ref={scroller} className="hud-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {thread.length === 0 ? (
          <p className="px-1 text-sm text-muted">
            Channel is open. This bot can talk back to you here — and you can still paste a
            packet into its Grok bot chat.
          </p>
        ) : (
          thread.map((row) => {
            const fromOp = !row.from_agent_id || row.kind === "human";
            return (
              <article
                key={row.id}
                className={fromOp ? "ml-6 rounded-md bg-elevated px-3 py-2" : "mr-6 px-1"}
              >
                <p className="mb-1 font-mono text-[0.58rem] tracking-widest text-subtle uppercase">
                  {fromOp ? "You" : agent.callsign}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-snug">{row.body}</p>
              </article>
            );
          })
        )}
        {sending ? (
          <p className="font-mono text-[0.68rem] tracking-widest text-accent uppercase">
            {agent.callsign} typing
          </p>
        ) : null}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text || sending) return;
          onSend(text);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${agent.name}…`}
          className="h-11 min-w-0 flex-1 rounded-md border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </form>
    </section>
  );
}
