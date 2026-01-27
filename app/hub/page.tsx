// app/hub/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STARTER_URL = process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_STARTER_URL || "";
const PRO_URL = process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_PRO_URL || "";
const ELITE_URL = process.env.NEXT_PUBLIC_WHOP_ROUTEPRO_ELITE_URL || "";

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
      <header className="sticky top-0 z-10 border-b bg-[#050B1E]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <Image src="/ndw-logo.png" alt="NDW" width={36} height={36} priority />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">NDW Hub</span>
              {email && <span className="text-[11px] text-sky-300">{email}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Home
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-sky-400 text-sky-300 hover:bg-sky-400/10"
              onClick={onLogout}
            >
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
            Strumenti NDW Core + prodotti verticali come RoutePro.
          </p>
        </div>

        {upgradeTarget === "routepro" && (
          <Card className="mb-6 rounded-2xl border">
            <CardHeader>
              <CardTitle className="text-base">Sblocca RoutePro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-600">
              <p>Scegli il piano. Starter è perfetto per iniziare; Pro/Elite sbloccano funzioni avanzate.</p>

              <div className="grid gap-2 sm:grid-cols-3">
                <a href={STARTER_URL} target="_blank" rel="noreferrer">
                  <Button className="w-full" disabled={!STARTER_URL}>
                    Starter 19€
                  </Button>
                </a>
                <a href={PRO_URL} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full" disabled={!PRO_URL}>
                    Pro 49€
                  </Button>
                </a>
                <a href={ELITE_URL} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full" disabled={!ELITE_URL}>
                    Elite 79€
                  </Button>
                </a>
              </div>

              <Link href="/routepro">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Riprova accesso
                </Button>
              </Link>

              {(!STARTER_URL || !PRO_URL || !ELITE_URL) && (
                <p className="text-xs text-red-600">
                  Mancano env checkout: NEXT_PUBLIC_WHOP_ROUTEPRO_*_URL
                </p>
              )}
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
                <Button variant="outline" className="w-full justify-start">Turni</Button>
              </Link>
              <Link href="/hub/cards">
                <Button variant="outline" className="w-full justify-start">Schede lavoro</Button>
              </Link>
              <Link href="/hub/checklists">
                <Button variant="outline" className="w-full justify-start">Checklist</Button>
              </Link>
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
