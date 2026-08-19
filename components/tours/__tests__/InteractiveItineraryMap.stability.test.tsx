import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InteractiveItineraryMap, { type InteractiveItineraryItem } from '../InteractiveItineraryMap';

// Building a MapLibre map means a WebGL context, a style download and a fresh
// tile set. On the live tour page the parent re-renders on every scroll tick
// (eight useInView observers drive the sticky tab bar) and handed this
// component freshly allocated — but identical — itinerary arrays. That
// identity churn used to tear the map down and rebuild it: measured on
// egypt-excursionsonline.com on 2026-08-20, six scroll passes over one
// itinerary triggered 136 full map reconstructions and 1,684 tile requests,
// flashing "Loading route map…" through roughly 11% of the scroll.
const mapStats = {
  constructed: 0,
  removed: 0,
  markersCreated: 0,
  setDataCalls: 0,
  fitBoundsCalls: 0,
};

jest.mock('maplibre-gl', () => {
  class FakeSource {
    data: unknown;
    constructor(data: unknown) { this.data = data; }
    setData(data: unknown) { this.data = data; mapStats.setDataCalls += 1; }
  }

  class FakeMap {
    private handlers = new Map<string, () => void>();
    private sources = new Map<string, FakeSource>();
    private layers = new Set<string>();

    constructor(_options: unknown) {
      mapStats.constructed += 1;
      // Style readiness resolves on a later tick, as it does in a browser.
      setTimeout(() => this.handlers.get('style.load')?.(), 0);
    }

    once(event: string, handler: () => void) { this.handlers.set(event, handler); return this; }
    addControl() { return this; }
    getSource(id: string) { return this.sources.get(id); }
    addSource(id: string, spec: { data: unknown }) { this.sources.set(id, new FakeSource(spec.data)); }
    addLayer(spec: { id: string }) { this.layers.add(spec.id); }
    getLayer(id: string) { return this.layers.has(id) ? { id } : undefined; }
    removeLayer(id: string) { this.layers.delete(id); }
    removeSource(id: string) { this.sources.delete(id); }
    jumpTo() { /* no-op */ }
    easeTo() { /* no-op */ }
    fitBounds() { mapStats.fitBoundsCalls += 1; }
    remove() { mapStats.removed += 1; }
  }

  class FakeMarker {
    private element: HTMLElement;
    constructor(options: { element: HTMLElement }) {
      mapStats.markersCreated += 1;
      this.element = options.element;
    }
    setLngLat() { return this; }
    addTo() { return this; }
    getElement() { return this.element; }
    remove() { /* no-op */ }
  }

  return {
    __esModule: true,
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: class { },
    LngLatBounds: class { extend() { /* no-op */ } },
  };
});

// The shared jest.setup stub never reports an intersection, so the map would
// stay lazy forever. Report one immediately, as a real viewport does when the
// itinerary scrolls into view.
class ImmediateIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect() { /* no-op */ }
  unobserve() { /* no-op */ }
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

const realIntersectionObserver = global.IntersectionObserver;
beforeAll(() => {
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    ImmediateIntersectionObserver;
});
afterAll(() => {
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    realIntersectionObserver;
});

const STOPS: Array<{ title: string; lat?: number; lng?: number }> = [
  { title: 'Hotel Pickup' },
  { title: 'Orange Bay', lat: 27.223, lng: 33.856 },
  { title: 'Lunch' },
  { title: 'Hurghada Marina', lat: 27.242, lng: 33.843 },
  { title: 'Hotel Drop-off' },
];

// Rebuilt on every call, exactly like extractEnhancementData() on the tour page.
function freshItinerary(shift = 0): InteractiveItineraryItem[] {
  return STOPS.map((stop) => ({
    title: stop.title,
    description: `${stop.title} description.`,
    location: stop.title,
    coordinates: typeof stop.lat === 'number'
      ? { lat: stop.lat + shift, lng: stop.lng! }
      : null,
  }));
}

/**
 * Mirrors the real tour page: unrelated state changes re-render the parent,
 * and every render hands the map brand-new prop objects holding the same data.
 */
function ScrollingParent({ shift = 0 }: { shift?: number }) {
  const [tick, setTick] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => setTick((value) => value + 1)}>
        simulate scroll tick {tick}
      </button>
      <InteractiveItineraryMap
        itinerary={freshItinerary(shift)}
        openMapsUrl="https://maps.example.test/route"
        activeIndex={activeIndex}
        onSelect={(index) => setActiveIndex(index)}
      />
    </div>
  );
}

async function flushStyleLoad() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('InteractiveItineraryMap stability under parent re-renders', () => {
  beforeEach(() => {
    mapStats.constructed = 0;
    mapStats.removed = 0;
    mapStats.markersCreated = 0;
    mapStats.setDataCalls = 0;
    mapStats.fitBoundsCalls = 0;
  });

  it('builds the map once and never rebuilds it when the parent re-renders with equal data', async () => {
    render(<ScrollingParent />);
    await flushStyleLoad();
    // Markers are drawn by the route-sync effect, which runs after the style
    // has loaded — waiting on them proves the map is fully built.
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    const markersAfterFirstDraw = mapStats.markersCreated;
    expect(mapStats.constructed).toBe(1);

    const scrollTick = screen.getByRole('button', { name: /simulate scroll tick/i });
    for (let i = 0; i < 12; i += 1) {
      fireEvent.click(scrollTick);
      await flushStyleLoad();
    }

    expect(mapStats.constructed).toBe(1);
    expect(mapStats.removed).toBe(0);
    expect(mapStats.markersCreated).toBe(markersAfterFirstDraw);
    expect(mapStats.fitBoundsCalls).toBe(1);
  });

  it('keeps the map alive when a stage is hovered or selected', async () => {
    render(<ScrollingParent />);
    await flushStyleLoad();
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    expect(mapStats.constructed).toBe(1);

    const stageChips = screen.getAllByRole('button', { name: /^Show stage/ });
    for (const chip of stageChips) {
      fireEvent.mouseEnter(chip);
      await flushStyleLoad();
    }

    expect(mapStats.constructed).toBe(1);
    expect(mapStats.removed).toBe(0);
  });

  it('redraws the route in place — without a rebuild — when the coordinates actually change', async () => {
    const { rerender } = render(<ScrollingParent shift={0} />);
    await flushStyleLoad();
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    expect(mapStats.constructed).toBe(1);
    expect(mapStats.setDataCalls).toBe(0);

    rerender(<ScrollingParent shift={0.5} />);
    await flushStyleLoad();

    await waitFor(() => expect(mapStats.setDataCalls).toBe(1));
    expect(mapStats.constructed).toBe(1);
    expect(mapStats.removed).toBe(0);
    expect(mapStats.fitBoundsCalls).toBe(2);
  });
});
