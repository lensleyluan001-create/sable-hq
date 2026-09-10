import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gpt6Job, protocolText, ROOMS } from "@/lib/hq/catalog";
import { copyText } from "@/lib/utils";

export const Route = createFileRoute("/protocol")({
  component: ProtocolPage,
});

function ProtocolPage() {
  const protocol = protocolText();

  return (
    <main className="hud-root">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <header>
          <p className="font-mono text-[0.68rem] tracking-[0.28em] text-accent uppercase">
            For Grok bots
          </p>
          <h1 className="text-3xl font-semibold tracking-wide">SABLE protocol</h1>
          <p className="text-sm text-muted">
            Paste this into a Grok bot, or copy a GPT-6 job per room. HQ does not run the agents.
          </p>
        </header>

        <pre className="hud-panel overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
          {protocol}
        </pre>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await copyText(protocol);
              toast("Protocol copied");
            }}
          >
            Copy protocol
          </Button>
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm no-underline hover:bg-elevated"
          >
            Command deck
          </Link>
        </div>

        <section className="space-y-2">
          <h2 className="font-mono text-[0.68rem] tracking-[0.28em] text-muted uppercase">
            Copy GPT-6 job
          </h2>
          {ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={async () => {
                await copyText(gpt6Job(room));
                toast(`${room.name} job copied`);
              }}
              className="flex h-11 w-full items-center justify-between rounded-md border border-border px-3 text-left text-sm hover:bg-elevated"
            >
              <span>{room.name}</span>
              <span className="font-mono text-[0.62rem] tracking-widest text-subtle uppercase">
                copy
              </span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
