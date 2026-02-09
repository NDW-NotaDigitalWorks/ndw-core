// app/routepro/import/text/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function ImportTextPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [rawText, setRawText] = useState("");
  const [routeName, setRouteName] = useState("RoutePro • Import");
  const [analyzed, setAnalyzed] = useState(false);

  const [stops, setStops] = useState<ReviewStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ NEW: modalità focus (massimo spazio per edit lista)
  const [focusEdit, setFocusEdit] = useState(false);

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

  const canCreate =
    analyzed &&
    stopCount > 0 &&
    !saving &&
    counts.errors === 0;

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
      const normalized = parsed.map((s, i) => ({
        ...s,
        stop_index: i + 1,
      }));
      setStops(normalized);
      setAnalyzed(true);
      setFocusEdit(true); // ✅ appena entri in revisione: focus ON
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
      {
        stop_index: stops.length + 1,
        address: "",
        city: null,
        packages: null,
        delivery_window: null,
      },
    ];
    setStops(next);
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
          name: normalizeText(routeName) || "RoutePro • Import",
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
    <main className={["min-h-dvh bg-neutral-50 p-3", analyzed ? "pb-28" : "pb-10"].join(" ")}>
      <div className="mx-auto max-w-md mb-2">
  <Button
    variant="outline"
    className="w-full"
    onClick={() => router.push("/routepro/import")}
    type="button"
  >
    ← Metodi di import
  </Button>
</div>

      <div className="mx-auto flex max-w-md flex-col gap-3">
        {/* STEP 1: INPUT TESTO (solo quando NON sei in focus) */}
        {!analyzed && (
          <Card className="rounded-2xl">
            <CardContent className="p-3">
              <div className="text-sm font-semibold">Importa rotta (da testo)</div>
              <div className="mt-1 text-xs text-neutral-500">
                Screenshot Flex → OCR/copia testo → incolla → Analizza → Revisione → Crea rotta
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[11px] font-medium text-neutral-600">Nome rotta</div>
                <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} />
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[11px] font-medium text-neutral-600">Testo incollato</div>
                <textarea
                  className="min-h-[220px] w-full rounded-2xl border bg-white p-3 text-sm outline-none"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Incolla qui la lista stop estratta da screenshot Flex..."
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
                    setRawText("");
                    setStops([]);
                    setAnalyzed(false);
                    setFocusEdit(false);
                    setError(null);
                  }}
                >
                  Pulisci
                </Button>
              </div>

              <div className="mt-3">
                <Button variant="outline" className="w-full" onClick={() => router.push("/routepro/import")}>
                  ← Indietro
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: REVISIONE (FOCUS MODE) */}
        {analyzed && (
          <>
            {/* Mini top bar (sempre piccola) */}
            <div className="sticky top-2 z-10 rounded-2xl border bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-500">Import • Revisione</div>
                  <div className="text-[11px] text-neutral-500">
                    Stop: <b>{stopCount}</b> • Errori: <b className={counts.errors ? "text-red-600" : ""}>{counts.errors}</b> • Verifica:{" "}
                    <b className={counts.warns ? "text-amber-700" : ""}>{counts.warns}</b>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusEdit((v) => !v)}
                  className="shrink-0"
                >
                  {focusEdit ? "UI +" : "Focus"}
                </Button>
              </div>

              {!focusEdit && (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-neutral-600">Nome rotta</div>
                    <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setAnalyzed(false)}>
                      ← Modifica testo
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => router.push("/routepro/import")}>
                      ← Metodi import
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Lista editabile */}
            <ImportReview
              stops={stops}
              onChange={setStops}
              onRemove={onRemove}
              onAdd={onAdd}
            />
          </>
        )}
      </div>

      {/* Sticky bottom CTA: in focus diventa super compatta */}
      {analyzed && (
        <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
          <Card className="rounded-2xl border bg-white shadow-lg">
            <CardContent className={["p-3", focusEdit ? "py-2" : ""].join(" ")}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-500">
                    Stop: <b>{stopCount}</b>
                    {!focusEdit && (
                      <>
                        {" "}• Errori: <b>{counts.errors}</b> • Verifica: <b>{counts.warns}</b>
                      </>
                    )}
                  </div>
                  {!focusEdit && counts.errors > 0 && (
                    <div className="mt-1 text-xs text-red-600">
                      Completa indirizzo + città negli stop evidenziati.
                    </div>
                  )}
                </div>

                <Button onClick={onCreateRoute} disabled={!canCreate}>
                  {saving ? "Creazione..." : "Crea rotta"}
                </Button>
              </div>

              {!focusEdit && (
                <div className="mt-2 flex items-center justify-between">
                  <Button variant="outline" onClick={() => setAnalyzed(false)} disabled={saving}>
                    ← Modifica testo
                  </Button>

                  <Button variant="outline" onClick={() => router.push("/routepro")} disabled={saving}>
                    RoutePro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
