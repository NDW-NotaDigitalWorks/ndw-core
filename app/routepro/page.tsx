// app/routepro/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasActiveEntitlement } from "@/lib/entitlement";
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

  useEffect(() => {
    (async () => {
      setChecking(true);
      setError(null);

      // 1) Check login
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      // 2) Check entitlement RoutePro Starter
      const allowed = await hasActiveEntitlement("routepro-starter");
      if (!allowed) {
        router.replace("/hub?upgrade=routepro");
        return;
      }

      // 3) Load routes
      const { data, error: err } = await supabase
        .from("routes")
        .select("id,name,route_date,status,total_stops,created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (err) {
        setError(err.message);
      } else {
        setRoutes((data as any) ?? []);
      }

      setChecking(false);
    })();
  }, [router]);

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">
              RoutePro
            </span>
            <span className="ml-2 rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
              Starter
            </span>
          </div>

          <div className="flex items-center gap-2">
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
            Crea una rotta, inserisci gli stop (anche con dettatura vocale),
            ottimizza e riparti.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/routepro/import">
              <Button className="w-full sm:w-auto">Nuova rotta</Button>
            </Link>
            <Link href="/routepro/import">
              <Button variant="outline" className="w-full sm:w-auto">
                Import rapido
              </Button>
            </Link>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Ultime rotte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checking && (
              <div className="text-sm text-neutral-600">Caricamento…</div>
            )}

            {error && (
              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                {error}
              </div>
            )}

            {!checking && !error && routes.length === 0 && (
              <div className="text-sm text-neutral-600">
                Nessuna rotta ancora. Clicca “Nuova rotta”.
              </div>
            )}

            {!checking && routes.length > 0 && (
              <div className="divide-y rounded-2xl border">
                {routes.map((r) => (
                  <Link key={r.id} href={`/routepro/routes/${r.id}`}>
                    <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {r.name}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          Data: {r.route_date ?? "—"} • Stop: {r.total_stops} •
                          Stato: {r.status}
                        </div>
                      </div>
                      <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                        Apri
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
              Accesso attivo: RoutePro Starter
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
