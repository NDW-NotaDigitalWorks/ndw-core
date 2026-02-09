"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { routeProPath } from "@/lib/routepro/routeProPath";

export default function ImportTextPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto max-w-md space-y-3">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">RoutePro • Import</div>
          <LogoutButton />
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">
              Importa da screenshot o testo
            </div>

            <div className="text-xs text-neutral-500">
              Incolla il testo copiato da Amazon Flex o da OCR screenshot.
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(routeProPath("/import/text/analyze"))}
            >
              Continua
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
      </div>
    </main>
  );
}
