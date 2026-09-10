type SpeechRec = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

function getRecognizer(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported() {
  return getRecognizer() !== null;
}

export function createRecognizer(handlers: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
}) {
  const Ctor = getRecognizer();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-ZA";
  rec.onresult = (ev) => {
    let interim = "";
    let finalText = "";
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const piece = ev.results[i];
      if (!piece) continue;
      if (piece.isFinal) finalText += piece[0].transcript;
      else interim += piece[0].transcript;
    }
    if (interim) handlers.onInterim(interim);
    if (finalText.trim()) handlers.onFinal(finalText.trim());
  };
  rec.onerror = () => handlers.onEnd();
  rec.onend = () => handlers.onEnd();
  return rec;
}

function fallbackSpeak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const pick =
    voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices.find((v) => /en-ZA/i.test(v.lang)) ||
    voices.find((v) => /en-US/i.test(v.lang));
  if (pick) utter.voice = pick;
  utter.rate = 1.02;
  utter.pitch = 0.92;
  window.speechSynthesis.speak(utter);
}

export async function playJarvisLine(text: string, muted: boolean) {
  if (muted || !text.trim()) return;
  fallbackSpeak(text);
}
