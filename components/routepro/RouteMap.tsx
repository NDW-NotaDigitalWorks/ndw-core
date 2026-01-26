// components/routepro/RouteMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
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

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function RouteMap({ stops }: { stops: MapStop[] }) {
  const coordsStops = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const center = coordsStops.length
    ? ([coordsStops[0].lat, coordsStops[0].lng] as [number, number])
    : ([45.4642, 9.19] as [number, number]); // fallback Milano

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="h-[65vh] w-full">
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {coordsStops.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={markerIcon}>
              <Popup>
                <div className="space-y-2">
                  <div className="text-xs text-neutral-600">
                    <b>OPT #{s.opt}</b> (AF #{s.af}) {s.isDone ? "✅" : ""}
                    {s.isActive ? " • Corrente" : ""}
                  </div>
                  <div className="text-sm font-medium">{s.address}</div>
                  <Button
                    className="w-full"
                    onClick={() => openNavigation({ lat: s.lat, lng: s.lng, address: s.address })}
                  >
                    Naviga
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="border-t p-3 text-xs text-neutral-600">
        Mappa OSM • Marker: tap per dettagli e navigazione.
      </div>
    </div>
  );
}
