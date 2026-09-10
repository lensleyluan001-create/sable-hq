import { ROOMS } from "@/lib/hq/catalog";
import type { Room } from "@/lib/hq/types";
import { cn } from "@/lib/utils";

type Props = {
  selectedId: string | null;
  highlightIds: string[];
  onSelect: (id: string) => void;
};

export function NetTerminal({ selectedId, highlightIds, onSelect }: Props) {
  const hi = new Set(highlightIds);
  const edges: { from: string; to: string }[] = [];
  for (const room of ROOMS) {
    if (room.parentId) edges.push({ from: room.parentId, to: room.id });
  }

  function pos(id: string) {
    return ROOMS.find((r) => r.id === id)?.layout;
  }

  return (
    <section className="hud-panel relative flex h-full min-h-52 flex-col overflow-hidden p-3">
      <header className="pointer-events-none absolute top-3 left-4 z-10">
        <h2 className="font-mono text-[0.68rem] tracking-[0.28em] text-muted uppercase">
          Terminal
        </h2>
      </header>
      <div className="relative min-h-48 w-full flex-1">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full text-accent"
          aria-hidden="true"
        >
          {edges.map((e) => {
            const a = pos(e.from);
            const b = pos(e.to);
            if (!a || !b) return null;
            const key = `${e.from}-${e.to}`;
            const active = hi.has(e.from) || hi.has(e.to);
            const midY = (a.y + b.y) / 2;
            const d = `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
            return (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 0.55 : 0.28}
                  opacity={active ? 0.9 : 0.28}
                  vectorEffect="non-scaling-stroke"
                />
                {active ? (
                  <circle r="0.9" fill="currentColor" opacity="0.95">
                    <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
                  </circle>
                ) : null}
              </g>
            );
          })}
        </svg>
        {ROOMS.map((room) => (
          <NodeButton
            key={room.id}
            room={room}
            selected={selectedId === room.id}
            live={hi.has(room.id)}
            onSelect={() => onSelect(room.id)}
          />
        ))}
      </div>
      <p className="mt-1 hidden shrink-0 px-1 font-mono text-[0.62rem] tracking-widest text-subtle uppercase sm:block">
        Press a node to open its channel · hold to speak to CEO SABLE
      </p>
    </section>
  );
}

function NodeButton({
  room,
  selected,
  live,
  onSelect,
}: {
  room: Room;
  selected: boolean;
  live: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ left: `${room.layout.x}%`, top: `${room.layout.y}%` }}
      className="absolute z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      aria-label={`Open ${room.name}`}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border font-mono text-[0.58rem] tracking-widest transition-[background-color,border-color,color] duration-150 sm:size-9",
          room.layer === "ceo"
            ? "border-accent bg-elevated text-accent"
            : "border-border bg-surface text-fg",
          selected && "border-accent bg-accent text-accent-fg",
          live && !selected && "border-accent",
        )}
      >
        {room.callsign.slice(0, 3)}
      </span>
      <span className="max-w-16 truncate font-mono text-[0.52rem] tracking-wider text-muted uppercase sm:max-w-20">
        {room.layer === "ceo" ? "JARVIS" : room.name.replace(/^Sable /, "")}
      </span>
    </button>
  );
}
