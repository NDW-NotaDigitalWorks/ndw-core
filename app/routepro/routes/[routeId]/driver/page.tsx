// app/routepro/routes/[routeId]/driver/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StopCard } from "@/components/routepro/StopCard";
import { Button } from "@/components/ui/button";
import { openNavigation } from "@/lib/routepro/navigation";

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

      // Ordine: se c’è optimized_position -> usa quello, altrimenti position
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

  async function toggleDone(stopId: string, nextValue: boolean) {
    setStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, is_done: nextValue } : s)));

    const { error } = await supabase.from("route_stops").update({ is_done: nextValue }).eq("id", stopId);

    if (error) {
      // rollback
      setStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, is_done: !nextValue } : s)));
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
    openNavigation({ lat: activeStop.lat, lng: activeStop.lng, address: activeStop.address });
  }

  if (loading) {
    return <div className="p-4 text-sm text-neutral-600">Caricamento Driver Mode…</div>;
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
                  Corrente: <b>OPT #{activeStop.optimized_position ?? "—"}</b> (AF #{activeStop.position})
                </div>
              )}
            </div>

            <Link href={`/routepro/routes/${routeId}`}>
              <Button variant="outline">Dettaglio</Button>
            </Link>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <Button onClick={navToActive} disabled={!activeStop}>
              Naviga stop corrente
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goToNextPending}>
                Prossimo non fatto
              </Button>
              <Button variant="secondary" className="flex-1" onClick={load}>
                Aggiorna
              </Button>
            </div>
          </div>
        </div>

        {orderedStops.map((s, idx) => (
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
        ))}
      </div>
    </main>
  );
}
