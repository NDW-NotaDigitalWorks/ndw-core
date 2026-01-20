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

export default function RouteDetailsPage() {
  const router = useRouter();
  const params = useParams<{ routeId: string }>();
  const routeId = params.routeId;

  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const orderedStops = useMemo(() => {
    // Starter: show original order (position). optimized comes later.
    return [...stops].sort((a, b) => a.position - b.position);
  }, [stops]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Ensure user is logged (Hub gate already helps, but keep it safe)
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
    })();
  }, [routeId, router]);

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
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        {loading && (
          <div className="text-sm text-neutral-600">Caricamento...</div>
        )}

        {error && (
          <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
            {error}
          </div>
        )}

        {!loading && !error && route && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Starter • Draft
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {route.name}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Data: {route.route_date ?? "—"} • Stop: {route.total_stops} • Stato:{" "}
                {route.status}
              </p>
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Stop (ordine originale)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orderedStops.length === 0 ? (
                  <div className="text-sm text-neutral-600">Nessuno stop.</div>
                ) : (
                  <div className="divide-y rounded-2xl border">
                    {orderedStops.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {s.position}. {s.address}
                          </div>
                          {s.note && (
                            <div className="mt-1 text-xs text-neutral-500">
                              {s.note}
                            </div>
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
                  Prossimo step: ottimizzazione (ORS) e export ordine ottimizzato.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
