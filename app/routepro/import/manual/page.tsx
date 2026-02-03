// app/routepro/import/manual/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ManualStop = {
  address: string;
  city: string;
  packages: number | null;
};

function nowISO() {
  return new Date().toISOString();
}

function norm(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function ImportManualPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [routeName, setRouteName] = useState("RoutePro • Manual");
  const [rows, setRows] = useState<ManualStop[]>([
    { address: "", city: "", packages: null },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const validRows = useMemo(() => {
    return rows
      .map((r) => ({
        address: norm(r.address),
        city: norm(r.city),
        packages: r.packages ?? null,
      }))
      .filter((r) => r.address.length > 0 && r.city.length > 0);
  }, [rows]);

  const canCreate = validRows.length > 0 && !saving;

  function addRow() {
    setRows((prev) => [...prev, { address: "", city: "", packages: null }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<ManualStop>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function createRoute() {
    if (!userId) return;
    if (!canCreate) return;

    setSaving(true);
    setError(null);

    try {
      const { data: routeRow, error: routeErr } = await supabase
        .from("routes")
        .insert({
          user_id: userId,
          name: norm(routeName) || "RoutePro • Manual",
          created_at: nowISO(),
          updated_at: nowISO(),
        })
        .select("id")
        .single();

      if (routeErr) throw routeErr;
      const routeId = routeRow.id as string;

      const stopRows = validRows.map((r, idx) => ({
        route_id: routeId,
        position: idx + 1,
        af_stop_number: idx + 1,
        stop_type: "delivery",
        optimized_position: null,
        address: `${r.address}, ${r.city}`,
        packages: r.packages,
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
        <Card className="rounded-2xl">
          <CardContent className="p-3 space-y-3">
            <div className="text-sm font-semibold">Inserimento manuale</div>
            <div className="text-xs text-neutral-500">
              Aggiungi stop in modo veloce. Indirizzo + città sono obbligatori. I pacchi sono opzionali.
            </div>

            <div>
              <div className="mb-1 text-[11px] font-medium text-neutral-600">Nome rotta</div>
              <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} />
            </div>

            {error && (
              <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-3 space-y-3">
            <div className="text-xs font-medium text-neutral-600">Stop</div>

            <div className="space-y-2">
              {rows.map((r, idx) => (
                <div key={idx} className="rounded-2xl border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-500">Stop #{idx + 1}</div>
                    {rows.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => removeRow(idx)}>
                        Rimuovi
                      </Button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <Input
                      placeholder="Indirizzo (es. Via Roma 10)"
                      value={r.address}
                      onChange={(e) => updateRow(idx, { address: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Città"
                        value={r.city}
                        onChange={(e) => updateRow(idx, { city: e.target.value })}
                      />
                      <Input
                        placeholder="Pacchi (opz.)"
                        inputMode="numeric"
                        value={r.packages ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          const n = v === "" ? null : Number(v);
                          updateRow(idx, { packages: Number.isFinite(n as any) ? (n as any) : null });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addRow}>
              + Aggiungi stop
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
        <Card className="rounded-2xl border bg-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-neutral-500">
                Stop validi: <b>{validRows.length}</b> (compila indirizzo + città)
              </div>

              <Button onClick={createRoute} disabled={!canCreate}>
                {saving ? "Creazione..." : "Crea rotta"}
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <Button variant="outline" onClick={() => router.push("/routepro/import")}>
                ← Indietro
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
