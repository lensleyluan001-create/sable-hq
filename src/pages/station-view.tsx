import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gpt6Job, reportsTo, roomBySlug } from "@/lib/hq/catalog";
import { copyText } from "@/lib/utils";

export function StationView({ slug }: { slug: string }) {
  const room = roomBySlug(slug);

  if (!room) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6 bg-bg text-fg">
        <h1 className="text-2xl font-semibold">Station not found</h1>
        <p className="text-sm text-muted">No SABLE room matches that slug.</p>
        <a href="/" className="text-accent">
          Return to HQ
        </a>
      </main>
    );
  }

  const packet = [
    `SABLE STATION · ${room.name}`,
    `CALLSIGN: ${room.callsign}`,
    `REPORTS TO: ${reportsTo(room)}`,
    `KIND: ${room.kind === "dock" ? "live app" : "Grok bot"}`,
    `OPEN: ${room.openTarget}`,
    "",
    room.function,
    "",
    gpt6Job(room),
  ].join("\n");

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <header>
          <p className="font-mono text-[0.68rem] tracking-[0.28em] text-accent uppercase">
            SABLE station
          </p>
          <h1 className="text-3xl font-semibold tracking-wide">{room.name}</h1>
          <p className="text-sm text-muted">
            {room.callsign} · {room.layer} · reports to {reportsTo(room)}
          </p>
        </header>

        <pre className="hud-panel overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-fg">
          {packet}
        </pre>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              window.open(room.openTarget, "_blank", "noopener,noreferrer");
            }}
          >
            {room.kind === "dock" ? "Open live app" : "Open bot"}
          </Button>
          <Button
            variant="subtle"
            onClick={async () => {
              await copyText(gpt6Job(room));
              toast("GPT-6 job copied");
            }}
          >
            Copy GPT-6 job
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await copyText(packet);
              toast("Station copied");
            }}
          >
            Copy station
          </Button>
          <a
            href="/"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm no-underline hover:bg-elevated"
          >
            Command deck
          </a>
        </div>
      </div>
    </main>
  );
}
