// 📁 components/routepro/RouteMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Fix per icone Leaflet in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Marker personalizzati per tipo stop
const getMarkerIcon = (type: string, isCompleted?: boolean) => {
  const colors = {
    pickup: '#10b981', // verde
    delivery: '#3b82f6', // blu
    return: '#8b5cf6', // viola
  };
  
  const color = isCompleted ? '#9ca3af' : colors[type as keyof typeof colors] || '#3b82f6';
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${isCompleted ? '28px' : '32px'};
        height: ${isCompleted ? '28px' : '32px'};
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: ${isCompleted ? '0.7' : '1'};
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: ${isCompleted ? '12px' : '14px'};
          font-weight: bold;
        ">
          ${type === 'pickup' ? 'P' : type === 'delivery' ? 'D' : 'R'}
        </span>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Componente per fit bounds automatico
function FitBounds({ stops }: { stops: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (stops.length > 0) {
      const validStops = stops.filter(s => s.lat && s.lng);
      if (validStops.length > 0) {
        const bounds = L.latLngBounds(validStops.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [stops, map]);
  
  return null;
}

interface RouteMapProps {
  stops: Array<{
    id: string;
    stop_index: number;
    address: string;
    lat: number;
    lng: number;
    stop_type: 'pickup' | 'delivery' | 'return';
    notes?: string;
    is_completed?: boolean;
    time_window_start?: string;
    time_window_end?: string;
  }>;
  optimizedRoute?: Array<[number, number]>;
  onStopClick?: (stopId: string) => void;
  height?: string;
  showClusters?: boolean;
}

export default function RouteMap({ 
  stops, 
  optimizedRoute, 
  onStopClick,
  height = '500px',
  showClusters = true 
}: RouteMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const validStops = stops.filter(s => s.lat && s.lng);
  const hasValidStops = validStops.length > 0;
  
  // Centro mappa di default (Italia)
  const defaultCenter: [number, number] = [41.9028, 12.4964];
  
  // Converti percorso per Polyline
  const routeCoordinates = optimizedRoute?.map(coord => [coord[1], coord[0]] as [number, number]) || [];

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      {!hasValidStops && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10 rounded-lg">
          <p className="text-gray-500">Nessuna fermata con coordinate valide</p>
        </div>
      )}
      
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        zoomControl={false}
        whenReady={() => setMapReady(true)}
      >
        <ZoomControl position="bottomright" />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mapReady && hasValidStops && (
          <>
            <FitBounds stops={validStops} />
            
            {/* Polyline percorso ottimizzato */}
            {routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color="#3b82f6"
                weight={5}
                opacity={0.8}
                smoothFactor={1}
                dashArray={optimizedRoute ? undefined : '5, 10'}
              />
            )}
            
            {/* Marker stops */}
            {showClusters ? (
              <MarkerClusterGroup
                chunkedLoading
                spiderfyDistanceMultiplier={2}
                polygonOptions={{
                  fillColor: '#3b82f6',
                  color: '#1e3a8a',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.5,
                }}
              >
                {validStops.map((stop) => (
                  <Marker
                    key={stop.id}
                    position={[stop.lat, stop.lng]}
                    icon={getMarkerIcon(stop.stop_type, stop.is_completed)}
                    eventHandlers={{
                      click: () => onStopClick?.(stop.id),
                    }}
                  >
                    <Popup>
                      <div className="p-2 max-w-xs">
                        <div className="font-semibold flex items-center gap-2">
                          <span className={`
                            px-2 py-0.5 rounded-full text-xs text-white
                            ${stop.stop_type === 'pickup' ? 'bg-green-500' : ''}
                            ${stop.stop_type === 'delivery' ? 'bg-blue-500' : ''}
                            ${stop.stop_type === 'return' ? 'bg-purple-500' : ''}
                          `}>
                            {stop.stop_type === 'pickup' ? 'PRELIEVO' : 
                             stop.stop_type === 'delivery' ? 'CONSEGNA' : 'RITORNO'}
                          </span>
                          <span className="text-xs text-gray-500">
                            #{stop.stop_index + 1}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{stop.address}</p>
                        {stop.notes && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            📝 {stop.notes}
                          </p>
                        )}
                        {(stop.time_window_start || stop.time_window_end) && (
                          <p className="text-xs text-gray-600 mt-1">
                            ⏰ {stop.time_window_start || '--:--'} - {stop.time_window_end || '--:--'}
                          </p>
                        )}
                        {stop.is_completed && (
                          <p className="text-xs text-green-600 mt-1 font-semibold">
                            ✅ COMPLETATO
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            ) : (
              validStops.map((stop) => (
                <Marker
                  key={stop.id}
                  position={[stop.lat, stop.lng]}
                  icon={getMarkerIcon(stop.stop_type, stop.is_completed)}
                  eventHandlers={{
                    click: () => onStopClick?.(stop.id),
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="font-semibold">{stop.address}</p>
                      <p className="text-sm text-gray-600">Tipo: {stop.stop_type}</p>
                    </div>
                  </Popup>
                </Marker>
              ))
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}