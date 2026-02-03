// app/routepro/import/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ImportChooserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-4 text-sm text-neutral-600">Caricamento…</div>;

  return (
    <main className="min-h-dvh bg-neutral-50 p-3 pb-10">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-sm font-semibold">Aggiungi stop</div>
            <div className="mt-1 text-xs text-neutral-500">
              Scegli il metodo più veloce per te. Nulla viene rimosso: stiamo solo aggiungendo opzioni.
            </div>

            <div className="mt-4 grid gap-3">
              <Link href="/routepro/import/text">
                <Button className="w-full">Import da testo / OCR (screenshot Flex)</Button>
              </Link>

              {/* Questo deve puntare alla tua schermata “vecchia” (manuale/vocale).
                  Se il percorso è diverso nel tuo progetto, dimmelo e lo aggiorno.
                  Metto /routepro per non rompere nulla: da lì hai già l’import vocale/manuale. */}
              <Link href="/routepro">
                <Button variant="outline" className="w-full">
                  Inserimento manuale / vocale (classico)
                </Button>
              </Link>
            </div>

            <div className="mt-4 text-[11px] text-neutral-500">
              Tip: se hai già la lista stop in Flex e puoi estrarre testo da screenshot, l’import OCR è il più rapido.
            </div>
          </CardContent>
        </Card>

        <Link href="/routepro">
          <Button variant="outline" className="w-full">← Torna a RoutePro</Button>
        </Link>
      </div>
    </main>
  );
}
