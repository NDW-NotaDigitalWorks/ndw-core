// app/routepro/routes/[routeId]/driver/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StopCard } from "@/components/routepro/StopCard";
import { RouteMap } from "@/components/routepro/RouteMap";
import { Button } from "@/components/ui/button";
import { openNavigation, setNavPref, type NavApp } from "@/lib/routepro/navigation";

type StopRow = {
  id: string;
  position: number; // AF #
  optimized_position: number | null; // OPT #
  address: string;
  lat: number | null;
  lng: number | null;
  is_done: boolean;
};

export default function DriverModePage() {
  const router = useRouter();
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const [navApp, setNavApp] = useState<NavApp>("google");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    const v =
      (typeof window !== "undefined" && localStorage.getItem("ndw_nav_app")) ||
      "google";
    setNavApp(v === "waze" ? "waze" : "google");
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  async function load() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("route_stops")
      .select("id, position, optimized_position, address, lat, lng, is_done")
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

      const firstPending = list.find((s) => !s.is_done) ?? list[0];
      setActiveStopId(firstPending?.id ?? null);
    }

    setLoading(false);
  }

  const orderedStops = useMemo(() => stops, [stops]);

  const activeStop = useMemo(
    () => orderedStops.find((s) => s.id === activeStopId) ?? null,
    [orderedStops, activeStopId]
  );

  const nextPendingStop = useMemo(
    () => orderedStops.find((s) => !s.is_done) ?? null,
    [orderedStops]
  );

  const mapStops = useMemo(() => {
    return orderedStops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s, idx) => ({
        id: s.id,
        af: s.position,
        opt: s.optimized_position ?? idx + 1,
        address: s.address,
        lat: s.lat as number,
        lng: s.lng as number,
        isDone: s.is_done,
        isActive: s.id === activeStopId,
      }));
  }, [orderedStops, activeStopId]);

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
      const pending = orderedStops.find((s) => !s.is_done && s.id !== stopId);
      if (pending) setActiveStopId(pending.id);
    }
  }

  function goToNextPending() {
    if (nextPendingStop) setActiveStopId(nextPendingStop.id);
  }

  function navToActive() {
    if (!activeStop) return;
    openNavigation({
      lat: activeStop.lat,
      lng: activeStop.lng,
      address: activeStop.address,
    });
  }

  function onSetNav(app: NavApp) {
    setNavApp(app);
    setNavPref(app);
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-neutral-600">Caricamento Driver Mode…</div>
    );
  }

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
                  (AF #{activeStop.position})
                </div>
              )}
              <div className="mt-1 text-[11px] text-neutral-500">
                Vista attuale: <b>{view === "list" ? "LISTA" : "MAPPA"}</b>
              </div>
            </div>

            <Link href={`/routepro/routes/${routeId}`}>
              <Button variant="outline">Dettaglio</Button>
            </Link>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button onClick={navToActive} disabled={!activeStop}>
              Naviga corrente
            </Button>
            <Button variant="outline" onClick={goToNextPending}>
              Prossimo non fatto
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
            <div className="mb-2 text-xs font-medium text-neutral-700">
              Vista (Lista / Mappa)
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === "list" ? "secondary" : "outline"}
                className="flex-1"
                onClick={() => setView("list")}
              >
                Lista
              </Button>
              <Button
                variant={view === "map" ? "secondary" : "outline"}
                className="flex-1"
                onClick={() => setView("map")}
                disabled={mapStops.length === 0}
              >
                Mappa
              </Button>
            </div>

            {mapStops.length === 0 && (
              <div className="mt-2 text-[11px] text-neutral-500">
                Mappa disabilitata: nessuno stop ha lat/lng.
              </div>
            )}
          </div>

          <div className="mt-2">
            <Button variant="secondary" className="w-full" onClick={load}>
              Aggiorna
            </Button>
          </div>
        </div>

        {view === "map" ? (
          <RouteMap stops={mapStops} />
        ) : (
          orderedStops.map((s, idx) => (
            <StopCard
              key={s.id}
              afNumber={s.position}
              optNumber={s.optimized_position ?? idx + 1}
              address={s.address}
              lat={s.lat}
              lng={s.lng}
              isDone={s.is_done}
              isActive={s.id === activeStopId}
              onToggleDone={() => toggleDone(s.id, !s.is_done)}
            />
          ))
        )}
      </div>
    </main>
  );
}
