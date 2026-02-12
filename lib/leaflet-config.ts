// 📁 lib/leaflet-config.ts
'use client';

import L from 'leaflet';

// Fix per icone Leaflet in Next.js
export function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Tipi stop con colori
export const STOP_COLORS = {
  pickup: '#10b981',
  delivery: '#3b82f6',
  return: '#8b5cf6',
} as const;

// Crea marker personalizzato
export function createCustomMarker(type: keyof typeof STOP_COLORS, isCompleted = false) {
  const color = isCompleted ? '#9ca3af' : STOP_COLORS[type];
  
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
}