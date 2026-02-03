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
              🎙️ Import vocale (Dettatura → Analizza)
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/routepro/import/manual")}
            >
              ✍️ Inserimento manuale
            </Button>

            <div className="pt-2 text-[11px] text-neutral-500">
              Tip iPhone: puoi anche usare la <b>dettatura della tastiera</b> dentro il campo testo.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-neutral-700">Consiglio “da strada”</div>
            <div className="mt-1 text-xs text-neutral-500">
              Per 120–150 stop: fai screenshot Flex → OCR/copia testo → Importa da testo → Revisione rapida.
              Se invece devi inserire a voce mentre sei in giro: Import vocale.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
