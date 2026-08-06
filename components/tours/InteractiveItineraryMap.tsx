'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MapPin, Navigation } from 'lucide-react';
import {
  completeItineraryRoute,
  isItineraryMappableLocation,
  itineraryMapQuery,
  itineraryMapStops,
  itineraryRouteContextQuery,
  type ItineraryRouteCoordinate,
} from '@/lib/tours/itineraryMap';

export interface InteractiveItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
}

interface InteractiveItineraryMapProps {
  itinerary: InteractiveItineraryItem[];
  tourLocation?: string;
  apiKey?: string;
  fallbackMapUrl?: string | null;
  fallbackEmbedUrl?: string | null;
  openMapsUrl: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}

type MapsEventListener = { remove: () => void };
type MapInstance = {
  fitBounds: (bounds: unknown, padding?: Record<string, number>) => void;
  getZoom: () => number | undefined;
  setZoom: (zoom: number) => void;
  panTo: (position: ItineraryRouteCoordinate) => void;
  addListener: (event: string, callback: () => void) => MapsEventListener;
};
type MarkerInstance = {
  addListener: (event: string, callback: () => void) => MapsEventListener;
  getPosition: () => unknown;
  setIcon: (icon: Record<string, unknown>) => void;
  setMap: (map: MapInstance | null) => void;
  setZIndex: (zIndex: number) => void;
};
type InfoWindowInstance = {
  close: () => void;
  open: (options: { map: MapInstance; anchor: MarkerInstance; shouldFocus?: boolean }) => void;
  setContent: (content: string) => void;
};
type GeocoderResult = { geometry?: { location?: { lat: () => number; lng: () => number } } };
type GeocoderInstance = {
  geocode: (
    request: { address: string; region?: string },
    callback: (results: GeocoderResult[] | null, status: string) => void,
  ) => void;
};
type PolylineInstance = { setMap: (map: MapInstance | null) => void };

interface GoogleMapsApi {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
    Marker: new (options: Record<string, unknown>) => MarkerInstance;
    InfoWindow: new (options?: Record<string, unknown>) => InfoWindowInstance;
    Geocoder: new () => GeocoderInstance;
    LatLngBounds: new () => { extend: (position: ItineraryRouteCoordinate) => void };
    Polyline: new (options: Record<string, unknown>) => PolylineInstance;
    Size: new (width: number, height: number) => unknown;
    Point: new (x: number, y: number) => unknown;
  };
}

let googleMapsLoader: Promise<GoogleMapsApi> | null = null;

function currentGoogleMaps(): GoogleMapsApi | null {
  const google = (window as unknown as { google?: GoogleMapsApi }).google;
  return google?.maps?.Map ? google : null;
}

function waitForGoogleMaps(timeoutMs = 12000): Promise<GoogleMapsApi> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const google = currentGoogleMaps();
      if (google) {
        window.clearInterval(timer);
        resolve(google);
      } else if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error('Google Maps timed out'));
      }
    }, 100);
  });
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  const loaded = currentGoogleMaps();
  if (loaded) return Promise.resolve(loaded);
  if (!apiKey) return Promise.reject(new Error('Google Maps key is unavailable'));
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      waitForGoogleMaps().then(resolve, reject);
      return;
    }

    const callbackName = '__eeoItineraryMapReady';
    const callbackWindow = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    script.dataset.eeoItineraryMap = 'true';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=quarterly&callback=${callbackName}`;

    callbackWindow[callbackName] = () => {
      const google = currentGoogleMaps();
      delete callbackWindow[callbackName];
      if (google) resolve(google);
      else reject(new Error('Google Maps loaded without the maps library'));
    };
    script.onerror = () => {
      delete callbackWindow[callbackName];
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    googleMapsLoader = null;
    throw error;
  });

  return googleMapsLoader;
}

function geocode(geocoder: GeocoderInstance, address: string): Promise<ItineraryRouteCoordinate | null> {
  return new Promise((resolve) => {
    geocoder.geocode({ address, region: 'EG' }, (results, status) => {
      const location = results?.[0]?.geometry?.location;
      if (status === 'OK' && location) {
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

function escapeHtml(value?: string): string {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function infoCard(item: InteractiveItineraryItem, index: number, approximate: boolean): string {
  const meta = [item.time, item.duration].filter(Boolean).map(escapeHtml).join(' · ');
  return `<div style="max-width:250px;padding:4px 2px 2px;font-family:Arial,sans-serif;color:#1e293b">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
      <span style="display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:999px;background:#dc2626;color:white;font-weight:700">${index + 1}</span>
      <div><strong style="font-size:14px">${escapeHtml(item.title)}</strong>${meta ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${meta}</div>` : ''}</div>
    </div>
    <div style="font-size:12px;line-height:1.45;color:#475569">${escapeHtml(item.description)}</div>
    ${item.location ? `<div style="font-size:11px;color:#64748b;margin-top:7px">${escapeHtml(item.location)} · ${approximate ? 'Approximate route stage' : 'Exact itinerary place'}</div>` : ''}
  </div>`;
}

function markerIcon(google: GoogleMapsApi, number: number, active: boolean) {
  const fill = active ? '#991B1B' : '#EF4444';
  const svg = `<svg width="44" height="54" viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 1C10.4 1 1 10.4 1 22c0 15.2 21 31 21 31s21-15.8 21-31C43 10.4 33.6 1 22 1z" fill="${fill}" stroke="white" stroke-width="2"/>
    <circle cx="22" cy="22" r="12" fill="white"/>
    <text x="22" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="${fill}">${number}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(active ? 48 : 42, active ? 59 : 52),
    anchor: new google.maps.Point(active ? 24 : 21, active ? 59 : 52),
  };
}

export default function InteractiveItineraryMap({
  itinerary,
  tourLocation,
  apiKey = '',
  fallbackMapUrl,
  fallbackEmbedUrl,
  openMapsUrl,
  activeIndex,
  onSelect,
}: InteractiveItineraryMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const positionsRef = useRef<ReturnType<typeof completeItineraryRoute>>([]);
  const infoWindowRef = useRef<InfoWindowInstance | null>(null);
  const googleRef = useRef<GoogleMapsApi | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  const selected = itinerary[activeIndex] || itinerary[0];
  const physicalStops = useMemo(() => itineraryMapStops(itinerary), [itinerary]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!mapElementRef.current || itinerary.length === 0 || !apiKey) {
      queueMicrotask(() => setMapState('fallback'));
      return;
    }

    let cancelled = false;
    const listeners: MapsEventListener[] = [];
    let routeLine: PolylineInstance | null = null;

    const initialize = async () => {
      try {
        const google = await loadGoogleMaps(apiKey);
        if (cancelled || !mapElementRef.current) return;
        googleRef.current = google;

        const geocoder = new google.maps.Geocoder();
        const queryCache = new Map<string, Promise<ItineraryRouteCoordinate | null>>();
        const resolveQuery = (query: string) => {
          if (!queryCache.has(query)) queryCache.set(query, geocode(geocoder, query));
          return queryCache.get(query)!;
        };

        const routeContext = itineraryRouteContextQuery(physicalStops, tourLocation);
        const exactAnchors = (await Promise.all(itinerary.map(async (item, index) => {
          const location = String(item.location || '').trim();
          if (!location || !isItineraryMappableLocation(location)) return null;
          const position = await resolveQuery(itineraryMapQuery(location, routeContext || tourLocation));
          return position ? { index, position } : null;
        }))).filter((anchor): anchor is { index: number; position: ItineraryRouteCoordinate } => Boolean(anchor));

        const routeBase = routeContext ? await resolveQuery(routeContext) : null;
        const positions = completeItineraryRoute(itinerary.length, exactAnchors, routeBase);
        if (cancelled || positions.length !== itinerary.length) throw new Error('Route stages could not be positioned');
        positionsRef.current = positions;

        const map = new google.maps.Map(mapElementRef.current, {
          center: positions[0],
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        });
        mapInstanceRef.current = map;

        routeLine = new google.maps.Polyline({
          map,
          path: positions,
          strokeColor: '#DC2626',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          geodesic: true,
        });

        const infoWindow = new google.maps.InfoWindow({ maxWidth: 270 });
        infoWindowRef.current = infoWindow;
        const bounds = new google.maps.LatLngBounds();

        const openStage = (index: number, notify = true) => {
          const marker = markersRef.current[index];
          const position = positions[index];
          if (!marker || !position) return;
          markersRef.current.forEach((candidate, markerIndex) => {
            candidate.setIcon(markerIcon(google, markerIndex + 1, markerIndex === index));
            candidate.setZIndex(markerIndex === index ? 1000 : markerIndex + 1);
          });
          infoWindow.setContent(infoCard(itinerary[index]!, index, position.approximate));
          infoWindow.open({ map, anchor: marker, shouldFocus: false });
          if (notify) onSelect(index);
        };

        markersRef.current = positions.map((position, index) => {
          bounds.extend(position);
          const marker = new google.maps.Marker({
            map,
            position,
            title: `Stage ${index + 1}: ${itinerary[index]?.title || ''}`,
            icon: markerIcon(google, index + 1, index === activeIndexRef.current),
            zIndex: index === activeIndexRef.current ? 1000 : index + 1,
            optimized: false,
          });
          listeners.push(marker.addListener('mouseover', () => openStage(index)));
          listeners.push(marker.addListener('click', () => openStage(index)));
          return marker;
        });

        map.fitBounds(bounds, { top: 62, right: 46, bottom: 62, left: 46 });
        listeners.push(map.addListener('idle', () => {
          const zoom = map.getZoom();
          if (typeof zoom === 'number' && zoom > 12) map.setZoom(12);
        }));
        window.setTimeout(() => openStage(Math.min(activeIndexRef.current, itinerary.length - 1), false), 150);
        setMapState('ready');
      } catch {
        if (!cancelled) setMapState('fallback');
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      listeners.forEach((listener) => listener.remove());
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      routeLine?.setMap(null);
      infoWindowRef.current?.close();
      mapInstanceRef.current = null;
    };
  }, [apiKey, itinerary, onSelect, physicalStops, tourLocation]);

  useEffect(() => {
    if (mapState !== 'ready') return;
    const google = googleRef.current;
    const map = mapInstanceRef.current;
    const marker = markersRef.current[activeIndex];
    const position = positionsRef.current[activeIndex];
    const item = itinerary[activeIndex];
    if (!google || !map || !marker || !position || !item || !infoWindowRef.current) return;

    markersRef.current.forEach((candidate, index) => {
      candidate.setIcon(markerIcon(google, index + 1, index === activeIndex));
      candidate.setZIndex(index === activeIndex ? 1000 : index + 1);
    });
    infoWindowRef.current.setContent(infoCard(item, activeIndex, position.approximate));
    infoWindowRef.current.open({ map, anchor: marker, shouldFocus: false });
    map.panTo(position);
  }, [activeIndex, itinerary, mapState]);

  const selectedIsExact = Boolean(selected?.location && isItineraryMappableLocation(selected.location));

  return (
    <div data-testid="interactive-itinerary-map" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="relative aspect-[4/3] min-h-[290px] w-full bg-slate-100 sm:aspect-square">
        <div
          ref={mapElementRef}
          data-testid="interactive-itinerary-map-canvas"
          className={`absolute inset-0 transition-opacity ${mapState === 'fallback' ? 'opacity-0' : 'opacity-100'}`}
          role="region"
          aria-label={`Interactive tour route with ${itinerary.length} numbered stages`}
        />

        {mapState !== 'ready' && fallbackMapUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fallbackMapUrl} alt="Tour route map" className="h-full w-full object-cover" />
        )}
        {mapState !== 'ready' && !fallbackMapUrl && fallbackEmbedUrl && (
          <iframe
            title="Tour route map"
            src={fallbackEmbedUrl}
            width="100%"
            height="100%"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        )}
        {mapState === 'fallback' && !fallbackMapUrl && !fallbackEmbedUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-600">
            The route map is temporarily unavailable.
          </div>
        )}

        {mapState === 'loading' && (
          <div className={`absolute flex items-center justify-center text-xs font-semibold text-slate-700 ${fallbackMapUrl || fallbackEmbedUrl ? 'right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-sm' : 'inset-0 bg-slate-100'}`}>
            Loading interactive route…
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-sm">
          {itinerary.length} route stages
        </div>
      </div>

      {selected && (
        <div data-testid="itinerary-map-stage-card" aria-live="polite" className="border-t border-slate-200 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white ring-4 ring-red-100">
              {activeIndex + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-slate-900">{selected.title}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedIsExact ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  {selectedIsExact ? 'Exact place' : 'Approximate stage'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {selected.time && <span className="inline-flex items-center gap-1"><Clock size={12} />{selected.time}</span>}
                {selected.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={12} /><span className="truncate">{selected.location}</span></span>}
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{selected.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 px-3 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Select an itinerary stage">
          {itinerary.map((item, index) => (
            <button
              key={`${item.title}-${index}`}
              type="button"
              onMouseEnter={() => onSelect(index)}
              onFocus={() => onSelect(index)}
              onClick={() => onSelect(index)}
              aria-label={`Show stage ${index + 1}: ${item.title}`}
              aria-pressed={activeIndex === index}
              className={`inline-flex h-9 min-w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${activeIndex === index ? 'bg-red-700 text-white ring-4 ring-red-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              {index + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.open(openMapsUrl, '_blank', 'noopener,noreferrer')}
            className="ml-auto inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            <Navigation size={13} />
            Open route
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          Numbered stages follow the itinerary order. Generic pickup, sea and onboard stages are approximate; exact pickup is confirmed after booking.
        </p>
      </div>
    </div>
  );
}
