"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ReviewStop = {
  stop_index: number;
  address: string;
  city: string | null;
  packages: number | null;
  delivery_window: string | null;
};

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

type Props = {
  stops: ReviewStop[];
  onChange: (next: ReviewStop[]) => void;
  onRemove: (stopIndex: number) => void;
  onAdd: () => void;
};

export function ImportReview({ stops, onChange, onRemove, onAdd }: Props) {
  const { errors, warns } = useMemo(() => {
    let e = 0;
    let w = 0;
    for (const s of stops) {
      const addrOk = normalize(s.address).length > 0;
      const cityOk = normalize(s.city ?? "").length > 0;
      if (!addrOk || !cityOk) e++;
      else if (s.packages == null) w++;
    }
    return { errors: e, warns: w };
  }, [stops]);

  function updateStop(stopIndex: number, patch: Partial<ReviewStop>) {
    const next = stops.map((s) => (s.stop_index === stopIndex ? { ...s, ...patch } : s));
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {/* STICKY MINI HEADER (non ruba spazio) */}
      <div className="sticky top-2 z-10 rounded-2xl border bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Revisione stop</div>
            <div className="mt-0.5 text-[11px] text-neutral-500">
              <span>
                Stop: <b>{stops.length}</b>
              </span>
              <span className="mx-1">•</span>
              <span>
                Errori: <b className={errors > 0 ? "text-red-600" : ""}>{errors}</b>
              </span>
              <span className="mx-1">•</span>
              <span>
                Da verificare: <b className={warns > 0 ? "text-amber-700" : ""}>{warns}</b>
              </span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onAdd} className="shrink-0">
            + Stop
          </Button>
        </div>

        {errors > 0 && (
          <div className="mt-1 text-[11px] text-red-700">
            Completa <b>indirizzo</b> + <b>città</b> negli stop in rosso.
          </div>
        )}
      </div>

      {/* LISTA (massimo spazio utile) */}
      <div className="space-y-2">
        {stops.map((s) => {
          const addrOk = normalize(s.address).length > 0;
          const cityOk = normalize(s.city ?? "").length > 0;
          const isError = !addrOk || !cityOk;

          return (
            <Card
              key={s.stop_index}
              className={[
                "rounded-2xl",
                isError ? "border-red-300 bg-red-50/40" : "border-neutral-200",
              ].join(" ")}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-500">
                    Stop <b>#{s.stop_index}</b>
                    {s.delivery_window ? (
                      <span className="ml-2 rounded-full border bg-white px-2 py-0.5 text-[10px] text-neutral-600">
                        {s.delivery_window}
                      </span>
                    ) : null}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(s.stop_index)}
                    className="shrink-0"
                  >
                    ✕
                  </Button>
                </div>

                {/* Indirizzo */}
                <div className="mt-2">
                  <div className="mb-1 text-[11px] font-medium text-neutral-600">Indirizzo</div>
                  <Input
                    value={s.address}
                    onChange={(e) => updateStop(s.stop_index, { address: e.target.value })}
                    placeholder="Es. Via Lecco 12 / Azienda..."
                  />
                </div>

                {/* Città + Pacchi */}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <div className="mb-1 text-[11px] font-medium text-neutral-600">Città</div>
                    <Input
                      value={s.city ?? ""}
                      onChange={(e) => updateStop(s.stop_index, { city: e.target.value || null })}
                      placeholder="Es. Giussano"
                    />
                  </div>

                  <div className="col-span-1">
                    <div className="mb-1 text-[11px] font-medium text-neutral-600">Pacchi</div>
                    <Input
                      inputMode="numeric"
                      value={s.packages ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (!raw) return updateStop(s.stop_index, { packages: null });
                        const n = Number(raw);
                        const p = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
                        updateStop(s.stop_index, { packages: p });
                      }}
                      placeholder="—"
                    />
                  </div>
                </div>

                {isError && (
                  <div className="mt-2 text-[11px] text-red-700">
                    Serve <b>indirizzo</b> + <b>città</b>.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-[11px] text-neutral-500">
        Tip: ignora “Posizioni / numeri / simboli” dell’OCR: correggi solo indirizzo e città.
      </div>
    </div>
  );
}
