// components/routepro/StopCard.tsx
"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  afNumber: number;
  optNumber: number;
  address: string;
  lat: number | null;
  lng: number | null;
  isDone: boolean;
  isActive: boolean;
  packages?: number | null; // ✅ NEW
  onToggleDone: () => void;
};

export const StopCard = forwardRef<HTMLDivElement, Props>(function StopCard(
  { afNumber, optNumber, address, lat, lng, isDone, isActive, packages = null, onToggleDone },
  ref
) {
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
          <div className="text-xs text-neutral-500">
            AF <b>#{afNumber}</b> • OPT <b>#{optNumber}</b>
          </div>

          <div className="mt-1 text-sm font-medium text-neutral-900 break-words">
            {address}
          </div>

          {/* ✅ PACCHI */}
          {packages != null && (
            <div className="mt-2 inline-flex items-center rounded-full border bg-neutral-50 px-2 py-1 text-xs text-neutral-700">
              📦 <b className="mx-1">{packages}</b> {packages === 1 ? "pacco" : "pacchi"}
            </div>
          )}

          {/* coords (optional tiny hint) */}
          {(lat != null && lng != null) && (
            <div className="mt-1 text-[11px] text-neutral-400">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          )}
        </div>

        <Button
          variant={isDone ? "secondary" : "outline"}
          onClick={onToggleDone}
          className="shrink-0"
        >
          {isDone ? "Fatto" : "Done"}
        </Button>
      </div>
    </div>
  );
});
