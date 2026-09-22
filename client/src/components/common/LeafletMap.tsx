import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapProps {
  workerLat: number;
  workerLng: number;
  customerLat?: number;
  customerLng?: number;
  workerName?: string;
  customerAddress?: string;
  statusText?: string;
  etaMinutes?: number;
  height?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  workerLat,
  workerLng,
  customerLat,
  customerLng,
  workerName = 'Verified Cooperative Worker',
  customerAddress = 'Customer Location',
  statusText = 'TRAVELLING_TO_CUSTOMER',
  etaMinutes = 12,
  height = '360px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([workerLat, workerLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Task Unity Cooperative'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers except tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Custom Worker Icon
    const workerIcon = L.divIcon({
      className: 'custom-worker-pin',
      html: `
        <div style="background-color: #16a34a; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-weight: bold; font-size: 14px;">
          ⚡
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    // Customer Icon
    const customerIcon = L.divIcon({
      className: 'custom-customer-pin',
      html: `
        <div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 14px;">
          🏠
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const workerMarker = L.marker([workerLat, workerLng], { icon: workerIcon })
      .addTo(map)
      .bindPopup(`<b>${workerName}</b><br/>Status: ${statusText}<br/>ETA: ${etaMinutes} min`)
      .openPopup();

    if (customerLat && customerLng) {
      const customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>Destination</b><br/>${customerAddress}`);

      // Connecting polyline
      const latlngs: [number, number][] = [
        [workerLat, workerLng],
        [(workerLat + customerLat) / 2 + 0.001, (workerLng + customerLng) / 2 - 0.001],
        [customerLat, customerLng]
      ];

      const polyline = L.polyline(latlngs, {
        color: '#16a34a',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8
      }).addTo(map);

      // Fit bounds to show both points
      const group = L.featureGroup([workerMarker, customerMarker, polyline]);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      map.setView([workerLat, workerLng], 15);
    }

    return () => {
      // Clean up on unmount if needed
    };
  }, [workerLat, workerLng, customerLat, customerLng, workerName, statusText, etaMinutes]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Floating ETA and Status Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm px-3.5 py-2 rounded-xl shadow-lg border border-slate-200 flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Status</div>
          <div className="text-xs font-bold text-slate-800">
            {statusText} • ETA: {etaMinutes} min
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded-md shadow">
        GPS Privacy Protected
      </div>
    </div>
  );
};
