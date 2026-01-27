// app/routepro/start/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasRouteProAccess, getRouteProTier } from "@/lib/entitlement";
import { RouteProHeader } from "@/components/routepro/RouteProHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RouteProStartPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<string>("STARTER");

  useEffect(() => {
    (async () => {
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

      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return <div className="p-4 text-sm text-neutral-600">Caricamento...</div>;
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <RouteProHeader title="RoutePro • Guida" tier={tier} />

      <section className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Workflow in 3 step
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Parti subito (driver-ready)
        </h1>

        <div className="mt-6 grid gap-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">1) Import</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Inserisci stop (uno per riga). Supporto vocale + Flex Mode (Pickup/Return).
              <div className="mt-3">
                <Link href="/routepro/import" className="underline">
                  Vai a Import
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">2) Ottimizza</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Apri dettaglio rotta e premi “Ottimizza rotta”.
              Salva OPT # e geocoding.
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">3) Driver Mode</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              AF # + OPT #, stato stop, prossimo, naviga Google/Waze, mappa.
              <div className="mt-3">
                <Link href="/routepro" className="underline">
                  Apri le tue rotte
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-700">
          Tip: usa “Naviga prossimo non fatto” e segna “Fatto” per scorrere automaticamente.
        </div>
      </section>
    </main>
  );
}
