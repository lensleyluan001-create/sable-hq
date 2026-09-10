import { X } from "lucide-react";
import type { ProfitItem } from "@/lib/hq/types";

type Props = {
  open: boolean;
  items: ProfitItem[];
  onClose: () => void;
  onChange: (items: ProfitItem[]) => void;
};

export function ProfitChecklist({ open, items, onClose, onChange }: Props) {
  if (!open) return null;

  function patch(id: string, next: Partial<ProfitItem>) {
    onChange(items.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <section className="hud-panel flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden p-5">
        <header className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.62rem] tracking-[0.28em] text-accent uppercase">
              Profit
            </p>
            <h2 className="text-xl font-semibold">Checklist</h2>
            <p className="text-sm text-muted">
              Local only. Tick what is actually true. Do not invent prices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:text-fg"
            aria-label="Close checklist"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="hud-scroll min-h-0 flex-1 space-y-3 overflow-y-auto">
          {items.map((item) => (
            <article key={item.id} className="rounded-md border border-border p-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => patch(item.id, { done: e.target.checked })}
                  className="mt-1 size-4 accent-[var(--color-accent)]"
                />
                <span className="min-w-0 flex-1">
                  <input
                    value={item.label}
                    onChange={(e) => patch(item.id, { label: e.target.value })}
                    className="w-full bg-transparent text-sm font-medium text-fg focus-visible:outline-none"
                  />
                  <span className="block text-xs text-muted">{item.detail}</span>
                </span>
              </label>
              <input
                value={item.note}
                onChange={(e) => patch(item.id, { note: e.target.value })}
                placeholder="Note (optional)"
                className="mt-2 h-10 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle"
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
