// app/routepro/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRouteProTier } from "@/lib/entitlement";

type RouteRow = {
  id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function RouteProHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [tier, setTier] = useState<"starter" | "pro" | "elite">("starter");
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasRoutes = routes.length > 0;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);

      // Tier
      try {
        const t = await getRouteProTier();
        setTier((t ?? "starter") as any);
      } catch {
        // non bloccare la home
      }

      // Routes list
      try {
        const { data, error: routesErr } = await supabase
          .from("routes")
          .select("id,name,created_at,updated_at")
          .eq("user_id", userData.user.id)
          .order("updated_at", { ascending: false })
          .limit(25);

        if (routesErr) throw routesErr;
        setRoutes((data ?? []) as RouteRow[]);
      } catch (e: any) {
        setError(e?.message ?? "Errore caricamento rotte");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tierLabel = useMemo(() => {
    if (tier === "elite") return "ELITE • Power User";
    if (tier === "pro") return "PRO";
    return "STARTER";
  }, [tier]);

  const tierBadgeClass = useMemo(() => {
    if (tier === "elite") return "bg-violet-50 text-violet-800 border-violet-200";
    if (tier === "pro") return "bg-blue-50 text-blue-800 border-blue-200";
    return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }, [tier]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-neutral-50 p-3">
  <div className="mx-auto max-w-md">
    <Button
      variant="outline"
      className="mb-3 w-full"
      onClick={() => router.push("/routepro")}
      type="button"
    >
      ← Torna a RoutePro
    </Button>
  </div>

        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-600">
            Caricamento RoutePro…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 p-3 pb-24">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {/* Header */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-neutral-500">NDW • RoutePro</div>
              <div className="mt-1 text-lg font-semibold text-neutral-900">Dashboard</div>
              <div className="mt-2 inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium">
                <span className={`rounded-full border px-2 py-0.5 ${tierBadgeClass}`}>
                  {tierLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => router.push("/routepro/settings")}>
                Settings
              </Button>
              <Button variant="outline" onClick={() => router.push("/upgrade")}>
                Upgrade
              </Button>
            </div>
          </div>

          {/* Onboarding one-time (when no routes) */}
          {!hasRoutes && (
            <div className="mt-3 rounded-xl border bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <div className="font-semibold">👋 Benvenuto in RoutePro</div>
              <div className="mt-1 text-xs text-blue-900/80">
                Importa la tua prima rotta (screenshot/testo è il metodo più veloce).
              </div>
              <div className="mt-2">
                <Button className="w-full" onClick={() => router.push("/routepro/import")}>
                  Inizia ora
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA: Create route */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">📋 Crea la tua rotta in 1 minuto</div>
            <div className="text-xs text-neutral-500">
              Screenshot Flex → copia testo → incolla → revisione → crea rotta → Driver Mode.
            </div>

            <Button className="w-full" onClick={() => router.push("/routepro/import")}>
              Crea nuova rotta
            </Button>

            <div className="text-[11px] text-neutral-500">
              Tip iPhone: puoi usare anche la <b>dettatura della tastiera</b> dentro il campo testo.
            </div>
          </CardContent>
        </Card>

        {/* Workday settings CTA */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">⏱️ Imposta i tuoi orari di lavoro</div>
            <div className="text-xs text-neutral-500">
              Serve per calcolare ritmo, avvisi e rientro in orario (PRO/ELITE).
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push("/routepro/settings")}>
              Imposta orari + navigazione
            </Button>

            {tier === "starter" && (
              <div className="text-[11px] text-neutral-500">
                Nota: gli avvisi “rientro in orario” sono una feature <b>PRO/ELITE</b>.
                <span className="ml-1">
                  <Link className="underline" href="/upgrade">
                    Vedi piani
                  </Link>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Routes list */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">🗺️ Le tue rotte</div>
              <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                Aggiorna
              </Button>
            </div>

            {error && (
              <div className="rounded-xl border bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {!hasRoutes && !error && (
              <div className="text-sm text-neutral-600">
                Nessuna rotta ancora. Premi <b>Crea nuova rotta</b> e parti.
              </div>
            )}

            {hasRoutes && (
              <div className="space-y-2">
                {routes.map((r) => (
                  <div key={r.id} className="rounded-2xl border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-neutral-900 break-words">
                          {r.name || "RoutePro • Rotta"}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500">
                          Aggiornata: <b>{formatDate(r.updated_at ?? r.created_at) || "—"}</b>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/routepro/routes/${r.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Dettaglio
                          </Button>
                        </Link>
                        <Link href={`/routepro/routes/${r.id}/driver`}>
                          <Button size="sm" className="w-full">
                            Driver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick help */}
        <div className="text-[11px] text-neutral-500 px-1">
          Consiglio “da strada”: se la tua rotta Flex è già ottimizzata, RoutePro ti serve comunque per
          <b> gestione stop AF/OPT</b>, <b>navigazione stop-per-stop</b>, pacchi, checklist e avvisi orari.
        </div>

        {/* Footer quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => router.push("/hub")}>
            NDW Hub
          </Button>
          <Button variant="outline" onClick={() => router.push("/routepro/import")}>
            Import
          </Button>
        </div>
      </div>

      {/* Sticky bottom bar (always useful) */}
      <div className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-3">
        <Card className="rounded-2xl border bg-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">
                  Pronto a partire? Crea una rotta e apri Driver Mode.
                </div>
              </div>
              <Button onClick={() => router.push("/routepro/import")}>Crea rotta</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
