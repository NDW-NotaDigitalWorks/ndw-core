// components/routepro/RouteMap.tsx
"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  onSelectStop: (id: string) => void;
};

// FIX icone default (Next/Vercel spesso rompe i path)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Marker numerato stile “Flex”
function NumberedMarkerIcon(label: string, active: boolean) {
  return L.divIcon({
    className: "ndw-marker",
    html: `
      <div style="
        width: 34px; height: 34px;
        border-radius: 9999px;
        border: 2px solid ${active ? "#111827" : "#0f172a"};
        background: ${active ? "#111827" : "#ffffff"};
        color: ${active ? "#ffffff" : "#111827"};
        display:flex; align-items:center; justify-content:center;
        font-weight: 700; font-size: 12px;
        box-shadow: 0 6px 16px rgba(0,0,0,.15);
      ">
        ${label}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

// Componente helper: prende la map instance correttamente (senza whenReady(e))
function MapAutoFit({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points as any);
    map.fitBounds(bounds, { padding: [24, 24] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points.length]);

  return null;
}

export function RouteMap({ stops, onSelectStop }: Props) {
  const points = useMemo(
    () => stops.map((s) => [s.lat, s.lng] as LatLngExpression),
    [stops]
  );

  if (!stops.length) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-700">
        Nessuno stop con coordinate da mostrare.
      </div>
    );
  }

  const center: LatLngExpression = points[0];

  return (
    <div className="h-[70vh] overflow-hidden rounded-2xl border bg-white">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <MapAutoFit points={points} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stops.map((s) => {
          // Label: preferisci OPT, ma puoi scegliere AF se vuoi
          const label = String(s.opt ?? s.af);
          const icon = NumberedMarkerIcon(label, s.isActive);

          return (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectStop(s.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -26]} opacity={1} permanent={false}>
                <div className="text-xs">
                  <div className="font-semibold">
                    OPT #{s.opt} • AF #{s.af}
                  </div>
                  <div className="text-[11px] text-neutral-600">{s.address}</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
