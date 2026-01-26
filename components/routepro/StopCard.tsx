// components/routepro/StopCard.tsx
"use client";

import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { openNavigation } from "@/lib/routepro/navigation";

type StopCardProps = {
  afNumber: number;
  optNumber: number;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDone: boolean;
  isActive: boolean;
  onToggleDone: () => void;
};

export const StopCard = forwardRef<HTMLDivElement, StopCardProps>(
  ({ afNumber, optNumber, address, lat, lng, isDone, isActive, onToggleDone }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          "flex flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm",
          isActive ? "border-blue-600 ring-2 ring-blue-600/20" : "",
          isDone ? "opacity-70" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">AF #{afNumber}</span>
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
            OPT #{optNumber}
          </span>
        </div>

        <div className="text-sm font-medium leading-snug text-neutral-900">
          {address}
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => openNavigation({ lat, lng, address })}
          >
            Naviga
          </Button>

          <Button
            variant={isDone ? "secondary" : "outline"}
            className="min-w-[110px]"
            onClick={onToggleDone}
          >
            {isDone ? "Fatto ✅" : "Fatto"}
          </Button>
        </div>
      </div>
    );
  }
);

StopCard.displayName = "StopCard";
