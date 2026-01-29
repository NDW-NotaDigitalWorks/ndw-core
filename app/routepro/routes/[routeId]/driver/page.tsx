"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { StatsSummary } from "@/components/routepro/StatsSummary";
import { computeRouteStats } from "@/lib/routepro/stats";
import { openNavigation } from "@/lib/routepro/navigation";

// =====================
// Types
// =====================

type Stop = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  original_position: number;
  optimized_position: number | null;
  completed: boolean;
};

type WarnStatus = "ok" | "warn" | "late";

type FinishEstimate = {
  finishAt: Date;
  returnEtaMin: number | null;
};

// =====================
// Page
// =====================

export default function DriverRoutePage() {
  const { routeId } = useParams<{ routeId: string }>();

  const [stops, setStops] = useState<Stop[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);

  const [returnEtaMin, setReturnEtaMin] = useState<number | null>(null);

  // evita spam notifiche
  const lastWarnStatusRef = useRef<WarnStatus | null>(null);

  // =====================
  // Load route data (mock / già esistente)
  // =====================

  useEffect(() => {
    // qui sei già collegato al tuo fetch reale
    // placeholder per chiarezza
  }, [routeId]);

  // =====================
  // Derived values
  // =====================

  const completedStops = stops.filter((s) => s.completed);
  const remainingStops = stops.filter((s) => !s.completed);

  const routeCompleted =
    stops.length > 0 && completedStops.length === stops.length;

  // =====================
  // Stats (fine rotta)
  // =====================

  const stats = useMemo(() => {
    if (!routeCompleted || !startedAt || !endedAt) return null;

    return computeRouteStats({
      totalStops: stops.length,
      startedAt,
      endedAt,
    });
  }, [routeCompleted, startedAt, endedAt, stops.length]);

  // =====================
  // Finish estimate (rientro)
  // =====================

  const finishEstimate: FinishEstimate | null = useMemo(() => {
    if (!startedAt || remainingStops.length === 0) return null;

    const now = new Date();
    const elapsedMin = (now.getTime() - startedAt.getTime()) / 60000;
    const avgMinPerStop =
      completedStops.length > 0 ? elapsedMin / completedStops.length : null;

    if (!avgMinPerStop) return null;

    const remainingMin = avgMinPerStop * remainingStops.length;
    const finishAt = new Date(now.getTime() + remainingMin * 60000);

    return {
      finishAt,
      returnEtaMin,
    };
  }, [startedAt, completedStops.length, remainingStops.length, returnEtaMin]);

  // =====================
  // Warning logic
  // =====================

  const warning = useMemo((): {
    status: WarnStatus;
    finishAtText: string;
    requiredStopsPerHour: number | null;
  } | null => {
    if (!finishEstimate) return null;

    // valori esempio (poi arrivano da settings)
    const targetEndMin = 17 * 60 + 45;
    const maxEndMin = 18 * 60 + 4;

    const finishClockMin =
      finishEstimate.finishAt.getHours() * 60 +
      finishEstimate.finishAt.getMinutes();

    const status: WarnStatus =
      finishClockMin <= targetEndMin
        ? "ok"
        : finishClockMin <= maxEndMin
        ? "warn"
        : "late";

    const now = new Date();
    const nowMinFromMidnight =
      now.getHours() * 60 + now.getMinutes();

    const minutesUntilTarget = targetEndMin - nowMinFromMidnight;
    const availableForStops =
      minutesUntilTarget - (finishEstimate.returnEtaMin ?? 0);

    const requiredStopsPerHour =
      availableForStops > 0
        ? (remainingStops.length / availableForStops) * 60
        : null;

    return {
      status,
      finishAtText: finishEstimate.finishAt.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      requiredStopsPerHour: requiredStopsPerHour
        ? Number(requiredStopsPerHour.toFixed(1))
        : null,
    };
  }, [finishEstimate, remainingStops.length]);

  // =====================
  // Warn effect (popup / toast futuro)
  // =====================

  useEffect(() => {
    if (!warning) return;

    const prev = lastWarnStatusRef.current;
    lastWarnStatusRef.current = warning.status;

    if (prev === null) return;
    if (prev === warning.status) return;

    // qui in futuro popup / toast / vibrazione
    console.log("WARN STATUS:", warning.status);
  }, [warning]);

  // =====================
  // UI
  // =====================

  return (
    <div className="p-4 space-y-4">
      {/* Lista stop */}
      {stops.map((stop) => (
        <Card key={stop.id}>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                #{stop.original_position} →{" "}
                {stop.optimized_position ?? "-"}
              </div>
              <div className="text-sm text-muted-foreground">
                {stop.address}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  openNavigation(stop.lat, stop.lng)
                }
              >
                Naviga
              </Button>

              {!stop.completed && (
                <Button
                  onClick={() => {
                    setStops((prev) =>
                      prev.map((s) =>
                        s.id === stop.id
                          ? { ...s, completed: true }
                          : s
                      )
                    );

                    if (!startedAt) {
                      setStartedAt(new Date());
                    }

                    if (
                      completedStops.length + 1 ===
                      stops.length
                    ) {
                      setEndedAt(new Date());
                    }
                  }}
                >
                  Fatto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Avviso rientro */}
      {warning && (
        <Card
          className={
            warning.status === "ok"
              ? "border-green-500"
              : warning.status === "warn"
              ? "border-yellow-500"
              : "border-red-500"
          }
        >
          <CardContent className="text-sm">
            <strong>Rientro stimato:</strong>{" "}
            {warning.finishAtText}
            {warning.requiredStopsPerHour && (
              <div>
                Per rientrare: ~
                {warning.requiredStopsPerHour} stop/ora
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats a FINE ROTTA */}
      {stats && <StatsSummary stats={stats} />}
    </div>
  );
}
