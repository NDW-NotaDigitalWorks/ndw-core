// app/routepro/import/voice/page.tsx
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

export default function ImportVoicePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [routeName, setRouteName] = useState("RoutePro • Vocale");
  const [rawText, setRawText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const [stops, setStops] = useState<ReviewStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // voice
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
    // init recognition once
    if (typeof window === "undefined") return;
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
      setVoiceInfo("Microfono non disponibile qui. Usa la dettatura iPhone sulla tastiera.");
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

  const stopCount = stops.length;
  const canAnalyze = rawText.trim().length > 0;

  const canCreate = analyzed && stopCount > 0 && !saving && counts.errors === 0;

  const parsedPreviewCount = useMemo(() => {
    if (!rawText.trim()) return 0;
    try {
      return parseFlexStops(rawText).length;
    } catch {
      return 0;
    }
  }, [rawText]);

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

  function onRemove(stopIndex: number) {
    const next = stops
      .filter((s) => s.stop_index !== stopIndex)
      .map((s, i) => ({ ...s, stop_index: i + 1 }));
    setStops(next);
  }

  function onAdd() {
    const next = [
      ...stops,
      { stop_index: stops.length + 1, address: "", city: null, packages: null, delivery_window: null },
    ];
    setStops(next);
  }

  function toggleRecording() {
    setVoiceInfo(null);

    if (!speechSupported || !recognitionRef.current) {
      setVoiceInfo("Su iPhone usa la dettatura della tastiera (icona microfono sulla tastiera).");
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
      setVoiceInfo("Non riesco ad avviare il microfono qui. Usa la dettatura iPhone.");
    }
  }

  async function onCreateRoute() {
    if (!userId) return;
    if (!canCreate) return;

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

      const stopRows = stops
        .map((s) => ({
          address: normalizeText(s.address),
          city: normalizeText(s.city ?? ""),
          packages: s.packages ?? null,
        }))
        .filter((s) => s.address.length > 0 && s.city.length > 0)
        .map((s, idx) => ({
          route_id: routeId,
          position: idx + 1,
          af_stop_number: idx + 1,
          stop_type: "delivery",
          optimized_position: null,
          address: `${s.address}, ${s.city}`,
          packages: s.packages,
          lat: null,
          lng: null,
          is_done: false,
        }));

      const { error: stopsErr } = await supabase.from("route_stops").insert(stopRows);
      if (stopsErr) throw stopsErr;

      router.push(`/routepro/routes/${routeId}`);
    } catch (e: any) {
      setError(e?.message ?? "Errore creazione rotta");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-neutral-600">Caricamento…</div>;

  return (
    <main className="min-h-dvh bg-neutral-50 p-3 pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {!analyzed && (
          <Card className="rounded-2xl">
            <CardContent className="p-3">
              <div className="text-sm font-semibold">Import vocale</div>
              <div className="mt-1 text-xs text-neutral-500">
                Premi 🎙️ e detta gli stop (oppure usa la dettatura iPhone sulla tastiera).
                Poi <b>Analizza</b> → <b>Revisione</b> → <b>Crea rotta</b>.
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[11px] font-medium text-neutral-600">Nome rotta</div>
                <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} />
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[11px] font-medium text-neutral-600">Testo dettato / incollato</div>

                <div className="mb-2 flex gap-2">
                  <Button
                    type="button"
                    variant={isRecording ? "secondary" : "outline"}
                    className="flex-1"
                    onClick={toggleRecording}
                  >
                    {isRecording ? "⏹ Stop microfono" : "🎙️ Avvia microfono"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setRawText("");
                      setVoiceInfo(null);
                    }}
                  >
                    Pulisci testo
                  </Button>
                </div>

                {voiceInfo && (
                  <div className="mb-2 rounded-xl border bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                    {voiceInfo}
                  </div>
                )}

                {!speechSupported && (
                  <div className="mb-2 rounded-xl border bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Nota: questo browser non supporta microfono in-app. Usa la <b>dettatura iPhone</b> sulla tastiera.
                  </div>
                )}

                <textarea
                  className="min-h-[220px] w-full rounded-2xl border bg-white p-3 text-sm outline-none"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Detta o incolla qui..."
                />
                <div className="mt-2 text-[11px] text-neutral-500">
                  Anteprima stop rilevati: <b>{parsedPreviewCount}</b>
                </div>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button className="flex-1" onClick={onAnalyze} disabled={!canAnalyze}>
                  Analizza
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setStops([]);
                    setAnalyzed(false);
                    setError(null);
                  }}
                >
                  Reset
                </Button>
              </div>

              <div className="mt-2">
                <Button variant="outline" className="w-full" onClick={() => router.push("/routepro/import")}>
                  ← Metodi import
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {analyzed && (
          <>
            {error && (
              <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <ImportReview stops={stops} onChange={setStops} onRemove={onRemove} onAdd={onAdd} />
          </>
        )}
      </div>

      {analyzed && (
        <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
          <Card className="rounded-2xl border bg-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-500">
                    Stop: <b>{stopCount}</b> • Errori: <b>{counts.errors}</b> • Da verificare: <b>{counts.warns}</b>
                  </div>
                  {counts.errors > 0 && (
                    <div className="mt-1 text-xs text-red-600">
                      Completa indirizzo + città negli stop evidenziati.
                    </div>
                  )}
                </div>

                <Button onClick={onCreateRoute} disabled={!canCreate}>
                  {saving ? "Creazione..." : "Crea rotta"}
                </Button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <Button variant="outline" onClick={() => setAnalyzed(false)}>
                  ← Torna al testo
                </Button>

                <Button variant="outline" onClick={() => router.push("/routepro/import")}>
                  Metodi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
