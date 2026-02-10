// app/routepro/routes/[routeId]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRouteProTier } from "@/lib/entitlement";

type RouteStatus = "draft" | "optimized" | string;

type RouteRow = {
  id: string;
  name: string | null;
  route_date: string | null;
  status: RouteStatus | null;
  total_stops: number | null;
  created_at?: string | null; // fallback se c'è in DB
};

type StopRow = {
  id: string;
  position: number; // AF
  optimized_position: number | null; // OPT
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

function formatDateMaybe(d: string | null | undefined): string {
  if (!d) return "—";
  // se è ISO, proviamo a renderla carina senza rompere nulla
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d; // già in formato testo (es. 10/02/2026)
  return dt.toLocaleDateString("it-IT");
}

function normalizeStatus(s: RouteStatus | null | undefined): string {
  const v = (s ?? "draft").toString();
  return v;
}

export default function RouteDetailsPage() {
  const router = useRouter();
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>("STARTER");

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
      ? arr.sort((a, b) => (a.optimized_position ?? 999999) - (b.optimized_position ?? 999999))
      : arr.sort((a, b) => a.position - b.position);
  }, [stops]);

  const hasOptimizedOrder = useMemo(() => {
    return normalizeStatus(route?.status) === "optimized" || orderedStops.some((s) => s.optimized_position != null);
  }, [orderedStops, route]);

  // ✅ fallback stop count: se total_stops manca, uso la lunghezza della lista
  const totalStopsComputed = useMemo(() => {
    const fromDb = route?.total_stops;
    if (typeof fromDb === "number" && fromDb > 0) return fromDb;
    return stops.length;
  }, [route, stops.length]);

  const routeDateComputed = useMemo(() => {
    // 1) route_date
    if (route?.route_date) return route.route_date;
    // 2) created_at se presente (non rompe se la colonna non esiste: resta undefined)
    if (route?.created_at) return route.created_at;
    return null;
  }, [route]);

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

      // tier label
      const t = await getRouteProTier();
      setTier((t ?? "starter").toUpperCase());

      // ⚠️ Nota: se created_at non esiste in DB, Supabase può dare errore.
      // Per evitarlo: facciamo prima una select “safe” e NON includiamo created_at.
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
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || null;

      const res = await fetch("/api/routepro/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      const stopsWithCoords: { id: string; lat: number; lng: number }[] = data.stopsWithCoords ?? [];
      const algorithm: string = data.algorithm ?? "unknown";

      if (!optimizedStopIds.length) throw new Error("Nessun ordine ottimizzato ricevuto.");

      for (const s of stopsWithCoords) {
        await supabase.from("route_stops").update({ lat: s.lat, lng: s.lng }).eq("id", s.id);
      }

      for (let i = 0; i < optimizedStopIds.length; i++) {
        const stopId = optimizedStopIds[i];
        await supabase.from("route_stops").update({ optimized_position: i + 1 }).eq("id", stopId);
      }

      await supabase.from("routes").update({ status: "optimized" }).eq("id", routeId);

      await supabase.from("route_runs").insert({
        route_id: routeId,
        algorithm,
      });

      setMsg(`Ottimizzazione completata ✅ (${data.keyMode === "user" ? "ORS utente" : "ORS NDW"})`);
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
      "order_visible",
      "af_stop_number",
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
        s.position,
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
    const datePart = routeDateComputed ? `${formatDateMaybe(routeDateComputed)}_` : "";
    downloadTextFile(`${datePart}${safeName}_export.csv`, csv, "text/csv");
  }

  const statusLabel = normalizeStatus(route?.status);

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">RoutePro — Dettaglio rotta</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/routepro/routes/${routeId}/driver`}>
              <Button>Driver Mode</Button>
            </Link>
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
          <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">{error}</div>
        )}

        {!loading && !error && route && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {tier} • {statusLabel}
                </p>

                <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                  {route.name ?? "Senza nome"}
                </h1>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-600">
                  <span>Data: <b className="text-neutral-800">{formatDateMaybe(routeDateComputed)}</b></span>
                  <span>Stop: <b className="text-neutral-800">{totalStopsComputed}</b></span>
                  <span>Stato: <b className="text-neutral-800">{statusLabel}</b></span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={onOptimize} disabled={optimizing || stops.length < 2}>
                  {optimizing ? "Ottimizzo..." : "Ottimizza rotta"}
                </Button>
                <Button variant="outline" onClick={onExportCsv} disabled={!orderedStops.length}>
                  Export CSV
                </Button>
              </div>
            </div>

            {msg && (
              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">{msg}</div>
            )}

            <Card className="rounded-2xl">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
