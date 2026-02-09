// components/routepro/RouteMapLeaflet.tsx
"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";

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

function makeNumberIcon(n: number, isDone: boolean, isActive: boolean) {
  const bg = isActive ? "#111827" : isDone ? "#16a34a" : "#2563eb";
  const html = `
    <div style="
      width: 30px; height: 30px; border-radius: 9999px;
      background:${bg}; color:#fff; font-weight:700;
      display:flex; align-items:center; justify-content:center;
      border:2px solid #fff; box-shadow: 0 6px 14px rgba(0,0,0,.18);
      font-size: 13px;
    ">${n}</div>
  `;
  return L.divIcon({
    className: "",
    html,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

export default function RouteMapLeaflet({
  stops,
  onSelectStop,
  onNavigate,
}: {
  stops: MapStop[];
  onSelectStop?: (stopId: string) => void;
  onNavigate: (s: MapStop) => void;
}) {
  const center = useMemo(() => {
    if (stops.length) return [stops[0].lat, stops[0].lng] as [number, number];
    return [45.4642, 9.19] as [number, number];
  }, [stops]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-[65vh] w-full">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {stops.map((s) => {
            const label = s.opt ?? s.af;
            const icon = makeNumberIcon(label, s.isDone, s.isActive);

            return (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectStop?.(s.id),
                }}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-600">
                      <b>OPT #{s.opt}</b> (AF #{s.af}) {s.isDone ? "✅" : ""}
                      {s.isActive ? " • Corrente" : ""}
                    </div>
                    <div className="text-sm font-medium">{s.address}</div>

                    <Button className="w-full" onClick={() => onNavigate(s)}>
                      Naviga
                    </Button>

                    {onSelectStop && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => onSelectStop(s.id)}
                      >
                        Vai allo stop in lista
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="border-t p-3 text-xs text-neutral-600">
        Mappa OSM • Marker numerati stile Flex • Tap marker → dettagli / naviga.
      </div>
    </div>
  );
}
