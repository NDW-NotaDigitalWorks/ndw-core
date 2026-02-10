"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap } from "leaflet";

type MapStop = {
  id: string;
  af: number; // numero Amazon Flex (o fallback)
  opt: number; // numero ottimizzato
  address: string;
  lat: number;
  lng: number;
  isDone: boolean;
  isActive: boolean;
};

type Props = {
  stops: MapStop[];
  onSelectStop?: (id: string) => void;
};

// React-Leaflet dynamic (evita SSR issues)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function RouteMap({ stops, onSelectStop }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pointsAll = useMemo(
    () => stops.map((s) => [s.lat, s.lng] as [number, number]),
    [stops]
  );

  const nextStop = useMemo(() => stops.find((s) => !s.isDone) ?? null, [stops]);

  const pointsRemaining = useMemo(() => {
    if (!nextStop) return [];
    const idx = stops.findIndex((s) => s.id === nextStop.id);
    if (idx < 0) return [];
    return stops.slice(idx).map((s) => [s.lat, s.lng] as [number, number]);
  }, [stops, nextStop]);

  const done = useMemo(() => stops.filter((s) => s.isDone).length, [stops]);
  const total = stops.length;
  const remaining = total - done;

  // fit bounds quando cambia la lista
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pointsAll.length < 2) {
      if (pointsAll.length === 1) map.setView(pointsAll[0], 14);
      return;
    }

    const L = require("leaflet");
    const bounds = L.latLngBounds(pointsAll);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [pointsAll.length]);

  // invalidateSize quando toggli fullscreen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  function centerOnNext() {
    if (!nextStop) return;
    const map = mapRef.current;
    if (!map) return;
    map.setView([nextStop.lat, nextStop.lng], clamp(map.getZoom(), 13, 17), { animate: true });
    onSelectStop?.(nextStop.id);
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-white"
          : "rounded-2xl border bg-white overflow-hidden"
      }
      style={isFullscreen ? undefined : { height: 520 }}
    >
      {/* TOP OVERLAY */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[500] p-3">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <div className="rounded-2xl border bg-white/95 px-3 py-2 shadow-sm">
            <div className="text-xs text-neutral-500">Mappa</div>
            <div className="text-sm font-semibold">
              {done}/{total} fatte • {remaining} rimanenti
            </div>
            {nextStop && (
              <div className="mt-1 text-[11px] text-neutral-600">
                Prossimo: <b>OPT #{nextStop.opt}</b> (AF #{nextStop.af})
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={centerOnNext}
              className="rounded-2xl border bg-white/95 px-3 py-2 text-sm shadow-sm disabled:opacity-50"
              disabled={!nextStop}
            >
              Prossimo
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              className="rounded-2xl border bg-white/95 px-3 py-2 text-sm shadow-sm"
            >
              {isFullscreen ? "Esci" : "⛶ Guida"}
            </button>
          </div>
        </div>
      </div>

      <MapContainer center={pointsAll[0] ?? [45.5, 9.2]} zoom={12} style={{ height: "100%", width: "100%" }}>
        <MapRefBinder mapRef={mapRef} />

        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Polyline “totale” (sottile tratteggiata) */}
        {pointsAll.length >= 2 && (
          <Polyline
            positions={pointsAll}
            pathOptions={{ weight: 3, dashArray: "6 8", opacity: 0.45 }}
          />
        )}

        {/* Polyline “rimanente” (più evidente) */}
        {pointsRemaining.length >= 2 && (
          <Polyline
            positions={pointsRemaining}
            pathOptions={{ weight: 6, opacity: 0.9 }}
          />
        )}

        {/* Pallini numerati (no marker Leaflet, quindi niente “Mark”) */}
        {stops.map((s) => {
          const isNext = nextStop?.id === s.id;
          const radius = s.isActive ? 10 : isNext ? 9 : 7;

          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={radius}
              pathOptions={{
                weight: s.isActive ? 3 : 2,
                opacity: s.isDone ? 0.5 : 0.95,
                fillOpacity: s.isDone ? 0.25 : 0.8,
              }}
              eventHandlers={{
                click: () => onSelectStop?.(s.id),
              }}
            >
              <Tooltip direction="center" permanent opacity={1}>
                <div className="text-[11px] font-semibold">{s.opt}</div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// helper per ottenere la map instance in modo stabile
function MapRefBinder({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const useMap = require("react-leaflet").useMap as () => LeafletMap;
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}
