import { cn } from "@/lib/utils";

export type CorePhase = "idle" | "listening" | "thinking" | "speaking";

type Props = {
  phase: CorePhase;
  caption: string;
  onPressStart: () => void;
  onPressEnd: () => void;
};

const BARS = [0.4, 0.7, 0.45, 1, 0.55, 0.85, 0.5, 0.95, 0.6, 0.8, 0.42, 0.72];

export function JarvisCore({ phase, caption, onPressStart, onPressEnd }: Props) {
  const label =
    phase === "listening"
      ? "Listening"
      : phase === "thinking"
        ? "Assembling"
        : phase === "speaking"
          ? "JARVIS"
          : "Hold to speak";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-4 py-4",
        phase === "listening" && "is-listening",
        phase === "thinking" && "is-thinking",
        phase === "speaking" && "is-speaking",
      )}
    >
      <button
        type="button"
        aria-label="Talk to JARVIS"
        aria-pressed={phase === "listening"}
        onPointerDown={(e) => {
          e.preventDefault();
          onPressStart();
        }}
        onPointerUp={onPressEnd}
        onPointerCancel={onPressEnd}
        className="relative size-40 sm:size-48"
      >
        <svg viewBox="0 0 400 400" className="size-full text-accent" aria-hidden="true">
          <circle
            cx="200"
            cy="200"
            r="188"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.22"
          />
          <circle
            cx="200"
            cy="200"
            r="168"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 10"
            className="ring-spin origin-center"
            opacity="0.55"
          />
          <circle
            cx="200"
            cy="200"
            r="148"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.18"
          />
          <circle
            cx="200"
            cy="200"
            r="118"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="18 8 4 8"
            className="ring-spin-fast origin-center"
            opacity="0.7"
          />
          <circle
            cx="200"
            cy="200"
            r="78"
            fill="color-mix(in oklab, var(--color-accent) 8%, transparent)"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.95"
          />
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const x1 = 200 + Math.cos(angle) * 176;
            const y1 = 200 + Math.sin(angle) * 176;
            const x2 = 200 + Math.cos(angle) * 184;
            const y2 = 200 + Math.sin(angle) * 184;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="1"
                opacity={i % 3 === 0 ? 0.7 : 0.28}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
          <div className="flex h-12 items-end gap-1">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="eq-bar w-1 rounded-full bg-accent"
                style={{
                  height: `${h * 100}%`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </button>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-mono text-[0.68rem] tracking-[0.32em] text-accent uppercase">
          {label}
        </p>
        <p className="min-h-6 max-w-md text-sm text-muted">
          {caption || "Talk to JARVIS. He will assemble the Grok bots."}
        </p>
      </div>
    </div>
  );
}
