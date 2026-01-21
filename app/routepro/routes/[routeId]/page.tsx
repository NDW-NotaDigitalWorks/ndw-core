// app/routepro/routes/[routeId]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RouteRow = {
  id: string;
  name: string;
  route_date: string | null;
  status: "draft" | "optimized";
  total_stops: number;
};

type StopRow = {
  id: string;
  position: number;
  optimized_position: number | null;
  address: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsvRow(values: (string | number | null | undefined)[]) {
  const escaped = values.map((v) => {
    const s = v == null ? "" : String(v);
    const needsQuotes = s.includes(",") || s.includes('"') || s.includes("\n");
    const cleaned = s.replace(/"/g, '""');
    return needsQuotes ? `"${cleaned}"` : cleaned;
  });
  return escaped.join(",");
}

export default function RouteDetailsPage() {
  const router = useRouter();
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [optimizing, setOptimizing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const orderedStops = useMemo(() => {
    const hasOptimized = stops.some((s) => s.optimized_position != null);
    const arr = [...stops];
    return hasOptimized
      ? arr.sort(
          (a, b) =>
            (a.optimized_position ?? 999999) - (b.optimized_position ?? 999999)
        )
      : arr.sort((a, b) => a.position - b.position);
  }, [stops]);

  const hasOptimizedOrder = useMemo(
    () => orderedStops.some((s) => s.optimized_position != null) || (route?.status === "optimized"),
    [orderedStops, route]
  );

  const exportText = useMemo(() => {
    return orderedStops.map((s, idx) => `${idx + 1}. ${s.address}`).join("\n");
  }, [orderedStops]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: routeRow, error: routeErr } = await supabase
        .from("routes")
        .select("id,name,route_date,status,total_stops")
        .eq("id", routeId)
        .single();

      if (routeErr) throw routeErr;

      const { data: stopRows, error: stopsErr } = await supabase
        .from("route_stops")
        .select("id,position,optimized_position,address,note,lat,lng")
        .eq("route_id", routeId);

      if (stopsErr) throw stopsErr;

      setRoute(routeRow as any);
      setStops((stopRows as any) ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Errore caricamento rotta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  async function onOptimize() {
    if (!route) return;
    setMsg(null);
    setOptimizing(true);

    try {
      const res = await fetch("/api/routepro/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: stops.map((s) => ({
            id: s.id,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Optimize failed");

      const optimizedStopIds: string[] = data.optimizedStopIds ?? [];
      const stopsWithCoords: { id: string; lat: number; lng: number }[] =
        data.stopsWithCoords ?? [];
      const algorithm: string = data.algorithm ?? "unknown";

      if (!optimizedStopIds.length)
        throw new Error("Nessun ordine ottimizzato ricevuto.");

      // Update lat/lng
      for (const s of stopsWithCoords) {
        await supabase
          .from("route_stops")
          .update({ lat: s.lat, lng: s.lng })
          .eq("id", s.id);
      }

      // Save optimized positions 1..N
      for (let i = 0; i < optimizedStopIds.length; i++) {
        const stopId = optimizedStopIds[i];
        await supabase
          .from("route_stops")
          .update({ optimized_position: i + 1 })
          .eq("id", stopId);
      }

      await supabase
        .from("routes")
        .update({ status: "optimized" })
        .eq("id", routeId);

      await supabase.from("route_runs").insert({
        route_id: routeId,
        algorithm,
      });

      setMsg("Ottimizzazione completata ✅");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Errore ottimizzazione.");
    } finally {
      setOptimizing(false);
    }
  }

  async function onCopyList() {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setMsg("Impossibile copiare negli appunti (permessi browser).");
    }
  }

  function onExportCsv() {
    if (!route) return;

    const header = toCsvRow([
      "order",
      "address",
      "note",
      "lat",
      "lng",
      "original_position",
      "optimized_position",
    ]);

    const rows = orderedStops.map((s, idx) =>
      toCsvRow([
        idx + 1,
        s.address,
        s.note ?? "",
        s.lat ?? "",
        s.lng ?? "",
        s.position,
        s.optimized_position ?? "",
      ])
    );

    const csv = [header, ...rows].join("\n");
    const safeName = (route.name || "route").replace(/[^\w\-]+/g, "_");
    const datePart = route.route_date ? `${route.route_date}_` : "";
    downloadTextFile(`${datePart}${safeName}_export.csv`, csv, "text/csv");
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">
              RoutePro — Dettaglio rotta
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routepro/import">
              <Button variant="outline">Nuova rotta</Button>
            </Link>
            <Link href="/routepro">
              <Button variant="ghost">Le mie rotte</Button>
            </Link>
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        {loading && <div className="text-sm text-neutral-600">Caricamento...</div>}

        {error && (
          <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
            {error}
          </div>
        )}

        {!loading && !error && route && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Starter • {route.status}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {route.name}
                </h1>
                <p className="mt-2 text-sm text-neutral-600">
                  Data: {route.route_date ?? "—"} • Stop: {route.total_stops} • Stato:{" "}
                  {route.status}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={onOptimize} disabled={optimizing || stops.length < 2}>
                  {optimizing ? "Ottimizzo..." : "Ottimizza rotta"}
                </Button>
                <Button
                  variant="outline"
                  onClick={onExportCsv}
                  disabled={!orderedStops.length}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {msg && (
              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                {msg}
              </div>
            )}

            {/* Export copy/paste */}
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">
                  Export veloce ({hasOptimizedOrder ? "ordine ottimizzato" : "ordine originale"})
                </CardTitle>
                <Button variant="secondary" onClick={onCopyList} disabled={!exportText}>
                  {copied ? "Copiato ✅" : "Copia lista"}
                </Button>
              </CardHeader>
              <CardContent>
                <textarea
                  className="min-h-[180px] w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  value={exportText}
                  readOnly
                />
                <p className="mt-2 text-xs text-neutral-500">
                  Usa “Copia lista” e incolla dove vuoi (note, WhatsApp, ecc.).
                </p>
              </CardContent>
            </Card>

            {/* Stops list */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">
                  Stop ({hasOptimizedOrder ? "ordine ottimizzato" : "ordine originale"})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orderedStops.length === 0 ? (
                  <div className="text-sm text-neutral-600">Nessuno stop.</div>
                ) : (
                  <div className="divide-y rounded-2xl border">
                    {orderedStops.map((s, idx) => (
                      <div
                        key={s.id}
                        className="flex items-start justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {idx + 1}. {s.address}
                          </div>
                          {s.note && (
                            <div className="mt-1 text-xs text-neutral-500">{s.note}</div>
                          )}
                        </div>
                        <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                          stop
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                  Starter completato: import + ottimizza + export. Prossimo step: Whop
                  entitlement (piani).
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
