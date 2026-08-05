"use client";

import { useEffect, useRef, useState } from "react";

export type MapLocation = {
  lat: number;
  lng: number;
  mapsUrl: string;
};

const DEPT_CENTERS: Record<string, { lat: number; lng: number }> = {
  "La Paz": { lat: -16.4955, lng: -68.1336 },
  "Santa Cruz": { lat: -17.7833, lng: -63.1821 },
  "Cochabamba": { lat: -17.3895, lng: -66.1568 },
  Oruro: { lat: -17.9833, lng: -67.15 },
  Potosí: { lat: -19.5836, lng: -65.7531 },
  Chuquisaca: { lat: -19.0333, lng: -65.2627 },
  Tarija: { lat: -21.5319, lng: -64.7311 },
  Beni: { lat: -14.8333, lng: -64.9 },
  Pando: { lat: -11.0267, lng: -68.7692 },
};

type Props = {
  department: string;
  value: MapLocation | null;
  onChange: (location: MapLocation) => void;
};

function toMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

type LeafletNS = {
  map: (
    el: HTMLElement,
    opts: { center: [number, number]; zoom: number },
  ) => {
    setView: (c: [number, number], z?: number) => void;
    on: (
      event: string,
      fn: (e: { latlng: { lat: number; lng: number } }) => void,
    ) => void;
    remove: () => void;
  };
  marker: (
    latlng: [number, number],
    opts?: { draggable?: boolean },
  ) => {
    addTo: (map: unknown) => MarkerInstance;
    setLatLng: (latlng: [number, number]) => void;
    getLatLng: () => { lat: number; lng: number };
    on: (
      event: string,
      fn: (e: {
        target: { getLatLng: () => { lat: number; lng: number } };
      }) => void,
    ) => void;
  };
  tileLayer: (
    url: string,
    opts: { attribution: string; maxZoom: number },
  ) => { addTo: (map: unknown) => void };
};

type MarkerInstance = {
  setLatLng: (latlng: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
  on: (
    event: string,
    fn: (e: {
      target: { getLatLng: () => { lat: number; lng: number } };
    }) => void,
  ) => void;
};

declare global {
  interface Window {
    L?: LeafletNS;
  }
}

function loadLeaflet(): Promise<LeafletNS> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector("link[data-smp-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.smpLeaflet = "1";
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-smp-leaflet]",
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet no cargó"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.smpLeaflet = "1";
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet no cargó"));
    };
    script.onerror = () => reject(new Error("No se pudo cargar el mapa"));
    document.head.appendChild(script);
  });
}

export function LocationPicker({ department, value, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapApi = useRef<{
    map: ReturnType<LeafletNS["map"]>;
    marker: MarkerInstance;
  } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const center = DEPT_CENTERS[department] ?? DEPT_CENTERS.Cochabamba;

  useEffect(() => {
    if (value) return;
    onChangeRef.current({
      lat: center.lat,
      lng: center.lng,
      mapsUrl: toMapsUrl(center.lat, center.lng),
    });
  }, [department, center.lat, center.lng, value]);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current) return;

        const start = value ?? center;
        const map = L.map(mapRef.current, {
          center: [start.lat, start.lng],
          zoom: 15,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([start.lat, start.lng], {
          draggable: true,
        }).addTo(map);

        const emit = (lat: number, lng: number) => {
          onChangeRef.current({
            lat,
            lng,
            mapsUrl: toMapsUrl(lat, lng),
          });
        };

        map.on("click", (e) => {
          marker.setLatLng([e.latlng.lat, e.latlng.lng]);
          emit(e.latlng.lat, e.latlng.lng);
        });

        marker.on("dragend", (e) => {
          const pos = e.target.getLatLng();
          emit(pos.lat, pos.lng);
        });

        mapApi.current = { map, marker };
        setReady(true);
        setTimeout(() => {
          map.setView([start.lat, start.lng], 15);
        }, 80);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al cargar el mapa");
      });

    return () => {
      cancelled = true;
      mapApi.current?.map.remove();
      mapApi.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapApi.current || !value) return;
    mapApi.current.map.setView([value.lat, value.lng], 15);
    mapApi.current.marker.setLatLng([value.lat, value.lng]);
  }, [value?.lat, value?.lng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite geolocalización");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange({ lat, lng, mapsUrl: toMapsUrl(lat, lng) });
        setError("");
      },
      () => setError("No pudimos obtener tu ubicación"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const pin = value ?? {
    lat: center.lat,
    lng: center.lng,
    mapsUrl: toMapsUrl(center.lat, center.lng),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-light uppercase tracking-[0.2em] text-muted">
          Ubicación (pin)
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          className="text-[10px] font-light uppercase tracking-[0.16em] text-foreground transition-opacity hover:opacity-45"
        >
          Usar mi ubicación
        </button>
      </div>

      <div
        ref={mapRef}
        className="z-0 h-64 w-full overflow-hidden border border-border bg-border sm:h-72"
      />

      {error ? (
        <p className="text-[12px] font-light text-red-700">{error}</p>
      ) : !ready ? (
        <p className="text-[11px] font-light text-muted">Cargando mapa…</p>
      ) : (
        <p className="text-[11px] font-light leading-relaxed text-muted">
          Tocá el mapa o arrastrá el pin.{" "}
          <a
            href={pin.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-opacity hover:opacity-50"
          >
            Abrir en Google Maps
          </a>
        </p>
      )}
    </div>
  );
}
