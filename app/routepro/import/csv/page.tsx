"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { routeProPath } from "@/lib/routepro/routeProPath";

export default function ImportCsvPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto max-w-md space-y-3">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">RoutePro • Import CSV</div>
          <LogoutButton />
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">
              Importa da file CSV
            </div>

            <div className="text-xs text-neutral-500">
              Carica un file CSV con elenco indirizzi. Ideale per 50+ stop.
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
              📌 Formato consigliato: indirizzo, città, CAP, cliente, telefono
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(routeProPath("/import/csv/analyze"))}
            >
              📤 Seleziona file CSV
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(routeProPath("/import"))}
            >
              ← Torna ai metodi di import
            </Button>
          </CardContent>
        </Card>

        {/* TIPS */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-neutral-700">
              Consiglio batch
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Per 200+ stop: CSV con indirizzi completi → geocoding automatico con ORS.
              Tempo medio: 0.3s per indirizzo.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}