// components/routepro/ImportReview.tsx
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type ReviewStop = {
  stop_index: number;
  address: string;
  city: string | null;
  packages: number | null;
  delivery_window: string | null;
  stop_kind: "delivery" | "pickup";
};

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

type Props = {
  stops: ReviewStop[];
  onChange: (next: ReviewStop[]) => void;
  onBackToText: () => void;
};

export function ImportReview({ stops, onChange, onBackToText }: Props) {
  const counts = useMemo(() => {
    let errors = 0;
    let warns = 0;

    for (const s of stops) {
      const addrOk = normalizeText(s.address).length > 0;
      const cityOk = normalizeText(s.city ?? "").length > 0;
      if (!addrOk || !cityOk) errors++;
      else if (s.packages == null) warns++;
    }
    return { errors, warns };
  }, [stops]);

  function setField(i: number, patch: Partial<ReviewStop>) {
    const next = stops.map((s) => (s.stop_index === i ? { ...s, ...patch } : s));
    onChange(next);
  }

  function removeStop(i: number) {
    const next = stops
      .filter((s) => s.stop_index !== i)
      .map((s, idx) => ({ ...s, stop_index: idx + 1 }));
    onChange(next);
  }

  function addStop() {
    const next = [
      ...stops,
      {
        stop_index: stops.length + 1,
        address: "",
        city: null,
        packages: null,
        delivery_window: null,
        stop_kind: "delivery",
      } as ReviewStop,
    ];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header interno compatto */}
      <Card className="rounded-2xl">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Revisione stop</div>
              <div className="text-[11px] text-neutral-600">
                Stop <b>{stops.length}</b> • Errori <b>{counts.errors}</b> • Da verificare <b>{counts.warns}</b>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onBackToText}>
                ← Testo
              </Button>
              <Button onClick={addStop}>+ Stop</Button>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-neutral-500">
            Suggerimento: controlla città e civico. “Pacchi” può restare vuoto se non lo sai.
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {stops.map((s) => {
          const addrOk = normalizeText(s.address).length > 0;
          const cityOk = normalizeText(s.city ?? "").length > 0;
          const hasError = !addrOk || !cityOk;

          return (
            <Card key={s.stop_index} className={`rounded-2xl ${hasError ? "border-red-300" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-neutral-700">
                    Stop #{s.stop_index}{" "}
                    {s.stop_kind === "pickup" && (
                      <span className="ml-2 rounded-full border px-2 py-0.5 text-[11px] text-neutral-600">
                        pickup
                      </span>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => removeStop(s.stop_index)}>
                    Elimina
                  </Button>
                </div>

                <div className="mt-2 grid gap-2">
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-neutral-600">Indirizzo</div>
                    <Input
                      value={s.address}
                      onChange={(e) => setField(s.stop_index, { address: e.target.value })}
                      placeholder="Via + civico + eventuale nome azienda"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-neutral-600">Città</div>
                      <Input
                        value={s.city ?? ""}
                        onChange={(e) => setField(s.stop_index, { city: e.target.value || null })}
                        placeholder="Es. Giussano"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-[11px] font-medium text-neutral-600">Pacchi</div>
                      <Input
                        inputMode="numeric"
                        value={s.packages == null ? "" : String(s.packages)}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          const n = v === "" ? null : Number(v);
                          setField(s.stop_index, { packages: Number.isFinite(n as any) ? (n as any) : null });
                        }}
                        placeholder="Es. 1"
                      />
                    </div>
                  </div>

                  {s.delivery_window && (
                    <div className="text-[11px] text-neutral-500">
                      Finestra: <b>{s.delivery_window}</b>
                    </div>
                  )}

                  {hasError && (
                    <div className="rounded-xl border bg-red-50 px-3 py-2 text-xs text-red-700">
                      Completa <b>indirizzo</b> e <b>città</b> per questo stop.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
