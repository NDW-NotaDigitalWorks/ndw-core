"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { StopCard } from "@/components/routepro/StopCard";
import { RouteMap } from "@/components/routepro/RouteMap";
import { StatsSummary } from "@/components/routepro/StatsSummary";
import { LogoutButton } from "@/components/auth/LogoutButton";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { openNavigation, setNavPref, type NavApp } from "@/lib/routepro/navigation";
import { setLastRouteId, getDriverView, setDriverView } from "@/lib/routepro/prefs";
import { computeRouteStats } from "@/lib/routepro/stats";
import { getRouteProTier } from "@/lib/entitlement";

/* ================= TYPES ================= */

type StopRow = {
  id: string;
  position: number;
  af_stop_number: number | null;
  stop_type: "pickup" | "delivery" | "return";
  optimized_position: number | null;
  address: string;
  packages: number | null;
  lat: number | null;
  lng: number | null;
  is_done: boolean;
};

type WarnStatus = "ok" | "warn" | "late";

type WorkdaySettings = {
  work_start_time: string | null;
  target_end_time: string | null;
  max_end_time: string | null;
  break_minutes: number | null;
  discontinuity_minutes: number | null;
};

/* ================= HELPERS ================= */

function storageKeyStart(routeId: string) {
  return `ndw_routepro_started_at_${routeId}`;
}

function getOrSetStartedAt(routeId: string): Date {
  const key = storageKeyStart(routeId);
  const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (existing) return new Date(existing);

  const now = new Date();
  localStorage.setItem(key, now.toISOString());
  return now;
}

function resetStartedAt(routeId: string): Date {
  const now = new Date();
  localStorage.setItem(storageKeyStart(routeId), now.toISOString());
  return now;
}

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToClock(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutesToNow(mins: number): Date {
  return new Date(Date.now() + mins * 60 * 1000);
}

/* ================= PAGE ================= */

export default function DriverModePage() {
  const router = useRouter();
  const { routeId } = useParams<{ routeId: string }>();

  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const [navApp, setNavApp] = useState<NavApp>("google");
  const [view, setView] = useState<"list" | "map">("list");
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [tier, setTier] = useState<"starter" | "pro" | "elite">("starter");

  /* ================= INIT ================= */

  useEffect(() => {
    setLastRouteId(routeId);
    setView(getDriverView(routeId));
    setStartedAt(getOrSetStartedAt(routeId));

    const nav = localStorage.getItem("ndw_nav_app");
    setNavApp(nav === "waze" ? "waze" : "google");

    getRouteProTier().then((t) => setTier((t ?? "starter") as any));
  }, [routeId]);

  useEffect(() => {
    load();
  }, [routeId]);

  useEffect(() => {
    setDriverView(routeId, view);
  }, [routeId, view]);

  useEffect(() => {
    if (view !== "list" || !activeStopId) return;
    const el = cardRefs.current[activeStopId];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeStopId, view]);

  /* ================= DATA ================= */

  async function load() {
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.replace("/login");
      return;
    }

    const { data } = await supabase
      .from("route_stops")
      .select("id,position,af_stop_number,stop_type,optimized_position,address,packages,lat,lng,is_done")
      .eq("route_id", routeId);

    if (data) {
      const list = [...(data as StopRow[])];
      const hasOpt = list.some((s) => s.optimized_position != null);

      list.sort((a, b) =>
        hasOpt
          ? (a.optimized_position ?? 999999) - (b.optimized_position ?? 999999)
          : a.position - b.position
      );

      setStops(list);
      setActiveStopId(list.find((s) => !s.is_done)?.id ?? null);
    }

    setLoading(false);
  }

  /* ================= COMPUTED ================= */

  const orderedStops = useMemo(() => stops, [stops]);

  const mapStops = useMemo(
    () =>
      orderedStops
        .filter((s) => s.lat != null && s.lng != null)
        .map((s, idx) => ({
          id: s.id,
          af: s.af_stop_number ?? s.position,
          opt: s.optimized_position ?? idx + 1,
          address: s.address,
          lat: s.lat!,
          lng: s.lng!,
          isDone: s.is_done,
          isActive: s.id === activeStopId,
        })),
    [orderedStops, activeStopId]
  );

  /* ================= ACTIONS ================= */

  function onSetNav(app: NavApp) {
    setNavApp(app);
    setNavPref(app);
  }

  /* ================= RENDER ================= */

  if (loading) {
    return <div className="p-4 text-sm text-neutral-600">Caricamento Driver Mode…</div>;
  }

  return (
    <main className="min-h-dvh bg-neutral-50 p-3 pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-3">

        {/* HEADER */}
        <div className="sticky top-2 z-10 rounded-2xl border bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-neutral-500">RoutePro • Driver Mode</div>
            </div>

            <div className="flex gap-2">
              <Link href={`/routepro/routes/${routeId}`}>
                <Button variant="outline">Dettaglio</Button>
              </Link>
              <Button variant="outline" onClick={() => resetStartedAt(routeId)}>
                Reset tempo
              </Button>
              <LogoutButton />
            </div>
          </div>

          <div className="mt-2 flex gap-2">
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
            >
              Mappa
            </Button>
          </div>
        </div>

        {/* BODY */}
        {view === "map" ? (
          <RouteMap
            stops={mapStops}
            onSelectStop={(id) => {
              setActiveStopId(id);
              setView("list");
            }}
          />
        ) : (
          orderedStops.map((s, idx) => (
            <StopCard
              key={s.id}
              ref={(el) => (cardRefs.current[s.id] = el)}
              afNumber={s.af_stop_number ?? s.position}
              optNumber={s.optimized_position ?? idx + 1}
              address={s.address}
              lat={s.lat}
              lng={s.lng}
              packages={s.packages}
              isDone={s.is_done}
              isActive={s.id === activeStopId}
              onToggleDone={() => {}}
            />
          ))
        )}

        <StatsSummary
          stats={computeRouteStats({
            totalStops: orderedStops.length,
            startedAt: startedAt ?? new Date(),
            endedAt: new Date(),
          })}
        />
      </div>
    </main>
  );
}
