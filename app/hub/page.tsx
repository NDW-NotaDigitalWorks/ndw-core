// app/hub/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROUTEPRO_CHECKOUT_URL = process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_STARTER_URL || "";

export default function HubPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  // instead of useSearchParams (build issue), read query client-side
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);

  const showRouteProUpgrade = useMemo(
    () => upgradeTarget === "routepro",
    [upgradeTarget]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);

      // read query params safely client-side
      const params = new URLSearchParams(window.location.search);
      setUpgradeTarget(params.get("upgrade"));

      setChecking(false);
    })();
  }, [router]);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (checking) {
    return (
      <main className="min-h-dvh bg-white text-neutral-900">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-neutral-600">
          Caricamento NDW Hub...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">NDW Hub</span>
              {email && <span className="text-[11px] text-neutral-500">{email}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
            <Button variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Benvenuto in NDW Hub
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Qui trovi i tuoi prodotti e gli accessi. Se un prodotto è bloccato, puoi
            sbloccarlo dal checkout.
          </p>
        </div>

        {showRouteProUpgrade && (
          <Card className="mb-6 rounded-2xl border">
            <CardHeader>
              <CardTitle className="text-base">RoutePro è bloccato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>
                Per usare RoutePro devi avere un abbonamento attivo. Clicca sotto per
                completare l’acquisto su Whop.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={ROUTEPRO_CHECKOUT_URL} target="_blank" rel="noreferrer">
                  <Button className="w-full sm:w-auto" disabled={!ROUTEPRO_CHECKOUT_URL}>
                    Vai al checkout RoutePro
                  </Button>
                </a>
                <Link href="/routepro">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Riprova accesso
                  </Button>
                </Link>
              </div>

              {!ROUTEPRO_CHECKOUT_URL && (
                <p className="text-xs text-red-600">
                  Mancano le env: NEXT_PUBLIC_WHOP_ROUTEPRO_STARTER_URL
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prodotti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/routepro">
                <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 hover:bg-neutral-50">
                  <span className="text-sm font-medium">RoutePro</span>
                  <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                    Apri
                  </span>
                </div>
              </Link>

              <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 opacity-60">
                <span className="text-sm font-medium">Ristorazione</span>
                <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                  In arrivo
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 opacity-60">
                <span className="text-sm font-medium">Beauty</span>
                <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                  In arrivo
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Azioni rapide</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href="/routepro/import">
                <Button className="w-full justify-start">Nuova rotta (RoutePro)</Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" disabled>
                Gestisci profilo (coming soon)
              </Button>
              <Button variant="secondary" className="w-full justify-start" disabled>
                Vedi piani (coming soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
