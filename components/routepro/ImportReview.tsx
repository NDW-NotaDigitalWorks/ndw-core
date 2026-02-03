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
};

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  return i < 0 ? 0 : i;
}

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export function ImportReview(props: {
  stops: ReviewStop[];
  onChange: (next: ReviewStop[]) => void;
  onRemove: (stop_index: number) => void;
  onAdd: () => void;
}) {
  const stats = useMemo(() => {
    const errors: number[] = [];
    const warns: number[] = [];
    let totalPackages = 0;

    for (const s of props.stops) {
      const addrOk = normalizeText(s.address).length > 0;
      const cityOk = normalizeText(s.city ?? "").length > 0;

      if (!addrOk || !cityOk) errors.push(s.stop_index);
      else {
        if (s.packages == null) warns.push(s.stop_index);
      }

      totalPackages += s.packages ?? 0;
    }

    return {
      errors,
      warns,
      totalPackages,
    };
  }, [props.stops]);

  const hasBlockingErrors = stats.errors.length > 0;

  function updateStop(stop_index: number, patch: Partial<ReviewStop>) {
    const next = props.stops.map((s) =>
      s.stop_index === stop_index ? { ...s, ...patch } : s
    );
    props.onChange(next);
  }

  // ---- BULK ACTIONS ----
  function bulkSetPackagesToOneWhereNull() {
    const next = props.stops.map((s) =>
      s.packages == null ? { ...s, packages: 1 } : s
    );
    props.onChange(next);
  }

  function bulkClearWindows() {
    const next = props.stops.map((s) => ({ ...s, delivery_window: null }));
    props.onChange(next);
  }

  function bulkNormalizeCity() {
    // prende la city più frequente e la applica a quelle vuote
    const freq = new Map<string, number>();
    props.stops.forEach((s) => {
      const c = normalizeText(s.city ?? "");
      if (!c) return;
      freq.set(c, (freq.get(c) ?? 0) + 1);
    });

    let bestCity: string | null = null;
    let bestN = 0;
    for (const [c, n] of freq.entries()) {
      if (n > bestN) {
        bestN = n;
        bestCity = c;
      }
    }
    if (!bestCity) return;

    const next = props.stops.map((s) => {
      const c = normalizeText(s.city ?? "");
      return c ? s : { ...s, city: bestCity };
    });
    props.onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky summary + quick actions */}
      <div className="sticky top-2 z-20">
        <Card className="rounded-2xl border bg-white/95 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Revisione stop</div>
                <div className="mt-1 text-xs text-neutral-600">
                  Stop: <b>{props.stops.length}</b> • Pacchi totali:{" "}
                  <b>{stats.totalPackages}</b>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      stats.errors.length
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {stats.errors.length ? `⛔ ${stats.errors.length} errori` : "✅ nessun errore"}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      stats.warns.length
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600"
                    }`}
                  >
                    {stats.warns.length ? `⚠️ ${stats.warns.length} da verificare` : "⚠️ ok"}
                  </span>

                  {hasBlockingErrors && (
                    <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600">
                      Completa indirizzo + città per sbloccare “Crea rotta”
                    </span>
                  )}
                </div>
              </div>

              <Button variant="outline" onClick={props.onAdd}>
                + Aggiungi
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs"
                onClick={bulkSetPackagesToOneWhereNull}
              >
                Pacchi=1 (vuoti)
              </Button>
              <Button
                variant="outline"
                className="rounded-xl text-xs"
                onClick={bulkNormalizeCity}
              >
                Uniforma città
              </Button>
              <Button
                variant="outline"
                className="rounded-xl text-xs"
                onClick={bulkClearWindows}
              >
                Pulisci orari
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {props.stops.map((s) => {
          const addrOk = normalizeText(s.address).length > 0;
          const cityOk = normalizeText(s.city ?? "").length > 0;
          const hasError = !addrOk || !cityOk;
          const hasWarn = addrOk && cityOk && s.packages == null;

          return (
            <Card
              key={s.stop_index}
              className={`rounded-2xl ${
                hasError ? "border-red-200" : hasWarn ? "border-amber-200" : ""
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border bg-neutral-50 px-2 py-1 text-xs font-semibold">
                      #{s.stop_index}
                    </div>

                    {s.delivery_window ? (
                      <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-700">
                        ⏰ {s.delivery_window}
                      </span>
                    ) : null}

                    {hasError ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                        ⛔ Completa
                      </span>
                    ) : hasWarn ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                        ⚠️ Pacchi?
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                        ✅ OK
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => props.onRemove(s.stop_index)}
                  >
                    Elimina
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-neutral-600">
                      Indirizzo
                    </div>
                    <Input
                      value={s.address}
                      onChange={(e) =>
                        updateStop(s.stop_index, { address: e.target.value })
                      }
                      placeholder="Via ... 12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-neutral-600">
                        Città
                      </div>
                      <Input
                        value={s.city ?? ""}
                        onChange={(e) => {
                          const v = normalizeText(e.target.value);
                          updateStop(s.stop_index, { city: v.length ? v : null });
                        }}
                        placeholder="Giussano"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-[11px] font-medium text-neutral-600">
                        Pacchi
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-12 rounded-xl px-0"
                          onClick={() => {
                            const cur = s.packages ?? 0;
                            updateStop(s.stop_index, { packages: Math.max(0, cur - 1) });
                          }}
                        >
                          −
                        </Button>

                        <Input
                          inputMode="numeric"
                          value={s.packages ?? ""}
                          onChange={(e) => {
                            const n = clampInt(Number(e.target.value));
                            updateStop(s.stop_index, {
                              packages: e.target.value.trim() === "" ? null : n,
                            });
                          }}
                          placeholder="1"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-12 rounded-xl px-0"
                          onClick={() => {
                            const cur = s.packages ?? 0;
                            updateStop(s.stop_index, { packages: cur + 1 });
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  {hasError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Serve <b>indirizzo</b> e <b>città</b> per questo stop.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Spacer for sticky bottom CTA (the page will have pb) */}
      <div className="h-20" />
    </div>
  );
}
