"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

function ImportVoiceContent({ value, onChange }: Props) {
  const recognitionRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }, []);

  useEffect(() => {
    if (!speechSupported) return;

    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "it-IT";

    rec.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + "\n";
        }
      }
      if (finalText.trim()) {
        onChange((value ? value + "\n" : "") + finalText.trim());
      }
    };

    rec.onerror = () => {
      setIsRecording(false);
      setInfo("Microfono non disponibile. Usa la dettatura della tastiera.");
    };

    rec.onend = () => setIsRecording(false);

    recognitionRef.current = rec;

    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [speechSupported, value, onChange]);

  function toggle() {
    if (!speechSupported || !recognitionRef.current) {
      setInfo("Usa la dettatura iOS/Android (microfono sulla tastiera).");
      return;
    }

    try {
      if (!isRecording) {
        recognitionRef.current.start();
        setIsRecording(true);
      } else {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    } catch {
      setIsRecording(false);
      setInfo("Impossibile avviare il microfono.");
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={isRecording ? "secondary" : "outline"}
        className="w-full"
        onClick={toggle}
      >
        {isRecording ? "⏹ Stop microfono" : "🎙️ Avvia microfono"}
      </Button>

      {info && (
        <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          {info}
        </div>
      )}

      {!speechSupported && (
        <div className="rounded-xl border bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Questo browser non supporta il microfono in-app. Usa la dettatura della tastiera.
        </div>
      )}
    </div>
  );
}

export default ImportVoiceContent;
export { ImportVoiceContent };
