// app/routepro/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasActiveEntitlement } from "@/lib/entitlement";
import { getLastRouteId } from "@/lib/routepro/prefs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RouteRow = {
  id: string;
  name: string;
  route_date: string | null;
  status: "draft" | "optimized";
  total_stops: number;
  created_at: string;
};

export default function RouteProHome() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastRouteId = useMemo(() => getLastRouteId(), []);

  useEffect(() => {
    (async () => {
      setChecking(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const allowed = await hasActiveEntitlement("routepro-starter");
      if (!allowed) {
        router.replace("/hub?upgrade=routepro");
        return;
      }

      const { data, error: err } = await supabase
        .from("routes")
        .select("id,name,route_date,status,total_stops,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (err) setError(err.message);
      setRoutes((data as any) ?? []);
      setChecking(false);
    })();
  }, [router]);

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">RoutePro</span>
            <span className="ml-2 rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
              Starter
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routepro/start">
              <Button variant="outline">Come funziona</Button>
            </Link>
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            RoutePro Starter
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Le tue rotte
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Riprendi da dove eri rimasto o crea una nuova rotta.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {lastRouteId && (
              <Link href={`/routepro/routes/${lastRouteId}/driver`}>
                <Button className="w-full sm:w-auto">Riprendi Driver Mode</Button>
              </Link>
            )}
            <Link href="/routepro/import">
              <Button variant="outline" className="w-full sm:w-auto">Nuova rotta</Button>
            </Link>
            <Link href="/routepro/start">
              <Button variant="outline" className="w-full sm:w-auto">Guida rapida</Button>
            </Link>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Ultime rotte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checking && <div className="text-sm text-neutral-600">Caricamento…</div>}

            {error && (
              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                {error}
              </div>
            )}

            {!checking && !error && routes.length === 0 && (
              <div className="space-y-3">
                <div className="text-sm text-neutral-600">
                  Nessuna rotta ancora. Parti da “Nuova rotta”.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/routepro/import">
                    <Button className="w-full sm:w-auto">Crea la prima rotta</Button>
                  </Link>
                  <Link href="/routepro/start">
                    <Button variant="outline" className="w-full sm:w-auto">Vedi workflow</Button>
                  </Link>
                </div>
              </div>
            )}

            {!checking && routes.length > 0 && (
              <div className="divide-y rounded-2xl border">
                {routes.map((r) => (
                  <div key={r.id} className="flex flex-col gap-2 px-4 py-3 hover:bg-neutral-50">
                    <Link href={`/routepro/routes/${r.id}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{r.name}</div>
                          <div className="mt-1 text-xs text-neutral-500">
                            Data: {r.route_date ?? "—"} • Stop: {r.total_stops} • Stato: {r.status}
                          </div>
                        </div>
                        <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                          Apri
                        </span>
                      </div>
                    </Link>

                    <Link href={`/routepro/routes/${r.id}/driver`}>
                      <Button variant="outline" className="w-full justify-start">
                        Driver Mode (AF # + OPT # + Naviga)
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
