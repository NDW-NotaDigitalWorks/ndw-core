"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StopCard } from "@/components/routepro/StopCard";
import { RouteMap } from "@/components/routepro/RouteMap";
import { StatsSummary } from "@/components/routepro/StatsSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ---- RIENTRO ----
  const [tier, setTier] = useState<"starter" | "pro" | "elite">("starter");
  const [workday, setWorkday] = useState<WorkdaySettings>({
    work_start_time: null,
    target_end_time: null,
    max_end_time: null,
    break_minutes: null,
    discontinuity_minutes: null,
  });

  const [returnEtaMin, setReturnEtaMin] = useState<number | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);
  const [etaKeyMode, setEtaKeyMode] = useState<"user" | "ndw" | null>(null);
  const lastEtaFetchedAtRef = useRef<number>(0);

  // Banner UX
  const [dismissBanner, setDismissBanner] = useState(false);
  const lastWarnStatusRef = useRef<WarnStatus | null>(null);

  useEffect(() => {
    setLastRouteId(routeId);
    setView(getDriverView(routeId));
    setStartedAt(getOrSetStartedAt(routeId));

    const v =
      (typeof window !== "undefined" && localStorage.getItem("ndw_nav_app")) ||
      "google";
    setNavApp(v === "waze" ? "waze" : "google");

    (async () => {
      const t = await getRouteProTier();
      setTier((t ?? "starter") as any);
    })();
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

    // stops (include packages)
    const { data, error } = await supabase
      .from("route_stops")
      .select("id, position, af_stop_number, stop_type, optimized_position, address, packages, lat, lng, is_done")
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

    // workday settings
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

  const deliveriesDone = useMemo(
    () => deliveryStops.filter((s) => s.is_done).length,
    [deliveryStops]
  );

  const deliveriesRemaining = totalDeliveries - deliveriesDone;

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

  const pickupStop = useMemo(
    () => orderedStops.find((s) => s.stop_type === "pickup") ?? null,
    [orderedStops]
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

  // ritmo dinamico
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

  // ==========================
  // FASE 1 — PRE-ALERT (target stop/ora)
  // ==========================
  const requiredStopsPerHourAtStart = useMemo(() => {
    if (!startedAt) return null;
    if (!workday.target_end_time) return null;
    if (totalDeliveries === 0) return null;

    const targetEndMin = parseTimeToMinutes(workday.target_end_time);
    if (targetEndMin == null) return null;

    const startMin = startedAt.getHours() * 60 + startedAt.getMinutes();
    const pause = (workday.break_minutes ?? 0) + (workday.discontinuity_minutes ?? 0);

    const availableMinutes = targetEndMin - startMin - pause;
    if (availableMinutes <= 0) return null;

    const required = (totalDeliveries / availableMinutes) * 60;
    return Number(required.toFixed(1));
  }, [
    startedAt,
    workday.target_end_time,
    workday.break_minutes,
    workday.discontinuity_minutes,
    totalDeliveries,
  ]);

  // ==========================
  // FASE 2 — MONITOR LIVE (B: ≤ 60 min al target) + ETA RIENTRO
  // ==========================
  const canShowTimeWarning = tier === "pro" || tier === "elite";

  const targetEndMin = parseTimeToMinutes(workday.target_end_time);
  const maxEndMin = parseTimeToMinutes(workday.max_end_time);
  const nowMinFromMidnight = new Date().getHours() * 60 + new Date().getMinutes();

  const withinOneHourToTarget = useMemo(() => {
    if (targetEndMin == null) return false;
    const minutesLeft = targetEndMin - nowMinFromMidnight;
    return minutesLeft <= 60 && minutesLeft >= -120;
  }, [targetEndMin, nowMinFromMidnight]);

  const remainingWorkMin = useMemo(() => {
    if (!pace?.avgMinPerStop) return null;
    return Math.round(deliveriesRemaining * pace.avgMinPerStop);
  }, [deliveriesRemaining, pace]);

  const pickupPoint = useMemo(() => {
    if (!pickupStop) return null;
    if (pickupStop.lat != null && pickupStop.lng != null) return { lat: pickupStop.lat, lng: pickupStop.lng };
    return { address: pickupStop.address };
  }, [pickupStop]);

  const fromPoint = useMemo(() => {
    const s = activeStop ?? nextPendingDelivery ?? orderedStops.at(-1) ?? null;
    if (!s) return null;
    if (s.lat != null && s.lng != null) return { lat: s.lat, lng: s.lng };
    return { address: s.address };
  }, [activeStop, nextPendingDelivery, orderedStops]);

  async function fetchReturnEta() {
    if (!canShowTimeWarning) return;
    if (!withinOneHourToTarget) return;
    if (!pickupPoint || !fromPoint) return;
    if (deliveriesRemaining <= 0) return;

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

  useEffect(() => {
    fetchReturnEta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withinOneHourToTarget, activeStopId, deliveriesRemaining]);

  const finishEstimate = useMemo(() => {
    if (!canShowTimeWarning) return null;
    if (!withinOneHourToTarget) return null;
    if (remainingWorkMin == null || returnEtaMin == null) return null;
    if (deliveriesRemaining <= 0) return null;

    const totalRemaining = remainingWorkMin + returnEtaMin;
    const finishAt = addMinutesToNow(totalRemaining);
    return { totalRemainingMin: totalRemaining, finishAt };
  }, [canShowTimeWarning, withinOneHourToTarget, remainingWorkMin, returnEtaMin, deliveriesRemaining]);

  const warning = useMemo((): {
    status: WarnStatus;
    finishAtText: string;
    requiredStopsPerHour: number | null;
  } | null => {
    if (!finishEstimate) return null;
    if (targetEndMin == null || maxEndMin == null) return null;

    const finishClockMin =
      finishEstimate.finishAt.getHours() * 60 +
      finishEstimate.finishAt.getMinutes();

    const status: WarnStatus =
      finishClockMin <= targetEndMin
        ? "ok"
        : finishClockMin <= maxEndMin
        ? "warn"
        : "late";

    const minutesUntilTarget = targetEndMin - nowMinFromMidnight;
    const availableForStops = minutesUntilTarget - (returnEtaMin ?? 0);
    const requiredStopsPerHour =
      availableForStops > 0 ? (deliveriesRemaining / availableForStops) * 60 : null;

    return {
      status,
      finishAtText: minutesToClock(finishClockMin),
      requiredStopsPerHour: requiredStopsPerHour ? Number(requiredStopsPerHour.toFixed(1)) : null,
    };
  }, [finishEstimate, targetEndMin, maxEndMin, nowMinFromMidnight, returnEtaMin, deliveriesRemaining]);

  useEffect(() => {
    if (!warning) return;

    const prev = lastWarnStatusRef.current;
    lastWarnStatusRef.current = warning.status;

    if (prev === null) return;
    if (prev === warning.status) return;

    const worsened =
      (prev === "ok" && (warning.status === "warn" || warning.status === "late")) ||
      (prev === "warn" && warning.status === "late");

    if (worsened) {
      alert(
        warning.status === "warn"
          ? `⚠️ Rischio sforamento\nFine stimata: ${warning.finishAtText}`
          : `⛔ Probabile sforamento\nFine stimata: ${warning.finishAtText}`
      );
      setDismissBanner(false);
    }
  }, [warning]);

  if (loading) return <div className="p-4 text-sm text-neutral-600">Caricamento Driver Mode…</div>;

  return (
    <main className="min-h-dvh bg-neutral-50 p-3 pb-28">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {/* STICKY HEADER */}
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

          {requiredStopsPerHourAtStart !== null && (
            <div className="mt-2 rounded-xl border bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Per rientrare in orario dovrai tenere una media di{" "}
              <b>{requiredStopsPerHourAtStart}</b> stop/ora.
            </div>
          )}

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
              type="button"
            >
              Google
            </Button>
            <Button
              variant={navApp === "waze" ? "secondary" : "outline"}
              className="flex-1"
              onClick={() => onSetNav("waze")}
              type="button"
            >
              Waze
            </Button>
          </div>

          <div className="mt-2 rounded-2xl border bg-neutral-50 p-2">
            <div className="mb-2 text-xs font-medium text-neutral-700">Vista (Lista / Mappa)</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={view === "list" ? "secondary" : "outline"}
                className="flex-1"
                onClick={() => setView("list")}
              >
                Lista
              </Button>
              <Button
                type="button"
                variant={view === "map" ? "secondary" : "outline"}
                className="flex-1"
                onClick={() => setView("map")}
              >
                Mappa
              </Button>
            </div>
          </div>

          <div className="mt-2">
            <Button variant="secondary" className="w-full" onClick={load} type="button">
              Aggiorna
            </Button>
          </div>
        </div>

        {/* BODY */}
        {view === "map" ? (
          mapStops.length > 0 ? (
            <RouteMap stops={mapStops} />
          ) : (
            <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-700">
              <div className="font-semibold">Mappa non disponibile</div>
              <div className="mt-1 text-xs text-neutral-500">
                Questa rotta non ha ancora coordinate (lat/lng). Per vedere i marker sulla mappa
                serve geocodifica degli indirizzi.
              </div>
              <div className="mt-3">
                <Button variant="outline" className="w-full" onClick={() => setView("list")} type="button">
                  Torna alla lista
                </Button>
              </div>
            </div>
          )
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
              packages={s.packages}
              isDone={s.is_done}
              isActive={s.id === activeStopId}
              onToggleDone={() => toggleDone(s.id, !s.is_done)}
            />
          ))
        )}

        {stats && <StatsSummary stats={stats} />}
      </div>

      {canShowTimeWarning && withinOneHourToTarget && warning && warning.status !== "ok" && !dismissBanner && (
        <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
          <Card className="rounded-2xl border bg-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-neutral-500">Rientro (stima)</div>

                  {etaLoading && (
                    <div className="mt-1 text-sm text-neutral-600">Calcolo ETA rientro...</div>
                  )}

                  {etaError && (
                    <div className="mt-1 text-sm text-red-600">
                      ETA non disponibile: {etaError}
                    </div>
                  )}

                  {!etaLoading && !etaError && (
                    <>
                      <div className="mt-1 text-sm font-semibold">
                        {warning.status === "warn" && "⚠️ Attenzione al ritmo"}
                        {warning.status === "late" && "⛔ Rischio rientro fuori orario"}
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
                          Per rientrare: ~<b>{warning.requiredStopsPerHour}</b> stop/ora
                        </div>
                      )}

                      <div className="mt-1 text-[11px] text-neutral-500">
                        (Stima: ritmo attuale + ETA rientro. Orari in Settings.)
                      </div>
                    </>
                  )}
                </div>

                <Button variant="outline" onClick={() => setDismissBanner(true)} type="button">
                  Chiudi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
