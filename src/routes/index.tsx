import { createFileRoute } from "@tanstack/react-router";
import { CommandDeck } from "@/components/hud/deck";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <CommandDeck />;
}
