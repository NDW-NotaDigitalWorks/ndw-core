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
            <div className="text-sm font-semibold">
              Aggiungi indirizzi alla rotta
            </div>

            <Button
              className="w-full"
              onClick={() => router.push("/routepro/import/text")}
            >
              📋 Importa da screenshot / testo
            </Button>

            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              ✍️ Inserimento manuale (in arrivo)
            </Button>

            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              🎙️ Import vocale (già disponibile)
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
