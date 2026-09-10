import { Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { gpt6Job, missionPackText, openUrl, reportsTo } from "@/lib/hq/catalog";
import type { MissionPack, Room } from "@/lib/hq/types";
import { copyText } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  room: Room;
  pack: MissionPack | null;
  openTarget: string;
  onOpen: () => void;
  onCopied: (kind: "job" | "pack") => void;
  onClose: () => void;
};

export function ChannelPanel({ room, pack, openTarget, onOpen, onCopied, onClose }: Props) {
  const assigned = pack?.whoId === room.id ? pack : null;
  const url = openTarget || room.openTarget;

  async function copyJob() {
    await copyText(gpt6Job(room, assigned?.job));
    onCopied("job");
    toast("GPT-6 job copied");
  }

  async function copyPack() {
    if (!assigned) {
      await copyJob();
      return;
    }
    await copyText(missionPackText(assigned, room));
    onCopied("pack");
    toast("Mission pack copied");
  }

  function openBot() {
    if (!url) {
      toast("Set a Grok bot link first");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    onOpen();
  }

  return (
    <section className="hud-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <header className="mb-3 flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.62rem] tracking-[0.28em] text-accent uppercase">
            Channel · {room.callsign}
          </p>
          <h2 className="truncate text-lg font-semibold leading-tight">{room.name}</h2>
          <p className="truncate text-xs text-muted">
            {reportsTo(room)} · {room.kind === "dock" ? "live app" : "Grok bot"}
          </p>
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

      <p className="mb-3 text-sm leading-snug text-muted">{room.function}</p>

      {assigned ? (
        <pre className="mb-3 max-h-36 overflow-auto rounded-md bg-elevated px-3 py-2 font-mono text-[0.68rem] leading-relaxed text-fg">
          {missionPackText(assigned, room)}
        </pre>
      ) : (
        <p className="mb-3 rounded-md bg-elevated px-3 py-2 text-xs text-muted">
          No live agent in this page. Open the bot, paste a GPT-6 job. HQ only navigates and copies packs.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={openBot}>
          <ExternalLink className="size-3.5" />
          {room.kind === "dock" ? "Open live app" : "Open bot"}
        </Button>
        <Button variant="subtle" onClick={() => void copyJob()}>
          <Copy className="size-3.5" />
          Copy GPT-6 job
        </Button>
        <Button variant="ghost" onClick={() => void copyPack()}>
          Copy mission pack
        </Button>
        <a
          href={`/station/${room.slug}`}
          className="inline-flex h-9 items-center rounded-sm border border-border px-3 text-xs text-fg no-underline hover:bg-elevated"
        >
          Station
        </a>
      </div>

      <p className="mt-auto pt-3 font-mono text-[0.62rem] leading-relaxed tracking-wide text-subtle">
        Open target: {url}
      </p>
    </section>
  );
}
