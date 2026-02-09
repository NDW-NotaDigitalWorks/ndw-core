"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImportReview, type ReviewStop } from "@/components/routepro/ImportReview";
import { parseFlexStops } from "@/lib/routepro/flexTextParser";

function nowISO() {
  return new Date().toISOString();
}

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

type SpeechCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechCtor;
    SpeechRecognition?: SpeechCtor;
  }
}

export default function ImportVoiceContent({
  onBack,
}: {
  onBack: () => void;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [routeName, setRouteName] = useState("RoutePro • Vocale");
  const [rawText, setRawText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const [stops, setStops] = useState<ReviewStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 🎙️ voice
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!speechSupported) return;

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "it-IT";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res[0]?.transcript ?? "";
        if (res.isFinal) finalText += t + "\n";
      }
      if (finalText.trim()) {
        setRawText((prev) => (prev ? prev + "\n" : "") + finalText.trim());
      }
    };

    rec.onerror = () => {
      setIsRecording(false);
      setVoiceInfo("Microfono non disponibile qui. Usa la dettatura iPhone.");
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [speechSupported]);

  const counts = useMemo(() => {
    let errors = 0;
    let warns = 0;

    for (const s of stops) {
      const addrOk = normalizeText(s.address).length > 0;
      const cityOk = normalizeText(s.city ?? "").length > 0;
      if (!addrOk || !cityOk) errors++;
      else if (s.packages == null) warns++;
    }

    return { errors, warns };
  }, [stops]);

  function toggleRecording() {
    setVoiceInfo(null);

    if (!speechSupported || !recognitionRef.current) {
      setVoiceInfo("Su iPhone usa la dettatura della tastiera.");
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
      setVoiceInfo("Errore microfono.");
    }
  }

  function onAnalyze() {
    setError(null);
    try {
      const parsed = parseFlexStops(rawText);
      const normalized = parsed.map((s, i) => ({ ...s, stop_index: i + 1 }));
      setStops(normalized);
      setAnalyzed(true);
    } catch (e: any) {
      setError(e?.message ?? "Errore parsing");
    }
  }

  async function onCreateRoute() {
    if (!userId || saving) return;
    if (counts.errors > 0 || stops.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const { data: routeRow, error: routeErr } = await supabase
        .from("routes")
        .insert({
          user_id: userId,
          name: normalizeText(routeName) || "RoutePro • Vocale",
          created_at: nowISO(),
          updated_at: nowISO(),
        })
        .select("id")
        .single();

      if (routeErr) throw routeErr;

      const routeId = routeRow.id as string;

      const stopRows = stops.map((s, idx) => ({
        route_id: routeId,
        position: idx + 1,
        af_stop_number: idx + 1,
        stop_type: "delivery",
        optimized_position: null,
        address: `${normalizeText(s.address)}, ${normalizeText(s.city ?? "")}`,
        packages: s.packages ?? null,
        lat: null,
        lng: null,
        is_done: false,
      }));

      const { error: stopsErr } = await supabase
        .from("route_stops")
        .insert(stopRows);

      if (stopsErr) throw stopsErr;

      router.push(`/routepro/routes/${routeId}`);
    } catch (e: any) {
      setError(e?.message ?? "Errore creazione rotta");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-neutral-600">Caricamento…</div>;
  }

  return (
    <>
      {!analyzed ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">Import vocale</div>

            <Input
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Nome rotta"
            />

            <div className="flex gap-2">
              <Button
                variant={isRecording ? "secondary" : "outline"}
                onClick={toggleRecording}
                type="button"
              >
                {isRecording ? "⏹ Stop" : "🎙️ Microfono"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setRawText("")}
                type="button"
              >
                Pulisci
              </Button>
            </div>

            {voiceInfo && (
              <div className="text-xs text-neutral-600">{voiceInfo}</div>
            )}

            <textarea
              className="w-full min-h-[220px] rounded-xl border p-3 text-sm"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Detta o incolla qui…"
            />

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            <Button className="w-full" onClick={onAnalyze} type="button">
              Analizza
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={onBack}
              type="button"
            >
              ← Torna indietro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ImportReview
            stops={stops}
            onChange={setStops}
            onRemove={(i) =>
              setStops((prev) =>
                prev.filter((s) => s.stop_index !== i)
              )
            }
            onAdd={() =>
              setStops((prev) => [
                ...prev,
                {
                  stop_index: prev.length + 1,
                  address: "",
                  city: null,
                  packages: null,
                  delivery_window: null,
                },
              ])
            }
          />

          <Button
            className="w-full"
            onClick={onCreateRoute}
            disabled={saving || counts.errors > 0}
            type="button"
          >
            {saving ? "Creazione..." : "Crea rotta"}
          </Button>
        </>
      )}
    </>
  );
}
