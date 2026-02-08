// app/routepro/import/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ImportChoicePage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto max-w-md space-y-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">Aggiungi indirizzi alla rotta</div>
            <div className="text-xs text-neutral-500">
              Scegli il metodo più veloce per caricare gli stop in RoutePro.
            </div>

            <Button className="w-full" onClick={() => router.push("/routepro/import/text")}>
              📋 Importa da screenshot / testo
            </Button>

            <Button variant="outline" className="w-full" onClick={() => router.push("/routepro/import/voice")}>
              🎙️ Import vocale <span className="ml-2 text-[11px] text-neutral-500">(beta)</span>
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/routepro/import/manual")}
            >
              ✍️ Inserimento manuale
            </Button>

            <div className="pt-2 text-[11px] text-neutral-500">
              Tip iPhone: puoi usare la <b>dettatura della tastiera</b> nel campo testo.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-neutral-700">Consiglio “da strada”</div>
            <div className="mt-1 text-xs text-neutral-500">
              120–150 stop: <b>Screenshot → OCR → Import testo → Revisione</b>. Se sei in giro: <b>Manuale</b> o <b>Vocale</b>.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
