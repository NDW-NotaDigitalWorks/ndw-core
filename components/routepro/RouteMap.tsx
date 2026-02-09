"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { openNavigation } from "@/lib/routepro/navigation";

// ✅ dynamic import (no SSR) per react-leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

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
  onSelectStop?: (stopId: string) => void; // ✅ tap marker -> list + scroll
};

function makeNumberedIcon(opt: number, isActive: boolean, isDone: boolean) {
  const ring = isActive ? "3px solid #60a5fa" : "1px solid rgba(0,0,0,.25)";
  const bg = isDone ? "#e5e7eb" : "#111827"; // done = grigio, else nero
  const fg = isDone ? "#111827" : "#ffffff";

  // DivIcon: numero dentro un badge rotondo
  return L.divIcon({
    className: "ndw-marker",
    html: `
      <div style="
        width: 34px; height: 34px;
        border-radius: 9999px;
        display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size: 13px;
        color:${fg}; background:${bg};
        box-shadow: 0 6px 18px rgba(0,0,0,.18);
        border:${ring};
      ">
        ${opt}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

export function RouteMap({ stops, onSelectStop }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const coordsStops = useMemo(
    () => stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)),
    [stops]
  );

  const center = useMemo(() => {
    return coordsStops.length
      ? ([coordsStops[0].lat, coordsStops[0].lng] as [number, number])
      : ([45.4642, 9.19] as [number, number]); // fallback Milano
  }, [coordsStops]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-700">
        Caricamento mappa…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-[65vh] w-full">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {coordsStops.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={makeNumberedIcon(s.opt, s.isActive, s.isDone)}
              eventHandlers={{
                click: () => {
                  // ✅ stile Flex: tap marker -> seleziona stop (poi la pagina torna in lista)
                  onSelectStop?.(s.id);
                },
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div className="text-xs text-neutral-600">
                    <b>OPT #{s.opt}</b> (AF #{s.af}) {s.isDone ? "✅" : ""}
                    {s.isActive ? " • Corrente" : ""}
                  </div>

                  <div className="text-sm font-medium">{s.address}</div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() =>
                        openNavigation({ lat: s.lat, lng: s.lng, address: s.address })
                      }
                      type="button"
                    >
                      Naviga
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onSelectStop?.(s.id)}
                      type="button"
                    >
                      Vai alla card
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="border-t p-3 text-xs text-neutral-600">
        Mappa OSM • Marker numerati (OPT) • Tap marker = torna alla lista.
      </div>
    </div>
  );
}
