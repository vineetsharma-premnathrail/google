"use client";

import { useEffect, useRef, useState } from "react";
import type { DayPlan, Activity } from "@/types";

const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: "#3b82f6",
  food: "#f97316",
  adventure: "#22c55e",
  culture: "#a855f7",
  transport: "#94a3b8",
  rest: "#ec4899",
};

interface Props {
  day: DayPlan;
  apiKey: string;
}

declare global {
  interface Window {
    google: any;
    initTravelMap?: () => void;
  }
}

export default function TripMap({ day, apiKey }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [selected, setSelected] = useState<Activity | null>(null);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    const loadMap = () => {
      const activities = day.activities.filter((a) => a.lat && a.lng);
      if (!activities.length) return;

      const center = { lat: activities[0].lat!, lng: activities[0].lng! };

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current!, {
          center,
          zoom: 14,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8b9db0" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d3561" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a3a2a" }] },
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        });
      }

      // Clear old markers and polyline
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) polylineRef.current.setMap(null);

      const path: any[] = [];

      activities.forEach((act, idx) => {
        const color = ACTIVITY_COLORS[act.category] ?? "#0ea5e9";
        const latLng = { lat: act.lat!, lng: act.lng! };
        path.push(latLng);

        const marker = new window.google.maps.Marker({
          position: latLng,
          map: mapInstanceRef.current,
          title: act.name,
          label: {
            text: String(idx + 1),
            color: "#fff",
            fontWeight: "bold",
            fontSize: "12px",
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => setSelected(act));
        markersRef.current.push(marker);
      });

      // Draw route polyline if available
      const encodedPolyline = (day as any).map_route?.polyline;
      if (encodedPolyline && window.google.maps.geometry) {
        const decodedPath = window.google.maps.geometry.encoding.decodePath(encodedPolyline);
        polylineRef.current = new window.google.maps.Polyline({
          path: decodedPath,
          geodesic: true,
          strokeColor: "#0ea5e9",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: mapInstanceRef.current,
        });
      } else if (path.length > 1) {
        polylineRef.current = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#0ea5e9",
          strokeOpacity: 0.6,
          strokeWeight: 2,
          strokeDasharray: "8 4",
          map: mapInstanceRef.current,
        });
      }

      // Fit bounds
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapInstanceRef.current.fitBounds(bounds, { padding: 60 });
    };

    if (window.google?.maps) {
      loadMap();
    } else {
      window.initTravelMap = loadMap;
      if (!document.getElementById("gmaps-script")) {
        const script = document.createElement("script");
        script.id = "gmaps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initTravelMap`;
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [day, apiKey]);

  // Re-render markers when day changes
  useEffect(() => {
    if (window.google?.maps && mapInstanceRef.current) {
      const activities = day.activities.filter((a) => a.lat && a.lng);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) polylineRef.current.setMap(null);

      const path: any[] = [];
      activities.forEach((act, idx) => {
        const color = ACTIVITY_COLORS[act.category] ?? "#0ea5e9";
        const latLng = { lat: act.lat!, lng: act.lng! };
        path.push(latLng);

        const marker = new window.google.maps.Marker({
          position: latLng,
          map: mapInstanceRef.current,
          label: { text: String(idx + 1), color: "#fff", fontWeight: "bold", fontSize: "12px" },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
        marker.addListener("click", () => setSelected(act));
        markersRef.current.push(marker);
      });

      if (path.length > 1) {
        polylineRef.current = new window.google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#0ea5e9",
          strokeOpacity: 0.6,
          strokeWeight: 2,
          map: mapInstanceRef.current,
        });
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        mapInstanceRef.current.fitBounds(bounds, { padding: 60 });
      }
    }
  }, [day]);

  const route = (day as any).map_route;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800">
      <div ref={mapRef} className="w-full h-full" />

      {/* Route summary strip */}
      {route && (
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-4 text-sm">
          <span className="text-slate-400">Total route:</span>
          <span className="text-white font-semibold">{route.total_distance_text}</span>
          <span className="text-slate-500">·</span>
          <span className="text-brand-300">{route.total_duration_text} walking</span>
        </div>
      )}

      {/* Activity popup */}
      {selected && (
        <div className="absolute top-3 left-3 right-3 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{selected.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{selected.location}</p>
              {(selected as any).rating && (
                <p className="text-xs text-amber-400 mt-0.5">⭐ {(selected as any).rating}</p>
              )}
            </div>
            <button className="text-slate-500 hover:text-white text-lg leading-none" onClick={() => setSelected(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
