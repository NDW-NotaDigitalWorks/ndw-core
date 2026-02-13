// components/routepro/StopCard.tsx
"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";

type StopType = "pickup" | "delivery" | "return";

type Props = {
  // sempre
  afNumber: number;
  optNumber: number;
  address: string;
  lat: number | null;
  lng: number | null;
  isDone: boolean;
  isActive: boolean;
  onToggleDone: () => void;

  // opzionali (per ripristinare UI â€œriccaâ€)
  packages?: number | null;
  stopType?: StopType | string | null;
  timeWindow?: string | null;        // es. "08:30 - 17:30"
  titleLine?: string | null;         // es. "Asem S.r.l." / nome destinatario
  note?: string | null;              // note aggiuntive
  showCoords?: boolean;              // default false (risparmia spazio)
};

function stopTypeLabel(t?: string | null): string | null {
  if (!t) return null;
  if (t === "pickup") return "Ritiro";
  if (t === "delivery") return "Consegna";
  if (t === "return") return "Rientro";
  return t; // fallback se arriva altro
}

const StopCard = forwardRef<HTMLDivElement, Props>(function StopCard(
  {
    afNumber,
    optNumber,
    address,
    lat,
    lng,
    isDone,
    isActive,
    packages = null,
    stopType = null,
    timeWindow = null,
    titleLine = null,
    note = null,
    showCoords = false,
    onToggleDone,
  },
  ref
) {
  const typeLabel = stopTypeLabel(stopType);

  return (
    <div
      ref={ref}
      className={[
        "rounded-2xl border bg-white p-3 shadow-sm",
        isActive ? "border-blue-300 ring-2 ring-blue-100" : "border-neutral-200",
        isDone ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Riga top: numeri + tipo + finestra */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
            <span>
              AF <b>#{afNumber}</b> â€¢ OPT <b>#{optNumber}</b>
            </span>

            {typeLabel && (
              <span className="rounded-full border bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-700">
                {typeLabel}
              </span>
            )}

            {timeWindow && (
              <span className="text-[11px] text-neutral-500">
                {timeWindow}
              </span>
            )}
          </div>

          {/* Riga â€œtitoloâ€ (azienda/nome) */}
          {titleLine && (
            <div className="mt-1 text-sm font-semibold text-neutral-900 break-words">
              {titleLine}
            </div>
          )}

          {/* Indirizzo */}
          <div className={[titleLine ? "mt-0.5" : "mt-1", "text-sm text-neutral-900 break-words"].join(" ")}>
            {address}
          </div>

          {/* Note */}
          {note && (
            <div className="mt-1 text-xs text-neutral-600 break-words">
              {note}
            </div>
          )}

          {/* Pacchi */}
          {packages != null && (
            <div className="mt-2 inline-flex items-center rounded-full border bg-neutral-50 px-2 py-1 text-xs text-neutral-700">
              ðŸ“¦ <b className="mx-1">{packages}</b> {packages === 1 ? "pacco" : "pacchi"}
            </div>
          )}

          {/* coords (off di default: spazio) */}
          {showCoords && lat != null && lng != null && (
            <div className="mt-1 text-[11px] text-neutral-400">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}
        </div>

        <Button
          variant={isDone ? "secondary" : "outline"}
          onClick={onToggleDone}
          className="shrink-0"
          type="button"
        >
          {isDone ? "Fatto" : "Done"}
        </Button>
      </div>
    </div>
  );
});


export default StopCard;
