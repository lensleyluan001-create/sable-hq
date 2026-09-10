import { ArrowUp, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHIPS = [
  "Sable Social: five Reel hooks, shoe is the hero",
  "Sales Chase: next action on quoted deals",
  "Marketing CEO: 17:15 rollup pack",
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onListen: () => void;
  disabled: boolean;
  listening: boolean;
};

export function CommandBar({
  value,
  onChange,
  onSubmit,
  onListen,
  disabled,
  listening,
}: Props) {
  return (
    <div className="px-4 pb-4 sm:px-6">
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className="shrink-0 rounded-full border border-border px-3 py-2 font-mono text-[0.65rem] tracking-wide text-muted hover:text-fg"
          >
            {chip}
          </button>
        ))}
      </div>
      <form
        className="hud-panel flex items-center gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <button
          type="button"
          onClick={onListen}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-accent"
          aria-label="Talk to CEO SABLE"
          aria-pressed={listening}
        >
          <Mic className="size-4" />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Who + one job — JARVIS builds a pack. Then Open bot."
          disabled={disabled}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-subtle focus-visible:outline-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !value.trim()}
          aria-label="Build mission pack"
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
