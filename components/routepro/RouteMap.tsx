"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap } from "leaflet";

// React-Leaflet dynamic (evita SSR issues)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function RouteMap({ stops, onSelectStop }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pointsAll = useMemo(() => stops.map((s) => [s.lat, s.lng] as [number, number]), [stops]);

  const nextStop = useMemo(() => {
    return stops.find((s) => !s.isDone) ?? null;
  }, [stops]);

  const pointsRemaining = useMemo(() => {
    if (!nextStop) return [];
    const idx = stops.findIndex((s) => s.id === nextStop.id);
    if (idx < 0) return [];
    return stops.slice(idx).map((s) => [s.lat, s.lng] as [number, number]);
  }, [stops, nextStop]);

  const done = useMemo(() => stops.filter((s) => s.isDone).length, [stops]);
  const total = stops.length;
  const remaining = total - done;

  // Fit bounds all'inizio e quando cambia lista (con import dinamico di leaflet)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pointsAll.length === 1) {
      map.setView(pointsAll[0], 14);
      return;
    }
    if (pointsAll.length < 2) return;

    let cancelled = false;

    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled) return;
        const bounds = L.latLngBounds(pointsAll);
        map.fitBounds(bounds, { padding: [24, 24] });
      } catch {
        // silenzioso
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pointsAll]);

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
        isFullscreen ? "fixed inset-0 z-50 bg-white" : "rounded-2xl border bg-white overflow-hidden"
      }
      style={isFullscreen ? undefined : { height: 520 }}
    >
      {/* TOP OVERLAY (Flex-like) */}
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

      {/* MAP */}
      <MapContainer
        center={pointsAll[0] ?? [45.5, 9.2]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <MapRefBinder mapRef={mapRef} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Polyline “tutto” */}
        {pointsAll.length >= 2 && <Polyline positions={pointsAll} />}

        {/* Polyline “rimanente” */}
        {pointsRemaining.length >= 2 && <Polyline positions={pointsRemaining} />}

        {stops.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            eventHandlers={{
              click: () => onSelectStop?.(s.id),
            }}
          >
            <Popup>
              <div className="text-sm font-semibold">
                OPT #{s.opt} • AF #{s.af}
              </div>
              <div className="text-xs text-neutral-700">{s.address}</div>
              <div className="mt-1 text-xs">{s.isDone ? "✅ Fatto" : "⏳ Da fare"}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function MapRefBinder({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  // Import dinamico "safe": evita SSR e non rompe i types
  const UseMapBinder = useMemo(() => {
    return dynamic(async () => {
      const mod = await import("react-leaflet");
      const useMap = mod.useMap as unknown as () => LeafletMap;

      return function Binder() {
        const map = useMap();
        useEffect(() => {
          mapRef.current = map;
        }, [map]);
        return null;
      };
    }, { ssr: false });
  }, [mapRef]);

  return <UseMapBinder />;
}
