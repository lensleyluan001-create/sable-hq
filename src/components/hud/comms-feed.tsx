import { roomById } from "@/lib/hq/catalog";
import type { ActionLog } from "@/lib/hq/types";
import { cn } from "@/lib/utils";

type Props = {
  log: ActionLog[];
};

function kindLabel(kind: ActionLog["kind"]) {
  if (kind === "pack") return "PACK";
  if (kind === "copy") return "COPY";
  if (kind === "open") return "OPEN";
  return "NOTE";
}

export function CommsFeed({ log = [] }: Props) {
  return (
    <section className="hud-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
      <header className="mb-3 px-2">
        <h2 className="font-mono text-[0.68rem] tracking-[0.28em] text-muted uppercase">
          Comms
        </h2>
      </header>
      <div className="hud-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {(log ?? []).length === 0 ? (
          <p className="px-2 text-sm text-muted">
            Operator actions only. Copy a job or open a bot and it logs here. HQ does not stream
            agent sitreps.
          </p>
        ) : (
          (log ?? []).map((row) => {
            const room = roomById(row.roomId);
            return (
              <article key={row.id} className="px-2">
                <div className="mb-1 flex items-baseline gap-2 font-mono text-[0.62rem] tracking-widest uppercase">
                  <span
                    className={cn(
                      "text-subtle",
                      row.kind === "pack" && "text-accent",
                      row.kind === "open" && "text-ok",
                    )}
                  >
                    {kindLabel(row.kind)}
                  </span>
                  <span className="text-muted">{room?.callsign ?? "HQ"}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-snug text-fg">
                  {row.body}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
