// components/routepro/RouteMap.tsx
"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { openNavigation } from "@/lib/routepro/navigation";

type MapStop = {
  id: string;
  af: number;
  opt: number;
  address: string;
  lat: number;
  lng: number;
  isDone: boolean;
  isActive: boolean;
};

type Props = {
  stops: MapStop[];
  onSelectStop?: (stopId: string) => void; // ✅ click marker → seleziona stop in lista
};

const LeafletMap = dynamic(() => import("./RouteMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex h-[65vh] w-full items-center justify-center text-sm text-neutral-500">
        Caricamento mappa…
      </div>
      <div className="border-t p-3 text-xs text-neutral-600">Mappa OSM</div>
    </div>
  ),
});

export function RouteMap({ stops, onSelectStop }: Props) {
  const coordsStops = useMemo(
    () => stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)),
    [stops]
  );

  return (
    <LeafletMap
      stops={coordsStops}
      onSelectStop={onSelectStop}
      onNavigate={(s) => openNavigation({ lat: s.lat, lng: s.lng, address: s.address })}
    />
  );
}
