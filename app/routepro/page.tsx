// app/routepro/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RouteProPage() {
  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">RoutePro</span>
            <span className="ml-2 rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
              MVP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          RoutePro — modulo NDW
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Qui costruiremo il primo MVP “bandiera”: import stop, ottimizzazione,
          export, KPI e storico. In questa fase creiamo struttura e UI.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Prossimo step</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Definiremo lo schema dati RoutePro e il primo flow:
              <div className="mt-3 flex flex-col gap-2">
                <Button className="justify-start" disabled>
                  Import stop (coming soon)
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  Ottimizza (coming soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Obiettivo MVP</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Un tool che ti fa risparmiare tempo reale ogni giorno e rende il
              lavoro più pulito. ROI percepibile.
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
