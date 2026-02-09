// app/routepro/import/manual/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImportReview, type ReviewStop } from "@/components/routepro/ImportReview";

function nowISO() {
  return new Date().toISOString();
}

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function ImportManualPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [routeName, setRouteName] = useState("RoutePro • Manual");
  const [stops, setStops] = useState<ReviewStop[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // quick add fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Giussano"); // default comodo (puoi cambiarla)
  const [packages, setPackages] = useState<string>("");

  const addressRef = useRef<HTMLInputElement | null>(null);
  const packagesRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setLoading(false);

      // autofocus
      setTimeout(() => addressRef.current?.focus(), 50);
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

  const canCreate = stops.length > 0 && counts.errors === 0 && !saving;

  function parsePackages(raw: string): number | null {
    const pRaw = raw.trim();
    if (!pRaw) return null;
    const n = Number(pRaw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
  }

  function onAddStop() {
    setError(null);

    const a = normalizeText(address);
    const c = normalizeText(city);
    const p = parsePackages(packages);

    if (!a || !c) {
      setError("Inserisci almeno indirizzo e città.");
      return;
    }

    const next: ReviewStop[] = [
      ...stops,
      {
        stop_index: stops.length + 1,
        address: a,
        city: c,
        packages: p,
        delivery_window: null,
      },
    ];

    setStops(next);

    // reset fields super-veloce: tieni city, resetta address+packages
    setAddress("");
    setPackages("");

    // torna subito sull'indirizzo
    setTimeout(() => addressRef.current?.focus(), 0);
  }

  function onRemove(stopIndex: number) {
    const next = stops
      .filter((s) => s.stop_index !== stopIndex)
      .map((s, i) => ({ ...s, stop_index: i + 1 }));
    setStops(next);
  }

  function onAddBlank() {
    const next = [
      ...stops,
      { stop_index: stops.length + 1, address: "", city: null, packages: null, delivery_window: null },
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
          name: normalizeText(routeName) || "RoutePro • Manual",
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
 
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            <div className="text-sm font-semibold">Inserimento manuale</div>
            <div className="mt-1 text-xs text-neutral-500">
              Aggiungi stop uno per volta. Tip: premi <b>Invio</b> nel campo “Pacchi” per aggiungere subito.
            </div>

            <div className="mt-3">
              <div className="mb-1 text-[11px] font-medium text-neutral-600">Nome rotta</div>
              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                onFocus={() => setError(null)}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <div>
                <div className="mb-1 text-[11px] font-medium text-neutral-600">Indirizzo</div>
                <Input
                  ref={addressRef}
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); if (error) setError(null); }}
                  placeholder="Via Lecco 12 / Azienda..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[11px] font-medium text-neutral-600">Città</div>
                  <Input
                    value={city}
                    onChange={(e) => { setCity(e.target.value); if (error) setError(null); }}
                    placeholder="Giussano"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-neutral-600">Pacchi</div>
                  <Input
                    ref={packagesRef}
                    value={packages}
                    onChange={(e) => { setPackages(e.target.value); if (error) setError(null); }}
                    placeholder="(opzionale)"
                    inputMode="numeric"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddStop();
                      }
                    }}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={onAddStop}>
                  + Aggiungi stop
                </Button>

                <Button variant="outline" className="flex-1" onClick={() => router.push("/routepro/import")}>
                  ← Metodi import
                </Button>
              </div>

              <div className="pt-1 text-[11px] text-neutral-500">
                Se vuoi correggere dopo: usa “+ Stop” in Revisione oppure “Aggiungi vuoto”.
              </div>
            </div>
          </CardContent>
        </Card>

        <ImportReview
          stops={stops}
          onChange={setStops}
          onRemove={onRemove}
          onAdd={onAddBlank}
        />
      </div>

      <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
        <Card className="rounded-2xl border bg-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">
                  Stop: <b>{stops.length}</b> • Errori: <b>{counts.errors}</b> • Da verificare: <b>{counts.warns}</b>
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
              <Button variant="outline" onClick={() => setStops([])} disabled={stops.length === 0 || saving}>
                Svuota lista
              </Button>
              <Button variant="outline" onClick={() => router.push("/routepro")}>
                RoutePro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
