import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('keyless itinerary map contract', () => {
  it('stores complete coordinate pairs with geographic range validation', () => {
    const model = read('lib/models/Tour.ts');
    const schema = model.slice(
      model.indexOf('const ItineraryCoordinatesSchema'),
      model.indexOf('const SlotGuestPricesSchema'),
    );
    expect(schema).toContain('lat: { type: Number, required: true, min: -90, max: 90 }');
    expect(schema).toContain('lng: { type: Number, required: true, min: -180, max: 180 }');
    expect(schema).toContain('coordinates: { type: ItineraryCoordinatesSchema }');
  });

  it('keeps the customer map keyless and allows only the open tile host in CSP', () => {
    const map = read('components/tours/InteractiveItineraryMap.tsx');
    const detail = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
    const config = read('next.config.ts');

    expect(map).toContain('https://tiles.openfreemap.org/styles/bright');
    expect(map).toContain('OpenStreetMap contributors');
    expect(map).not.toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    expect(map).not.toContain('maps.googleapis.com');
    expect(detail).not.toContain('itineraryStaticMapUrl');
    expect(detail).not.toContain('itineraryEmbedMapUrl');
    expect(config).toContain('connect-src');
    expect(config).toContain('https://tiles.openfreemap.org');
  });

  it('hands the itinerary map a stable itinerary so scrolling cannot rebuild the map', () => {
    const detail = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
    const map = read('components/tours/InteractiveItineraryMap.tsx');

    // extractEnhancementData rebuilds `itinerary` with .map() on every call, and
    // this page re-renders on every scroll tick (eight useInView observers feed
    // the sticky tab bar). Calling it unmemoised handed the map a new array
    // identity per tick, which tore down and re-created the WebGL map.
    expect(detail).toContain('useMemo(() => extractEnhancementData(tour), [tour])');
    expect(detail).not.toMatch(/const enhancement = extractEnhancementData\(tour\);/);

    // The map itself must not key its lifecycle on object identity either.
    expect(map).toContain('const routeSignature = useMemo(');
    expect(map).toContain('}, [canRenderMap, clearMarkers, shouldLoadMap]);');
    expect(map).toContain('}, [clearMarkers, routeSignature, styleLoaded]);');
    expect(map).toContain('export default React.memo(InteractiveItineraryMap);');
  });

  it('requires complete coordinate pairs in the tour editor and never geocodes customer visits', () => {
    const form = read('components/TourForm.tsx');
    expect(form).toContain('Latitude <span className="font-normal">(map pin)</span>');
    expect(form).toContain('Longitude <span className="font-normal">(map pin)</span>');
    expect(form).toContain('needs a valid latitude and longitude, or both fields must be empty');
    expect(form).toContain('Customer page views do not call a geocoder or a paid map API');
    expect(form).toContain('https://www.openstreetmap.org/search?query=');
  });
});
