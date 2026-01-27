// app/routepro/start/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasRouteProAccess, getRouteProTier } from "@/lib/entitlement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RouteProStartPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<string>("starter");

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
      setTier((t ?? "starter").toLowerCase());
      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-dvh bg-white text-neutral-900">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 text-sm text-neutral-600">
          Caricamento...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">
              RoutePro • Start
            </span>
            <span className="ml-2 rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
              {tier.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routepro">
              <Button variant="ghost">Le mie rotte</Button>
            </Link>
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Workflow RoutePro
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          3 passi e sei operativo
        </h1>

        <div className="mt-6 grid gap-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">1) Crea rotta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>Inserisci gli stop (uno per riga). Vocale supportato.</p>
              <Link href="/routepro/import">
                <Button className="w-full sm:w-auto">Import Stops</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">2) Ottimizza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>Apri dettaglio rotta e premi “Ottimizza rotta”.</p>
              <Link href="/routepro">
                <Button variant="outline" className="w-full sm:w-auto">
                  Vai a Le mie rotte
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">3) Driver Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>
                AF # + OPT #, naviga, prossimo, mappa, stato stop.
              </p>
              <Link href="/routepro">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Apri RoutePro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
