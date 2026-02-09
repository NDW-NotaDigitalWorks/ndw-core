// components/routepro/RouteMap.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { openNavigation } from "@/lib/routepro/navigation";

export type MapStop = {
  id: string;
  af: number;
  opt: number;
  address: string;
  lat: number;
  lng: number;
  isDone: boolean;
  isActive: boolean;
};

function makeNumberIcon(n: number, opts: { active?: boolean; done?: boolean }) {
  const active = Boolean(opts.active);
  const done = Boolean(opts.done);

  const bg = active ? "#111827" : done ? "#16a34a" : "#ffffff";
  const fg = active || done ? "#ffffff" : "#111827";
  const border = active ? "#111827" : "#e5e7eb";

  const html = `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:13px;
      background:${bg};
      color:${fg};
      border:2px solid ${border};
      box-shadow: 0 8px 20px rgba(0,0,0,.18);
      transform: translate3d(0,0,0);
      ">
      ${n}
    </div>
  `;

  return L.divIcon({
    html,
    className: "ndw-marker-number",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function FitBounds({ stops }: { stops: MapStop[] }) {
  const map = useMap();

  useEffect(() => {
    if (!stops.length) return;

    // Fit bounds come Flex (tutti i punti dentro)
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30] });

    // Importantissimo in mobile: la mappa spesso ha size 0 al primo render
    setTimeout(() => map.invalidateSize(), 50);
  }, [map, stops]);

  return null;
}

export function RouteMap({
  stops,
  onSelectStop,
}: {
  stops: MapStop[];
  onSelectStop?: (id: string) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);

  const coordsStops = useMemo(
    () => stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)),
    [stops]
  );

  const center = useMemo<[number, number]>(() => {
    if (coordsStops.length) return [coordsStops[0].lat, coordsStops[0].lng];
    return [45.4642, 9.19]; // fallback Milano
  }, [coordsStops]);

  if (!coordsStops.length) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-700">
        Nessuna coordinata disponibile per la mappa.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-[65vh] w-full">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          whenReady={(e) => {
            mapRef.current = e.target;
            setTimeout(() => mapRef.current?.invalidateSize(), 50);
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds stops={coordsStops} />

          {coordsStops.map((s) => {
            const icon = makeNumberIcon(s.opt, { active: s.isActive, done: s.isDone });

            return (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    // comportamento tipo Flex: tap marker -> torna lista e scrolla
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

                    <div className="grid gap-2">
                      <Button
                        className="w-full"
                        type="button"
                        onClick={() => onSelectStop?.(s.id)}
                        variant="outline"
                      >
                        Vai alla lista
                      </Button>

                      <Button
                        className="w-full"
                        type="button"
                        onClick={() =>
                          openNavigation({ lat: s.lat, lng: s.lng, address: s.address })
                        }
                      >
                        Naviga
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="border-t p-3 text-xs text-neutral-600">
        Mappa OSM • Marker numerati (OPT) • Tap marker = lista + scroll.
      </div>
    </div>
  );
}
