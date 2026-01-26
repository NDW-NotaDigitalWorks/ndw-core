// app/routepro/start/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { hasActiveEntitlement } from "@/lib/entitlement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RouteProStartPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
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
          RoutePro Starter • workflow
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          3 passi e sei operativo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Pensato per driver: rapido, chiaro, senza fronzoli.
        </p>

        <div className="mt-6 grid gap-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">1) Crea rotta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>
                Inserisci gli stop (uno per riga). Perfetto con dettatura vocale.
              </p>
              <Link href="/routepro/import">
                <Button className="w-full sm:w-auto">Vai a Import Stops</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">2) Ottimizza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>
                Apri il dettaglio rotta e premi “Ottimizza rotta”. Verranno salvati
                OPT # e l’ordine ottimizzato.
              </p>
              <Link href="/routepro">
                <Button variant="outline" className="w-full sm:w-auto">
                  Apri Le mie rotte
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
                Usa la vista “Driver Mode”: AF # + OPT #, stato stop, naviga, prossimo,
                mappa.
              </p>
              <Link href="/routepro">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Vai a Driver Mode da una rotta
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-700">
          Tip driver: usa “Naviga prossimo non fatto” e segna “Fatto” per scorrere
          automaticamente.
        </div>
      </section>
    </main>
  );
}
