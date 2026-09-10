import { childrenOf, ceoRoom, ROOMS } from "@/lib/hq/catalog";
import type { MissionPack, Room } from "@/lib/hq/types";
import { cn } from "@/lib/utils";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  highlightIds: string[];
  pack: MissionPack | null;
};

function NodeRow({
  room,
  selected,
  highlighted,
  depth,
  note,
  onSelect,
}: {
  room: Room;
  selected: boolean;
  highlighted: boolean;
  depth: number;
  note?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors duration-150",
        selected ? "bg-elevated" : "hover:bg-elevated/60",
        highlighted && "ring-1 ring-accent/50",
      )}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <span
        className={cn(
          "mt-1.5 size-1.5 rounded-full",
          room.kind === "dock" ? "bg-ok" : "bg-accent",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-fg">{room.name}</span>
          <span className="font-mono text-[0.62rem] tracking-widest text-subtle uppercase">
            {room.callsign}
          </span>
        </span>
        <span className="block truncate font-mono text-[0.65rem] text-muted">
          {note || room.function}
        </span>
      </span>
    </button>
  );
}

export function OrgTree({ selectedId, onSelect, highlightIds, pack }: Props) {
  const ceo = ceoRoom();
  const hi = new Set(highlightIds);
  const directors = childrenOf(ceo.id).filter((r) => r.layer === "director");
  const company = ROOMS.filter((r) => r.desk === "company");
  const channels = ROOMS.filter((r) => r.desk === "channel");

  function noteFor(room: Room) {
    return pack?.whoId === room.id ? pack.job : undefined;
  }

  return (
    <section className="hud-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <header className="mb-3 flex items-center justify-between px-2">
        <h2 className="font-mono text-[0.68rem] tracking-[0.28em] text-muted uppercase">
          Network
        </h2>
        <a
          href="/protocol"
          className="font-mono text-[0.62rem] tracking-widest text-accent uppercase no-underline hover:opacity-80"
        >
          Protocol
        </a>
      </header>
      <div className="hud-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        <NodeRow
          room={ceo}
          selected={selectedId === ceo.id}
          highlighted={hi.has(ceo.id)}
          depth={0}
          onSelect={() => onSelect(ceo.id)}
          note="Voice · CEO SABLE"
        />
        {directors.map((dir) => (
          <div key={dir.id} className="mt-2">
            <NodeRow
              room={dir}
              selected={selectedId === dir.id}
              highlighted={hi.has(dir.id)}
              depth={1}
              onSelect={() => onSelect(dir.id)}
              note={noteFor(dir)}
            />
            {childrenOf(dir.id).map((unit) => (
              <NodeRow
                key={unit.id}
                room={unit}
                selected={selectedId === unit.id}
                highlighted={hi.has(unit.id)}
                depth={2}
                onSelect={() => onSelect(unit.id)}
                note={noteFor(unit)}
              />
            ))}
          </div>
        ))}
        <p className="mt-3 px-2 font-mono text-[0.58rem] tracking-[0.2em] text-subtle uppercase">
          Company
        </p>
        {company.map((room) => (
          <NodeRow
            key={room.id}
            room={room}
            selected={selectedId === room.id}
            highlighted={hi.has(room.id)}
            depth={1}
            onSelect={() => onSelect(room.id)}
            note={noteFor(room)}
          />
        ))}
        <p className="mt-3 px-2 font-mono text-[0.58rem] tracking-[0.2em] text-subtle uppercase">
          Channels
        </p>
        {channels.map((room) => (
          <NodeRow
            key={room.id}
            room={room}
            selected={selectedId === room.id}
            highlighted={hi.has(room.id)}
            depth={1}
            onSelect={() => onSelect(room.id)}
            note={noteFor(room)}
          />
        ))}
      </div>
    </section>
  );
}
