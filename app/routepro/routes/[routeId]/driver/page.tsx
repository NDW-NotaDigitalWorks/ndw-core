// app/routepro/routes/[routeId]/driver/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StopCard } from "@/components/routepro/StopCard";
import { RouteMap } from "@/components/routepro/RouteMap";
import { StatsSummary } from "@/components/routepro/StatsSummary";
import { Button } from "@/components/ui/button";
import { openNavigation, setNavPref, type NavApp } from "@/lib/routepro/navigation";
import { setLastRouteId, getDriverView, setDriverView } from "@/lib/routepro/prefs";
import { computeRouteStats } from "@/lib/routepro/stats";

type StopRow = {
  id: string;
  position: number;
  af_stop_number: number | null;
  stop_type: "pickup" | "delivery" | "return";
  optimized_position: number | null;
  address: string;
  lat: number | null;
  lng: number | null;
  is_done: boolean;
};

function storageKeyStart(routeId: string) {
  return `ndw_routepro_started_at_${routeId}`;
}

function getOrSetStartedAt(routeId: string): Date {
  const key = storageKeyStart(routeId);
  const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (existing) return new Date(existing);

  const now = new Date();
  if (typeof window !== "undefined") localStorage.setItem(key, now.toISOString());
  return now;
}

function resetStartedAt(routeId: string): Date {
  const key = storageKeyStart(routeId);
  const now = new Date();
  if (typeof window !== "undefined") localStorage.setItem(key, now.toISOString());
  return now;
}

export default function DriverModePage() {
  const router = useRouter();
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const [navApp, setNavApp] = useState<NavApp>("google");
  const [view, setView] = useState<"list" | "map">("list");

  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setLastRouteId(routeId);
    setView(getDriverView(routeId));
    setStartedAt(getOrSetStartedAt(routeId));

    const v =
      (typeof window !== "undefined" && localStorage.getItem("ndw_nav_app")) ||
      "google";
    setNavApp(v === "waze" ? "waze" : "google");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  useEffect(() => {
    setDriverView(routeId, view);
  }, [routeId, view]);

  useEffect(() => {
    if (view !== "list") return;
    if (!activeStopId) return;
    const el = cardRefs.current[activeStopId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeStopId, view]);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("route_stops")
      .select("id, position, af_stop_number, stop_type, optimized_position, address, lat, lng, is_done")
      .eq("route_id", routeId);

    if (!error && data) {
      const list = (data as any as StopRow[]).slice();
      const hasOpt = list.some((s) => s.optimized_position != null);

      list.sort((a, b) =>
        hasOpt
          ? (a.optimized_position ?? 999999) - (b.optimized_position ?? 999999)
          : a.position - b.position
      );

      setStops(list);

      const firstPending =
        list.find((s) => s.stop_type === "delivery" && !s.is_done) ??
        list.find((s) => !s.is_done) ??
        list[0];

      setActiveStopId(firstPending?.id ?? null);
    }

    setLoading(false);
  }

  const orderedStops = useMemo(() => stops, [stops]);

  const deliveryStops = useMemo(
    () => orderedStops.filter((s) => s.stop_type === "delivery"),
    [orderedStops]
  );

  const totalDeliveries = deliveryStops.length;

  const deliveriesDone = useMemo(
    () => deliveryStops.filter((s) => s.is_done).length,
    [deliveryStops]
  );

  const routeCompleted = useMemo(() => {
    return totalDeliveries > 0 && deliveriesDone === totalDeliveries;
  }, [totalDeliveries, deliveriesDone]);

  const activeStop = useMemo(
    () => orderedStops.find((s) => s.id === activeStopId) ?? null,
    [orderedStops, activeStopId]
  );

  const nextPendingDelivery = useMemo(
    () => deliveryStops.find((s) => !s.is_done) ?? null,
    [deliveryStops]
  );

  const mapStops = useMemo(() => {
    return orderedStops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s, idx) => ({
        id: s.id,
        af: s.af_stop_number ?? s.position,
        opt: s.optimized_position ?? idx + 1,
        address: `${s.stop_type === "pickup" ? "📦 " : s.stop_type === "return" ? "↩️ " : ""}${s.address}`,
        lat: s.lat as number,
        lng: s.lng as number,
        isDone: s.is_done,
        isActive: s.id === activeStopId,
      }));
  }, [orderedStops, activeStopId]);

  const stats = useMemo(() => {
    if (!startedAt) return null;
    if (!routeCompleted) return null;

    return computeRouteStats({
      totalStops: totalDeliveries,
      startedAt,
      endedAt: new Date(),
    });
  }, [startedAt, routeCompleted, totalDeliveries]);

  async function toggleDone(stopId: string, nextValue: boolean) {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, is_done: nextValue } : s))
    );

    const { error } = await supabase
      .from("route_stops")
      .update({ is_done: nextValue })
      .eq("id", stopId);

    if (error) {
      setStops((prev) =>
        prev.map((s) => (s.id === stopId ? { ...s, is_done: !nextValue } : s))
      );
      return;
    }

    if (nextValue) {
      const pending = orderedStops.find(
        (s) => s.stop_type === "delivery" && !s.is_done && s.id !== stopId
      );
      if (pending) setActiveStopId(pending.id);
    }
  }

  function goToNextPending() {
    if (nextPendingDelivery) setActiveStopId(nextPendingDelivery.id);
  }

  function navToActive() {
    if (!activeStop) return;
    openNavigation({ lat: activeStop.lat, lng: activeStop.lng, address: activeStop.address });
  }

  function navToNextPending() {
    if (!nextPendingDelivery) return;
    openNavigation({
      lat: nextPendingDelivery.lat,
      lng: nextPendingDelivery.lng,
      address: nextPendingDelivery.address,
    });
    setActiveStopId(nextPendingDelivery.id);
  }

  function onSetNav(app: NavApp) {
    setNavApp(app);
    setNavPref(app);
  }

  function onResetTimer() {
    const now = resetStartedAt(routeId);
    setStartedAt(now);
  }

  if (loading) return <div className="p-4 text-sm text-neutral-600">Caricamento Driver Mode…</div>;

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <div className="sticky top-2 z-10 rounded-2xl border bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-neutral-500">RoutePro • Driver Mode</div>
              {activeStop && (
                <div className="mt-1 text-xs text-neutral-700">
                  Corrente: <b>OPT #{activeStop.optimized_position ?? "—"}</b>{" "}
                  (AF #{activeStop.af_stop_number ?? activeStop.position}) • {activeStop.stop_type}
                </div>
              )}
              <div className="mt-1 text-[11px] text-neutral-500">
                Consegne: <b>{deliveriesDone}/{totalDeliveries}</b>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href={`/routepro/routes/${routeId}`}>
                <Button variant="outline">Dettaglio</Button>
              </Link>
              <Button variant="outline" onClick={onResetTimer}>
                Reset tempo
              </Button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button onClick={navToActive} disabled={!activeStop}>Naviga corrente</Button>
            <Button variant="outline" onClick={goToNextPending}>Prossimo (seleziona)</Button>
          </div>

          <div className="mt-2">
            <Button onClick={navToNextPending} disabled={!nextPendingDelivery}>
              Naviga prossimo non fatto
            </Button>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              variant={navApp === "google" ? "secondary" : "outline"}
              className="flex-1"
              onClick={() => onSetNav("google")}
            >
              Google
            </Button>
            <Button
              variant={navApp === "waze" ? "secondary" : "outline"}
              className="flex-1"
              onClick={() => onSetNav("waze")}
            >
              Waze
            </Button>
          </div>

          <div className="mt-2 rounded-2xl border bg-neutral-50 p-2">
            <div className="mb-2 text-xs font-medium text-neutral-700">Vista (Lista / Mappa)</div>
            <div className="flex gap-2">
              <Button variant={view === "list" ? "secondary" : "outline"} className="flex-1" onClick={() => setView("list")}>
                Lista
              </Button>
              <Button variant={view === "map" ? "secondary" : "outline"} className="flex-1" onClick={() => setView("map")} disabled={mapStops.length === 0}>
                Mappa
              </Button>
            </div>
          </div>

          <div className="mt-2">
            <Button variant="secondary" className="w-full" onClick={load}>Aggiorna</Button>
          </div>
        </div>

        {view === "map" ? (
          <RouteMap stops={mapStops} />
        ) : (
          orderedStops.map((s, idx) => (
            <StopCard
              key={s.id}
              ref={(el) => { cardRefs.current[s.id] = el; }}
              afNumber={s.af_stop_number ?? s.position}
              optNumber={s.optimized_position ?? idx + 1}
              address={`${s.stop_type === "pickup" ? "📦 " : s.stop_type === "return" ? "↩️ " : ""}${s.address}`}
              lat={s.lat}
              lng={s.lng}
              isDone={s.is_done}
              isActive={s.id === activeStopId}
              onToggleDone={() => toggleDone(s.id, !s.is_done)}
            />
          ))
        )}

        {/* STATS AT THE END (NO SCROLL UP NEEDED) */}
        {stats && <StatsSummary stats={stats} />}
      </div>
    </main>
  );
}
