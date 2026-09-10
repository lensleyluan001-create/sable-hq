import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OptionalApiPanel({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <section className="hud-panel w-full max-w-lg p-5">
        <header className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.62rem] tracking-[0.28em] text-warn uppercase">
              Optional · Separate
            </p>
            <h2 className="text-xl font-semibold">Grok API</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            aria-label="Close API panel"
          >
            <X className="size-4" />
          </button>
        </header>
        <p className="text-sm leading-relaxed text-muted">
          This panel is not the command system. Open bot, Copy GPT-6 job, and JARVIS mission packs
          work without a key.
        </p>
        <p className="mt-3 rounded-md border border-border bg-elevated px-3 py-3 text-sm text-fg">
          Not connected. Set <span className="font-mono text-accent">GROK_API_KEY</span> later if
          you want model calls from HQ. Until then this stays inert — no fake sitreps, no agent
          streams.
        </p>
      </section>
    </div>
  );
}
