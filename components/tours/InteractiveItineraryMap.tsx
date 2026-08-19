'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MapPin, Navigation } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  completeItineraryRoute,
  isItineraryMappableLocation,
  itineraryCoordinateAnchors,
  type ItineraryRoutePosition,
} from '@/lib/tours/itineraryMap';

const OPENFREE_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_LOAD_TIMEOUT_MS = 15000;

export interface InteractiveItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  coordinates?: { lat?: number | null; lng?: number | null } | null;
}

interface InteractiveItineraryMapProps {
  itinerary: InteractiveItineraryItem[];
  openMapsUrl: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}

type MapLibreMap = import('maplibre-gl').Map;
type MapLibreMarker = import('maplibre-gl').Marker;
type MapLibrePopup = import('maplibre-gl').Popup;

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

function markerClass(active: boolean): string {
  return [
    'eeo-itinerary-marker',
    'inline-flex items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2',
    active ? 'h-11 w-11 bg-red-800' : 'h-9 w-9 bg-red-600',
  ].join(' ');
}

export default function InteractiveItineraryMap({
  itinerary,
  openMapsUrl,
  activeIndex,
  onSelect,
}: InteractiveItineraryMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const popupRef = useRef<MapLibrePopup | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const focusedStageRef = useRef<number | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  const anchors = useMemo(() => itineraryCoordinateAnchors(itinerary), [itinerary]);
  const roundTripBase = anchors.find((anchor) => anchor.index === 0)?.position || null;
  const positions = useMemo(
    () => completeItineraryRoute(itinerary.length, anchors, roundTripBase),
    [anchors, itinerary.length, roundTripBase],
  );
  const effectiveMapState = itinerary.length === 0 || positions.length !== itinerary.length
    ? 'unavailable'
    : mapState;
  const selected = itinerary[activeIndex] || itinerary[0];

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShouldLoadMap(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setShouldLoadMap(true);
      observer.disconnect();
    }, { rootMargin: '400px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadMap) return;
    if (!mapElementRef.current || itinerary.length === 0 || positions.length !== itinerary.length) {
      return;
    }

    let cancelled = false;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    const markerListeners: Array<{ element: HTMLElement; event: string; listener: EventListener }> = [];

    const initialize = async () => {
      setMapState('loading');
      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !mapElementRef.current) return;

        const map = new maplibre.Map({
          container: mapElementRef.current,
          style: OPENFREE_STYLE_URL,
          center: [positions[0]!.lng, positions[0]!.lat],
          zoom: 10,
          attributionControl: false,
          cooperativeGestures: true,
        });
        mapInstanceRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        map.addControl(new maplibre.AttributionControl({ compact: true }), 'bottom-right');

        loadTimer = setTimeout(() => {
          if (!cancelled) {
            map.remove();
            mapInstanceRef.current = null;
            setMapState('unavailable');
          }
        }, MAP_LOAD_TIMEOUT_MS);

        // `style.load` is the reliable readiness boundary for adding our own
        // route source and markers. Waiting for the broader `load` event also
        // waits on every initial base-map tile and can stall a fast customer
        // connection behind a single slow optional tile.
        map.once('style.load', () => {
          if (cancelled) return;
          if (loadTimer) clearTimeout(loadTimer);

          map.addSource('eeo-itinerary-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: positions.map((position) => [position.lng, position.lat]),
              },
            },
          });
          map.addLayer({
            id: 'eeo-itinerary-route-line',
            type: 'line',
            source: 'eeo-itinerary-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#dc2626',
              'line-opacity': 0.9,
              'line-width': 4,
            },
          });

          const popup = new maplibre.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 28,
            maxWidth: '280px',
          });
          popupRef.current = popup;

          markersRef.current = positions.map((position, index) => {
            const element = document.createElement('button');
            element.type = 'button';
            element.className = markerClass(index === activeIndexRef.current);
            element.textContent = String(index + 1);
            element.setAttribute('aria-label', `Show stage ${index + 1}: ${itinerary[index]?.title || ''}`);
            const selectStage = () => onSelect(index);
            for (const event of ['click', 'mouseenter', 'focus']) {
              element.addEventListener(event, selectStage);
              markerListeners.push({ element, event, listener: selectStage });
            }
            return new maplibre.Marker({ element, anchor: 'bottom' })
              .setLngLat([position.lng, position.lat])
              .addTo(map);
          });

          if (positions.length === 1) {
            map.jumpTo({ center: [positions[0]!.lng, positions[0]!.lat], zoom: 12 });
          } else {
            const bounds = new maplibre.LngLatBounds();
            positions.forEach((position) => bounds.extend([position.lng, position.lat]));
            map.fitBounds(bounds, { padding: 58, maxZoom: 12, duration: 0 });
          }

          window.setTimeout(() => {
            const index = Math.min(activeIndexRef.current, itinerary.length - 1);
            const position = positions[index];
            const item = itinerary[index];
            if (!cancelled && position && item) {
              popup
                .setLngLat([position.lng, position.lat])
                .setHTML(infoCard(item, index, position.approximate))
                .addTo(map);
            }
          }, 150);
          setMapState('ready');
        });
      } catch {
        if (!cancelled) setMapState('unavailable');
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      if (loadTimer) clearTimeout(loadTimer);
      markerListeners.forEach(({ element, event, listener }) => element.removeEventListener(event, listener));
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      popupRef.current?.remove();
      popupRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      focusedStageRef.current = null;
    };
  }, [itinerary, onSelect, positions, shouldLoadMap]);

  useEffect(() => {
    if (mapState !== 'ready') return;
    const map = mapInstanceRef.current;
    const popup = popupRef.current;
    const position = positions[activeIndex];
    const item = itinerary[activeIndex];
    if (!map || !popup || !position || !item) return;

    markersRef.current.forEach((marker, index) => {
      marker.getElement().className = markerClass(index === activeIndex);
    });
    popup
      .setLngLat([position.lng, position.lat])
      .setHTML(infoCard(item, activeIndex, position.approximate))
      .addTo(map);

    if (focusedStageRef.current !== null && focusedStageRef.current !== activeIndex) {
      map.easeTo({ center: [position.lng, position.lat], duration: 300 });
    }
    focusedStageRef.current = activeIndex;
  }, [activeIndex, itinerary, mapState, positions]);

  const selectedPosition: ItineraryRoutePosition | undefined = positions[activeIndex];
  const selectedIsExact = selectedPosition
    ? !selectedPosition.approximate
    : Boolean(selected?.location && isItineraryMappableLocation(selected.location));

  return (
    <div data-testid="interactive-itinerary-map" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="relative aspect-[4/3] min-h-[290px] w-full bg-slate-100 sm:aspect-square">
        <div
          className={`absolute inset-0 transition-opacity ${effectiveMapState === 'unavailable' ? 'opacity-0' : 'opacity-100'}`}
          role="region"
          aria-label={`Interactive tour route with ${itinerary.length} numbered stages`}
        >
          <div
            ref={mapElementRef}
            data-testid="interactive-itinerary-map-canvas"
            className="h-full w-full"
          />
        </div>

        {effectiveMapState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm font-semibold text-slate-700">
            Loading route map…
          </div>
        )}
        {effectiveMapState === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
            <MapPin className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">The route map is temporarily unavailable.</p>
            <a
              href={openMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <Navigation size={13} />
              Open route
            </a>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-sm">
          {itinerary.length} route stages
        </div>
      </div>

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
              className={`inline-flex h-9 min-w-9 flex-shrink-0 scroll-mx-3 items-center justify-center rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${activeIndex === index ? 'bg-red-700 text-white ring-4 ring-red-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              {index + 1}
            </button>
          ))}
          <a
            href={openMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            <Navigation size={13} />
            Open route
          </a>
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

      <div className="border-t border-slate-100 px-3 pb-4 pt-3">
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          Numbered stages follow the itinerary order. Generic pickup, sea and onboard stages are approximate; exact pickup is confirmed after booking.
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          Map data © <a className="underline hover:text-slate-700" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · Tiles by <a className="underline hover:text-slate-700" href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
        </p>
      </div>
    </div>
  );
}
