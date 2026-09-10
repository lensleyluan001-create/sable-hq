import { Link } from "@tanstack/react-router";
import { KeyRound, Link2, ListChecks, Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";
import { DOCKS } from "@/lib/hq/catalog";
import { cn } from "@/lib/utils";

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  onOpenLinks: () => void;
  onOpenProfit: () => void;
  onOpenApi: () => void;
};

export function StatusBar({
  muted,
  onToggleMute,
  onOpenLinks,
  onOpenProfit,
  onOpenApi,
}: Props) {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-ZA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Africa/Johannesburg",
        }),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
      <Link to="/" className="flex min-w-0 items-baseline gap-2 no-underline">
        <span className="text-lg font-semibold tracking-[0.28em] text-fg">SABLE</span>
        <span className="hidden font-mono text-[0.68rem] tracking-[0.18em] text-muted uppercase sm:inline">
          HQ · CEO command
        </span>
      </Link>
      <nav className="ml-2 flex min-w-0 items-center gap-2 overflow-x-auto">
        {DOCKS.map((dock) => (
          <a
            key={dock.id}
            href={dock.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full border border-border px-3 py-1.5 font-mono text-[0.62rem] tracking-widest text-muted uppercase no-underline hover:text-fg"
          >
            {dock.label}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="font-mono text-xs tabular-nums tracking-widest text-muted">{clock}</span>
        <button
          type="button"
          onClick={onOpenProfit}
          className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted hover:text-fg"
          aria-label="Profit checklist"
        >
          <ListChecks className="size-4" />
        </button>
        <button
          type="button"
          onClick={onOpenApi}
          className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted hover:text-fg"
          aria-label="Optional Grok API"
        >
          <KeyRound className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-md border border-border text-muted transition-colors duration-150 hover:text-fg",
            muted && "text-danger",
          )}
          aria-pressed={muted}
          aria-label={muted ? "Unmute device voice" : "Mute device voice"}
        >
          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onOpenLinks}
          className="inline-flex size-11 items-center justify-center rounded-md border border-border text-muted hover:text-fg"
          aria-label="Edit bot deep links"
        >
          <Link2 className="size-4" />
        </button>
      </div>
    </header>
  );
}
