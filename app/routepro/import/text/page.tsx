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

export default function RouteImportTextPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [rawText, setRawText] = useState("");
  const [routeName, setRouteName] = useState("RoutePro • Import");
  const [analyzed, setAnalyzed] = useState(false);

  const [stops, setStops] = useState<ReviewStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  }, [router]);

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
    setStops([
      ...stops,
      {
        stop_index: stops.length + 1,
        address: "",
        city: null,
        packages: null,
        delivery_window: null,
      },
    ]);
  }

  async function onCreateRoute() {
    if (!userId || !canCreate) return;

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
        .filter((s) => s.address && s.city)
        .map((s, idx) => ({
          route_id: routeId,
          position: idx + 1,
          af_stop_number: idx + 1,
          stop_type: "delivery",
          optimized_position: null,
          address: `${normalizeText(s.address)}, ${normalizeText(s.city!)}`,
          packages: s.packages,
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
    <main className="min-h-dvh bg-neutral-50 p-3 pb-28">
      <div className="mx-auto max-w-md flex flex-col gap-3">
        {!analyzed && (
          <Card className="rounded-2xl">
            <CardContent className="p-3 space-y-3">
              <div className="text-sm font-semibold">Importa da testo / screenshot</div>

              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Nome rotta"
              />

              <textarea
                className="min-h-[220px] w-full rounded-2xl border p-3 text-sm"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Incolla qui il testo estratto da Amazon Flex…"
              />

              <div className="text-[11px] text-neutral-500">
                Anteprima stop rilevati: <b>{parsedPreviewCount}</b>
              </div>

              {error && (
                <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={onAnalyze} disabled={!canAnalyze}>
                  Analizza
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRawText("");
                    setStops([]);
                    setAnalyzed(false);
                    setError(null);
                  }}
                >
                  Pulisci
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {analyzed && (
          <ImportReview
            stops={stops}
            onChange={setStops}
            onRemove={onRemove}
            onAdd={onAdd}
          />
        )}
      </div>

      {analyzed && (
        <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
          <Card className="rounded-2xl">
            <CardContent className="p-3 flex justify-between items-center">
              <div className="text-xs text-neutral-500">
                Stop: <b>{stopCount}</b> • Errori: <b>{counts.errors}</b>
              </div>

              <Button onClick={onCreateRoute} disabled={!canCreate}>
                {saving ? "Creazione..." : "Crea rotta"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
