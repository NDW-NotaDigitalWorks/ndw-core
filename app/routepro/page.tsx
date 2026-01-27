// app/routepro/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasRouteProAccess, getRouteProTier } from "@/lib/entitlement";
import { getLastRouteId } from "@/lib/routepro/prefs";
import { RouteProHeader } from "@/components/routepro/RouteProHeader";
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
  const [tier, setTier] = useState<string>("STARTER");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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

      const allowed = await hasRouteProAccess();
      if (!allowed) {
        router.replace("/hub?upgrade=routepro");
        return;
      }

      const t = await getRouteProTier();
      setTier((t ?? "starter").toUpperCase());

      await loadRoutes();
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadRoutes() {
    const { data, error: err } = await supabase
      .from("routes")
      .select("id,name,route_date,status,total_stops,created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (err) setError(err.message);
    setRoutes((data as any) ?? []);
  }

  async function deleteRoute(route: RouteRow) {
    setMsg(null);

    const ok = confirm(
      `Eliminare questa rotta?\n\n"${route.name}"\n\nVerranno eliminati anche stop e storico collegati.`
    );
    if (!ok) return;

    setBusyId(route.id);

    try {
      const { error } = await supabase.from("routes").delete().eq("id", route.id);
      if (error) throw error;

      setMsg("Rotta eliminata ✅");

      // refresh list
      await loadRoutes();
    } catch (e: any) {
      setMsg(e?.message ?? "Errore eliminazione rotta.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <RouteProHeader title="RoutePro" tier={tier} />

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        {msg && (
          <div className="mb-4 rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
            {msg}
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            RoutePro • Piano {tier}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {lastRouteId && (
              <Link href={`/routepro/routes/${lastRouteId}/driver`}>
                <Button className="w-full sm:w-auto">Riprendi Driver Mode</Button>
              </Link>
            )}
            <Link href="/routepro/import">
              <Button variant="outline" className="w-full sm:w-auto">
                Nuova rotta
              </Button>
            </Link>
            <Link href="/routepro/start">
              <Button variant="outline" className="w-full sm:w-auto">
                Guida rapida
              </Button>
            </Link>
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Ultime rotte</CardTitle>
            <Button variant="secondary" onClick={loadRoutes} disabled={checking}>
              Aggiorna
            </Button>
          </CardHeader>

          <CardContent className="space-y-2">
            {checking && <div className="text-sm text-neutral-600">Caricamento…</div>}

            {error && (
              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                {error}
              </div>
            )}

            {!checking && !error && routes.length === 0 && (
              <div className="text-sm text-neutral-600">Nessuna rotta ancora.</div>
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

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link href={`/routepro/routes/${r.id}/driver`} className="sm:flex-1">
                        <Button variant="outline" className="w-full justify-start">
                          Driver Mode (AF # + OPT # + Naviga)
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => deleteRoute(r)}
                        disabled={busyId === r.id}
                      >
                        {busyId === r.id ? "Elimino..." : "Elimina"}
                      </Button>
                    </div>
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
