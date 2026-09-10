import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { childrenOf, ceoOf } from "@/lib/network/protocol";
import type { Agent } from "@/lib/network/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  onAdd: (input: {
    name: string;
    layer: "director" | "worker";
    parentId: string;
    function: string;
    grokHandle: string;
  }) => Promise<void>;
  onUpdate: (input: {
    id: string;
    name: string;
    function: string;
    standing_orders: string;
    grok_handle: string;
    callsign: string;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

export function RosterDialog({
  open,
  onOpenChange,
  agents,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const ceo = ceoOf(agents);
  const directors = ceo ? childrenOf(agents, ceo.id) : [];
  const [layer, setLayer] = useState<"director" | "worker">("worker");
  const [name, setName] = useState("");
  const [fn, setFn] = useState("");
  const [parentId, setParentId] = useState(directors[0]?.id ?? "");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const editTarget = agents.find((a) => a.id === editing);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Dialog.Content className="hud-panel fixed inset-x-3 top-[8%] z-50 mx-auto flex max-h-[84dvh] max-w-lg flex-col overflow-hidden p-5">
          <Dialog.Title className="text-xl font-semibold tracking-wide">
            Grok bot roster
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            Directors own a group. Workers do the work. Add the bots you already run in Grok.
          </Dialog.Description>

          <div className="hud-scroll mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {editTarget ? (
              <EditForm
                agent={editTarget}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={async (patch) => {
                  setBusy(true);
                  try {
                    await onUpdate(patch);
                    setEditing(null);
                    toast("Station updated");
                  } finally {
                    setBusy(false);
                  }
                }}
                onRemove={
                  editTarget.layer === "ceo"
                    ? undefined
                    : async () => {
                        setBusy(true);
                        try {
                          await onRemove(editTarget.id);
                          setEditing(null);
                          toast("Bot cleared");
                        } catch (err) {
                          toast(err instanceof Error ? err.message : "Could not remove");
                        } finally {
                          setBusy(false);
                        }
                      }
                }
              />
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!name.trim() || !fn.trim()) return;
                  setBusy(true);
                  try {
                    await onAdd({
                      name: name.trim(),
                      layer,
                      parentId: layer === "worker" ? parentId : ceo?.id ?? "",
                      function: fn.trim(),
                      grokHandle: handle.trim(),
                    });
                    setName("");
                    setFn("");
                    setHandle("");
                    toast("Bot on the board");
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Could not add");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLayer("director")}
                    className={`h-11 flex-1 rounded-md border text-sm ${layer === "director" ? "border-accent text-accent" : "border-border text-muted"}`}
                  >
                    Director
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayer("worker")}
                    className={`h-11 flex-1 rounded-md border text-sm ${layer === "worker" ? "border-accent text-accent" : "border-border text-muted"}`}
                  >
                    Worker
                  </button>
                </div>
                {layer === "worker" ? (
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
                  >
                    {directors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Under {d.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name — e.g. Sable Research"
                  className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
                />
                <input
                  value={fn}
                  onChange={(e) => setFn(e.target.value)}
                  placeholder="Function — e.g. research briefs"
                  className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
                />
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="Grok bot handle (optional)"
                  className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
                />
                <Button type="submit" disabled={busy || !name.trim() || !fn.trim()}>
                  Add to network
                </Button>
              </form>
            )}

            <ul className="space-y-1">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(agent.id)}
                    className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-elevated"
                  >
                    <span className="truncate text-sm">{agent.name}</span>
                    <span className="font-mono text-[0.62rem] tracking-widest text-subtle uppercase">
                      {agent.layer}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditForm({
  agent,
  busy,
  onCancel,
  onSave,
  onRemove,
}: {
  agent: Agent;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: {
    id: string;
    name: string;
    function: string;
    standing_orders: string;
    grok_handle: string;
    callsign: string;
  }) => Promise<void>;
  onRemove?: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [fn, setFn] = useState(agent.function);
  const [callsign, setCallsign] = useState(agent.callsign);
  const [handle, setHandle] = useState(agent.grok_handle);
  const [orders, setOrders] = useState(agent.standing_orders);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          id: agent.id,
          name,
          function: fn,
          standing_orders: orders,
          grok_handle: handle,
          callsign,
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
      />
      <input
        value={callsign}
        onChange={(e) => setCallsign(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
      />
      <input
        value={fn}
        onChange={(e) => setFn(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
      />
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="Grok handle"
        className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
      />
      <textarea
        value={orders}
        onChange={(e) => setOrders(e.target.value)}
        rows={5}
        className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Back
        </Button>
        {onRemove ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </div>
    </form>
  );
}
