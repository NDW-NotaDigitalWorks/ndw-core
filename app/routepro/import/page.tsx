// app/routepro/import/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createRouteWithStops,
  parseStopsFromText,
} from "@/lib/routeproRepository";

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RouteProImportPage() {
  const router = useRouter();

  const [name, setName] = useState("Turno");
  const [routeDate, setRouteDate] = useState(todayISODate());
  const [rawStops, setRawStops] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stops = useMemo(() => parseStopsFromText(rawStops), [rawStops]);

  async function onCreateRoute() {
    setMessage(null);

    if (!stops.length) {
      setMessage("Inserisci almeno 1 stop (uno per riga).");
      return;
    }

    setLoading(true);
    try {
      const { routeId } = await createRouteWithStops(
        {
          name: name.trim() || "Turno",
          routeDate: routeDate || undefined,
        },
        stops
      );

      setMessage("Rotta creata ✅");
      // Next step: route details page (we create it in the next step)
      router.push(`/routepro/routes/${routeId}`);
    } catch (err: any) {
      setMessage(err?.message ?? "Errore durante la creazione rotta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl border bg-neutral-50" />
            <span className="text-sm font-semibold tracking-tight">
              RoutePro — Import Stops
            </span>
            <span className="ml-2 rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
              Starter
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/routepro">
              <Button variant="ghost">RoutePro</Button>
            </Link>
            <Link href="/hub">
              <Button variant="ghost">NDW Hub</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Starter • Import
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Inserisci gli stop (uno per riga)
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Perfetto per dettatura vocale: usa la dettatura della tastiera e vai
            a capo per creare uno stop. Poi clicca “Crea rotta”.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Stop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[260px] w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                placeholder={`Esempio:\nVia Roma 10, Milano\nVia Torino 21, Monza\nViale Libertà 5, Seregno`}
                value={rawStops}
                onChange={(e) => setRawStops(e.target.value)}
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-neutral-500">
                  Stop rilevati: <span className="font-semibold">{stops.length}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRawStops("")}
                    disabled={loading || !rawStops.trim()}
                  >
                    Pulisci
                  </Button>
                  <Button onClick={onCreateRoute} disabled={loading}>
                    {loading ? "Creo..." : "Crea rotta"}
                  </Button>
                </div>
              </div>

              {message && (
                <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Dettagli rotta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Turno mattina"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={routeDate}
                  onChange={(e) => setRouteDate(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                Suggerimento: per dettare, usa il microfono della tastiera e
                vai a capo tra uno stop e l’altro.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
