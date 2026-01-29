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
import { getRouteProTier } from "@/lib/entitlement";

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

type WorkdaySettings = {
  work_start_time: string | null;      // "09:10"
  target_end_time: string | null;      // "17:45"
  max_end_time: string | null;         // "18:04"
  break_minutes: number | null;        // 30
  discontinuity_minutes: number | null;// 28
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

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function minutesToClock(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutesToNow(mins: number): Date {
  return new Date(Date.now() + mins * 60 * 1000);
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

  // Plan / settings
  const [tier, setTier] = useState<"starter" | "pro" | "elite">("starter");
  const [workday, setWorkday] = useState<WorkdaySettings>({
    work_start_time: null,
    target_end_time: null,
    max_end_time: null,
    break_minutes: null,
    discontinuity_minutes: null,
  });

  // Return ETA (ORS directions)
  const [returnEtaMin, setReturnEtaMin] = useState<number | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);
  const [etaKeyMode, setEtaKeyMode] = useState<"user" | "ndw" | null>(null);
  const lastEtaFetchedAtRef = useRef<number>(0);

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
    (async () => {
      const t = await getRouteProTier();
      setTier((t ?? "starter") as any);
    })();
  }, []);

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

    // load stops
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

    // load workday settings
    const { data: sRow } = await supabase
      .from("routepro_settings")
      .select("work_start_time,target_end_time,max_end_time,break_minutes,discontinuity_minutes")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (sRow) setWorkday(sRow as any);

    setLoading(false);
  }

  const orderedStops = useMemo(() => stops, [stops]);

  const deliveryStops = useMemo(
    () => orderedStops.filter((s) => s.stop_type === "delivery"),
    [orderedStops]
  );

  const totalDeliveries = deliveryStops.length;
  const deliveriesDone = useMemo(() => deliveryStops.filter((s) => s.is_done).length, [deliveryStops]);
  const deliveriesRemaining = totalDeliveries - deliveriesDone;

  const routeCompleted = useMemo(() => totalDeliveries > 0 && deliveriesDone === totalDeliveries, [totalDeliveries, deliveriesDone]);

  const activeStop = useMemo(
    () => orderedStops.find((s) => s.id === activeStopId) ?? null,
    [orderedStops, activeStopId]
  );

  const nextPendingDelivery = useMemo(() => deliveryStops.find((s) => !s.is_done) ?? null, [deliveryStops]);

  const pickupStop = useMemo(() => orderedStops.find((s) => s.stop_type === "pickup") ?? null, [orderedStops]);

  const stats = useMemo(() => {
    if (!startedAt) return null;
    if (!routeCompleted) return null;

    return computeRouteStats({
      totalStops: totalDeliveries,
      startedAt,
      endedAt: new Date(),
    });
  }, [startedAt, routeCompleted, totalDeliveries]);

  // Pace estimate while running (not end-of-route stats)
  const pace = useMemo(() => {
    if (!startedAt) return null;
    const elapsedMin = (Date.now() - startedAt.getTime()) / 60000;
    if (elapsedMin <= 0) return null;

    const avgMinPerStop = deliveriesDone > 0 ? elapsedMin / deliveriesDone : null;
    const stopsPerHour = deliveriesDone > 0 ? (deliveriesDone / elapsedMin) * 60 : null;

    return {
      elapsedMin: Math.round(elapsedMin),
      avgMinPerStop: avgMinPerStop ? Number(avgMinPerStop.toFixed(2)) : null,
      stopsPerHour: stopsPerHour ? Number(stopsPerHour.toFixed(1)) : null,
    };
  }, [startedAt, deliveriesDone]);

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

  async function toggleDone(stopId: string, nextValue: boolean) {
    setStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, is_done: nextValue } : s)));

    const { error } = await supabase.from("route_stops").update({ is_done: nextValue }).eq("id", stopId);

    if (error) {
      setStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, is_done: !nextValue } : s)));
      return;
    }

    if (nextValue) {
      const pending = orderedStops.find((s) => s.stop_type === "delivery" && !s.is_done && s.id !== stopId);
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
    openNavigation({ lat: nextPendingDelivery.lat, lng: nextPendingDelivery.lng, address: nextPendingDelivery.address });
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

  // --- RETURN ETA + WARNINGS (PRO/ELITE) ---
  const canShowTimeWarning = tier === "pro" || tier === "elite";
  const nearingEnd = deliveriesRemaining <= 20 && deliveriesRemaining > 0;

  const targetEndMin = parseTimeToMinutes(workday.target_end_time);
  const maxEndMin = parseTimeToMinutes(workday.max_end_time);
  const workStartMin = parseTimeToMinutes(workday.work_start_time);
  const breakMin = workday.break_minutes ?? 0;
  const discMin = workday.discontinuity_minutes ?? 0;

  const nowMinFromMidnight = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  const remainingWorkMin = useMemo(() => {
    if (!pace?.avgMinPerStop) return null;
    return Math.round(deliveriesRemaining * pace.avgMinPerStop);
  }, [deliveriesRemaining, pace]);

  const pickupPoint = useMemo(() => {
    if (!pickupStop) return null;
    if (pickupStop.lat != null && pickupStop.lng != null) return { lat: pickupStop.lat, lng: pickupStop.lng };
    // fallback: use address
    return { address: pickupStop.address };
  }, [pickupStop]);

  const fromPoint = useMemo(() => {
    // use active stop as current position, else next pending, else last stop
    const s = activeStop ?? nextPendingDelivery ?? orderedStops.at(-1) ?? null;
    if (!s) return null;
    if (s.lat != null && s.lng != null) return { lat: s.lat, lng: s.lng };
    return { address: s.address };
  }, [activeStop, nextPendingDelivery, orderedStops]);

  async function fetchReturnEta() {
    if (!canShowTimeWarning) return;
    if (!nearingEnd) return;
    if (!pickupPoint || !fromPoint) return;

    // throttle calls (max once per 60s)
    const now = Date.now();
    if (now - lastEtaFetchedAtRef.current < 60_000) return;
    lastEtaFetchedAtRef.current = now;

    setEtaLoading(true);
    setEtaError(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || null;

      const res = await fetch("/api/routepro/return-eta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ from: fromPoint, to: pickupPoint }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ETA error");

      setReturnEtaMin(typeof data.minutes === "number" ? data.minutes : null);
      setEtaKeyMode(data.keyMode ?? null);
    } catch (e: any) {
      setEtaError(e?.message ?? "Errore ETA rientro");
      setReturnEtaMin(null);
      setEtaKeyMode(null);
    } finally {
      setEtaLoading(false);
    }
  }

  // fetch ETA when nearing end or when active changes near end
  useEffect(() => {
    fetchReturnEta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearingEnd, activeStopId]);

  const finishEstimate = useMemo(() => {
    if (!canShowTimeWarning) return null;
    if (!nearingEnd) return null;
    if (remainingWorkMin == null) return null;
    if (returnEtaMin == null) return null;

    const totalRemaining = remainingWorkMin + returnEtaMin;
    const finishAt = addMinutesToNow(totalRemaining);

    return {
      totalRemainingMin: totalRemaining,
      finishAt,
    };
  }, [canShowTimeWarning, nearingEnd, remainingWorkMin, returnEtaMin]);

  const warning = useMemo(() => {
    if (!finishEstimate) return null;
    if (targetEndMin == null || maxEndMin == null || workStartMin == null) return null;

    // We compare against target/max clock times.
    const finishClockMin = finishEstimate.finishAt.getHours() * 60 + finishEstimate.finishAt.getMinutes();

    const status =
      finishClockMin <= targetEndMin
        ? "ok"
        : finishClockMin <= maxEndMin
        ? "warn"
        : "late";

    // Required pace to hit target (rough):
    // available minutes until target end (from now) minus return ETA
    const minutesUntilTarget = targetEndMin - nowMinFromMidnight;
    const availableForStops = minutesUntilTarget - (returnEtaMin ?? 0);
    const requiredStopsPerHour =
      availableForStops > 0 ? (deliveriesRemaining / availableForStops) * 60 : null;

    return {
      status,
      finishAtText: minutesToClock(finishClockMin),
      requiredStopsPerHour: requiredStopsPerHour ? Number(requiredStopsPerHour.toFixed(1)) : null,
      note: `Stima basata su ritmo attuale + ETA rientro. Pausa/discontinuità (tot ${breakMin + discMin} min) non sono “forzate” nel calcolo: usale come margine.`,
    };
  }, [
    finishEstimate,
    targetEndMin,
    maxEndMin,
    workStartMin,
    nowMinFromMidnight,
    returnEtaMin,
    deliveriesRemaining,
    breakMin,
    discMin,
  ]);

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
                {pace?.stopsPerHour != null && (
                  <> • ritmo: <b>{pace.stopsPerHour}</b> stop/ora</>
                )}
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

        {/* RETURN WARNING (PRO/ELITE only, near end) */}
        {canShowTimeWarning && nearingEnd && (
          <div className="rounded-2xl border bg-white p-3 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Rientro (stima)</div>

            {etaLoading && (
              <div className="mt-2 text-sm text-neutral-600">Calcolo ETA rientro...</div>
            )}

            {etaError && (
              <div className="mt-2 text-sm text-red-600">
                ETA non disponibile: {etaError}
              </div>
            )}

            {!etaLoading && !etaError && warning && (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-semibold">
                  {warning.status === "ok" && "✅ Sei in linea"}
                  {warning.status === "warn" && "⚠️ Rischio sforamento"}
                  {warning.status === "late" && "⛔ Probabile sforamento"}
                </div>

                <div className="text-sm text-neutral-700">
                  Fine stimata: <b>{warning.finishAtText}</b>{" "}
                  {etaKeyMode && (
                    <span className="text-xs text-neutral-500">
                      (ETA: {etaKeyMode === "user" ? "ORS utente" : "ORS NDW"})
                    </span>
                  )}
                </div>

                {warning.requiredStopsPerHour != null && (
                  <div className="text-sm text-neutral-700">
                    Per rientrare entro target: ~<b>{warning.requiredStopsPerHour}</b> stop/ora
                  </div>
                )}

                <div className="text-xs text-neutral-500">{warning.note}</div>

                <div className="mt-2 text-xs text-neutral-500">
                  Impostazioni orari in RoutePro → Settings.
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* STATS AT THE END */}
        {stats && <StatsSummary stats={stats} />}
      </div>
    </main>
  );
}
