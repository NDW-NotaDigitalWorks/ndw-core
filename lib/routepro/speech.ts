// lib/routepro/speech.ts
export type SpeechSupport = {
  supported: boolean;
  reason?: string;
};

export function getSpeechSupport(): SpeechSupport {
  if (typeof window === "undefined") return { supported: false, reason: "server" };

  const w = window as any;
  const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return { supported: false, reason: "not_supported" };
  }

  return { supported: true };
}

export type SpeechController = {
  start: () => void;
  stop: () => void;
  supported: boolean;
};

export function createSpeechController(opts: {
  lang?: string; // "it-IT"
  onText: (text: string) => void;
  onError?: (msg: string) => void;
  onState?: (listening: boolean) => void;
}): SpeechController {
  if (typeof window === "undefined") {
    return { supported: false, start: () => {}, stop: () => {} };
  }

  const w = window as any;
  const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    opts.onError?.("Riconoscimento vocale non supportato in questo browser.");
    return { supported: false, start: () => {}, stop: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = opts.lang ?? "it-IT";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) transcript += r[0].transcript + " ";
    }
    transcript = transcript.trim();
    if (transcript) opts.onText(transcript);
  };

  recognition.onerror = (e: any) => {
    opts.onError?.(e?.error ? String(e.error) : "Errore vocale.");
    opts.onState?.(false);
  };

  recognition.onstart = () => opts.onState?.(true);
  recognition.onend = () => opts.onState?.(false);

  return {
    supported: true,
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}
