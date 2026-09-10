import { X } from "lucide-react";
import { ROOMS } from "@/lib/hq/catalog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  overrides: Record<string, string>;
  onClose: () => void;
  onChange: (next: Record<string, string>) => void;
};

export function LinksDialog({ open, overrides, onClose, onChange }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <section className="hud-panel flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden p-5">
        <header className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.62rem] tracking-[0.28em] text-accent uppercase">
              Deep links
            </p>
            <h2 className="text-xl font-semibold">Open-bot targets</h2>
            <p className="text-sm text-muted">
              Paste each Grok bot share URL. Defaults open grok.com. CRM stays on the live Floor
              app.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            aria-label="Close links"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="hud-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {ROOMS.map((room) => (
            <label key={room.id} className="block">
              <span className="mb-1 flex items-baseline gap-2 font-mono text-[0.62rem] tracking-widest text-muted uppercase">
                {room.callsign}
                <span className="text-fg normal-case tracking-normal">{room.name}</span>
              </span>
              <input
                value={overrides[room.id] ?? room.openTarget}
                onChange={(e) => onChange({ ...overrides, [room.id]: e.target.value })}
                className="h-11 w-full rounded-md border border-border bg-elevated px-3 font-mono text-xs text-fg"
              />
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Button variant="subtle" onClick={onClose}>
            Done
          </Button>
        </div>
      </section>
    </div>
  );
}
