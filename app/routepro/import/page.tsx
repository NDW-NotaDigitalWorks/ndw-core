// app/routepro/import/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createRouteWithStops,
  parseStopsFromText,
  type ImportStopInput,
} from "@/lib/routeproRepository";
import { createSpeechController, getSpeechSupport } from "@/lib/routepro/speech";

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

  // FLEX MODE
  const [flexMode, setFlexMode] = useState(true);
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [addReturn, setAddReturn] = useState(true);

  // Voice
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const baseStops = useMemo(() => parseStopsFromText(rawStops), [rawStops]);

  const finalStops = useMemo(() => {
    if (!flexMode) {
      return baseStops.map((s, idx) => ({
        ...s,
        stopType: "delivery",
        afStopNumber: idx + 1,
      })) as ImportStopInput[];
    }

    if (!warehouseAddress.trim()) return [] as ImportStopInput[];

    const deliveries = baseStops.map((s, idx) => ({
      ...s,
      stopType: "delivery" as const,
      afStopNumber: idx + 2,
    }));

    const pickup: ImportStopInput = {
      address: warehouseAddress.trim(),
      stopType: "pickup",
      afStopNumber: 1,
    };

    if (addReturn) {
      const ret: ImportStopInput = {
        address: warehouseAddress.trim(),
        stopType: "return",
        afStopNumber: deliveries.length + 2,
      };
      return [pickup, ...deliveries, ret];
    }

    return [pickup, ...deliveries];
  }, [flexMode, warehouseAddress, addReturn, baseStops]);

  useEffect(() => {
    const s = getSpeechSupport();
    setVoiceSupported(s.supported);

    speechRef.current = createSpeechController({
      lang: "it-IT",
      onText: (text) => {
        // Append dictated text as a NEW LINE (1 stop per line)
        setRawStops((prev) => {
          const trimmed = prev.trimEnd();
          const prefix = trimmed ? trimmed + "\n" : "";
          return prefix + text;
        });
      },
      onError: (msg) => setMessage(`Vocale: ${msg}`),
      onState: (isOn) => setListening(isOn),
    });

    return () => {
      try {
        speechRef.current?.stop();
      } catch {}
    };
  }, []);

  function toggleVoice() {
    setMessage(null);
    if (!speechRef.current?.supported) {
      setMessage("Riconoscimento vocale non supportato. Usa la dettatura della tastiera.");
      return;
    }
    if (listening) speechRef.current.stop();
    else speechRef.current.start();
  }

  async function onCreateRoute() {
    setMessage(null);

    if (!rawStops.trim()) {
      setMessage("Inserisci almeno 1 stop (uno per riga).");
      return;
    }

    if (flexMode && !warehouseAddress.trim()) {
      setMessage("Flex Mode attivo: inserisci indirizzo deposito (pickup/return).");
      return;
    }

    if (!finalStops.length) {
      setMessage("Impossibile creare rotta: controlla i dati.");
      return;
    }

    setLoading(true);
    try {
      const { routeId } = await createRouteWithStops(
        {
          name: name.trim() || "Turno",
          routeDate: routeDate || undefined,
        },
        finalStops
      );

      setMessage("Rotta creata ✅");
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
              <Button variant="ghost">Le mie rotte</Button>
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
            Inserisci stop (uno per riga)
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Flex Mode: Pickup AF #1, consegne AF #2..N, Return ultimo.
            Vocale: se supportato, detti e ogni frase diventa uno stop.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Stop</CardTitle>
              <Button
                variant={listening ? "secondary" : "outline"}
                onClick={toggleVoice}
                disabled={!voiceSupported && !listening}
                title={!voiceSupported ? "Non supportato: usa dettatura tastiera" : ""}
              >
                {listening ? "🎙️ In ascolto..." : "🎙️ Dettatura"}
              </Button>
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
                  Delivery: <span className="font-semibold">{baseStops.length}</span>
                  {flexMode && (
                    <>
                      {" "}
                      • Totale con Flex:{" "}
                      <span className="font-semibold">{finalStops.length}</span>
                    </>
                  )}
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
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={routeDate} onChange={(e) => setRouteDate(e.target.value)} />
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Flex Mode</span>
                  <input type="checkbox" checked={flexMode} onChange={(e) => setFlexMode(e.target.checked)} />
                </div>

                {flexMode && (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs text-neutral-600">Deposito (pickup/return)</label>
                    <Input value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-neutral-600">Aggiungi Return</span>
                      <input type="checkbox" checked={addReturn} onChange={(e) => setAddReturn(e.target.checked)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-3 text-xs text-neutral-600">
                Se il vocale non funziona, usa la dettatura della tastiera: è sempre affidabile.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
