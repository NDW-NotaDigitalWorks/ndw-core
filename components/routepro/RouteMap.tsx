"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap, DivIcon } from "leaflet";

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
  onSelectStop?: (id: string) => void;
};

// React-Leaflet dynamic (evita SSR issues)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asLatLngs(stops: MapStop[]) {
  return stops.map((s) => [s.lat, s.lng] as [number, number]);
}

// Piccole icone HTML (stile “pallino”)
// Usiamo divIcon (leaflet) solo a runtime, quindi lo carichiamo con require dentro useMemo.
function buildDotIcon(
  kind: "pickup" | "return" | "delivery",
  label: string,
  active: boolean,
  done: boolean
): DivIcon | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet");

    const text = kind === "pickup" ? "📦" : kind === "return" ? "↩️" : label;

    const bg = done ? "#F3F4F6" : "#FFFFFF";          // grigino se fatto
    const fg = done ? "#6B7280" : "#111827";          // testo grigio se fatto
    const border = active ? "2px solid #111827" : "1px solid #D1D5DB";
    const shadow = active
      ? "0 2px 10px rgba(0,0,0,.25)"
      : "0 1px 4px rgba(0,0,0,.15)";
    const scale = active ? "scale(1.15)" : "scale(1)";

    const html = `
      <div style="
        width:28px;height:28px;border-radius:9999px;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:700;
        background:${bg};color:${fg};
        border:${border};
        box-shadow:${shadow};
        transform:${scale};
      ">
        ${text}
      </div>
    `;

    return L.divIcon({
      className: "ndw-dot-wrap",
      html,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -12],
    });
  } catch {
    return null;
  }
}


export function RouteMap({ stops, onSelectStop }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Guess tipo stop dalla stringa (per non toccare DB)
  const getKind = (address: string): "pickup" | "return" | "delivery" => {
    const a = address.trim();
    if (a.startsWith("📦")) return "pickup";
    if (a.startsWith("↩️")) return "return";
    return "delivery";
  };

  const pointsAll = useMemo(() => asLatLngs(stops), [stops]);

  const nextStop = useMemo(() => stops.find((s) => !s.isDone) ?? null, [stops]);

  const pointsRemaining = useMemo(() => {
    if (!nextStop) return [];
    const idx = stops.findIndex((s) => s.id === nextStop.id);
    if (idx < 0) return [];
    return asLatLngs(stops.slice(idx));
  }, [stops, nextStop]);

  const done = useMemo(() => stops.filter((s) => s.isDone).length, [stops]);
  const total = stops.length;
  const remaining = total - done;

  // Icone memoizzate (1 per marker)
  const markerIcons = useMemo(() => {
    return stops.map((s) => {
      const kind = getKind(s.address);
      const label = String(s.opt);
      return buildDotIcon(kind, label, s.isActive, s.isDone);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.map((s) => `${s.id}:${s.isActive}:${s.isDone}:${s.opt}:${s.address}`).join("|")]);

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
      {/* CSS locale per pallini */}
      <style>{`
        .ndw-dot-wrap { background: transparent !important; border: none !important; }
        .ndw-dot{
          width:28px;height:28px;border-radius:9999px;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;
          box-shadow: 0 1px 4px rgba(0,0,0,.15);
        }
      `}</style>

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
              className="rounded-2xl border bg-white/95 px-3 py-2 text-sm shadow-sm"
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

      <MapContainer
        center={pointsAll[0] ?? [45.5, 9.2]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <MapBinder
          mapRef={mapRef}
          isFullscreen={isFullscreen}
          pointsAll={pointsAll}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Polyline “tutto” (sottile) */}
        {pointsAll.length >= 2 && (
          <Polyline positions={pointsAll} pathOptions={{ weight: 3, opacity: 0.35 }} />
        )}

        {/* Polyline “rimanente” (più evidente) */}
        {pointsRemaining.length >= 2 && (
          <Polyline positions={pointsRemaining} pathOptions={{ weight: 5, opacity: 0.8 }} />
        )}

        {stops.map((s, i) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            // se icon null, leaflet mette default, ma ormai “Mark” lo riduci molto
            icon={markerIcons[i] ?? undefined}
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

function MapBinder({
  mapRef,
  isFullscreen,
  pointsAll,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
  isFullscreen: boolean;
  pointsAll: Array<[number, number]>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const useMap = require("react-leaflet").useMap as () => LeafletMap;
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    (window as any).__reactLeaflet_map = map;
  }, [map, mapRef]);

  // fit bounds quando cambiano i punti
  useEffect(() => {
    if (!map) return;
    if (pointsAll.length < 2) {
      if (pointsAll.length === 1) map.setView(pointsAll[0], 14);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const L = require("leaflet");
      const bounds = L.latLngBounds(pointsAll);
      map.fitBounds(bounds, { padding: [24, 24] });
    } catch {
      // no-op
    }
  }, [map, pointsAll]);

  // invalidateSize quando toggli fullscreen
  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => clearTimeout(t);
  }, [map, isFullscreen]);

  return null;
}
