// app/routepro/import/voice/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { routeProPath } from "@/lib/routepro/routeProPath";
import { LogoutButton } from "@/components/auth/LogoutButton";
import ImportVoiceContent from "@/components/routepro/ImportVoiceContent";

export default function ImportVoicePage() {
  const router = useRouter();
  const [text, setText] = useState("");

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto max-w-md space-y-3">
        {/* TOP BAR MINIMALE */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border bg-white p-3 shadow-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(routeProPath("/import"))}
          >
            ← Indietro
          </Button>

          <div className="text-xs font-medium text-neutral-700">Import vocale</div>

          <LogoutButton />
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold">Detta gli stop</div>
            <div className="text-xs text-neutral-500">
              Avvia il microfono e detta gli indirizzi. Il testo viene accumulato qui sotto.
            </div>

            {/* MICROFONO */}
            <ImportVoiceContent value={text} onChange={setText} />

            {/* TESTO ACCUMULATO */}
            <textarea
              className="min-h-[220px] w-full rounded-xl border bg-white p-3 text-sm outline-none"
              placeholder="Qui comparirà il testo dettato…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <Button
              type="button"
              className="w-full"
              disabled={!text.trim()}
              onClick={() => {
                // qui puoi decidere la tua flow:
                // esempio: vai a /import/text e precompila via query/localStorage
                localStorage.setItem("ndw_routepro_import_text_draft", text);
                router.push(routeProPath("/import/text"));
              }}
            >
              Continua → Analizza testo
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setText("")}
            >
              Svuota
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
