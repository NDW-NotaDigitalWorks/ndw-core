// app/hub/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROUTEPRO_CHECKOUT_URL = process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_STARTER_URL || "";

export default function HubPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);

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
            NDW Core
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard operativa
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Turni, schede e checklist: strumenti trasversali per chi lavora ogni giorno.
          </p>
        </div>

        {upgradeTarget === "routepro" && (
          <Card className="mb-6 rounded-2xl border">
            <CardHeader>
              <CardTitle className="text-base">RoutePro è bloccato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>
                Per usare RoutePro devi avere un abbonamento attivo. Clicca sotto per completare l’acquisto su Whop.
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
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Strumenti NDW Core</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/hub/shifts">
                <Button variant="outline" className="w-full justify-start">
                  Turni
                </Button>
              </Link>
              <Link href="/hub/cards">
                <Button variant="outline" className="w-full justify-start">
                  Schede lavoro
                </Button>
              </Link>
              <Link href="/hub/checklists">
                <Button variant="outline" className="w-full justify-start">
                  Checklist
                </Button>
              </Link>

              <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                Questi moduli sono universali e riutilizzabili per ogni verticale NDW.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prodotti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/routepro">
                <Button className="w-full justify-start">Apri RoutePro</Button>
              </Link>

              <Button variant="outline" className="w-full justify-start" disabled>
                Ristorazione (in arrivo)
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                Beauty (in arrivo)
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
