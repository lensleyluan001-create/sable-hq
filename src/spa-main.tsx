import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { CommandDeck } from "@/components/hud/deck";
import { ProtocolView } from "@/pages/protocol-view";
import { StationView } from "@/pages/station-view";
import "./styles.css";

function usePath() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("popstate", cb);
      return () => window.removeEventListener("popstate", cb);
    },
    () => window.location.pathname,
  );
}

function App() {
  const path = usePath();
  if (path.startsWith("/protocol")) return <ProtocolView />;
  if (path.startsWith("/station/")) return <StationView slug={decodeURIComponent(path.split("/")[2] ?? "")} />;
  return <CommandDeck />;
}

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
      <Toaster theme="dark" position="top-center" />
    </StrictMode>,
  );
}
