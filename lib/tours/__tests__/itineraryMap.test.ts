import {
  completeItineraryRoute,
  itineraryDirectionsUrl,
  itineraryEmbedMapUrl,
  itineraryMapStops,
  itineraryStaticMapUrl,
} from '@/lib/tours/itineraryMap';

describe('completeItineraryRoute', () => {
  it('keeps exact landmarks fixed and fills every generic lifecycle stage', () => {
    const route = completeItineraryRoute(
      8,
      [
        { index: 3, position: { lat: 27.223, lng: 33.856 } },
        { index: 6, position: { lat: 27.242, lng: 33.843 } },
      ],
      { lat: 27.257, lng: 33.812 },
    );

    expect(route).toHaveLength(8);
    expect(route[3]).toEqual({ lat: 27.223, lng: 33.856, approximate: false });
    expect(route[6]).toEqual({ lat: 27.242, lng: 33.843, approximate: false });
    expect(route[1]?.approximate).toBe(true);
    expect(route[4]?.approximate).toBe(true);
    expect(route[7]?.approximate).toBe(true);
  });

  it('separates overlapping approximate round-trip markers so each remains selectable', () => {
    const route = completeItineraryRoute(3, [], { lat: 27.25, lng: 33.81 });
    expect(route).toHaveLength(3);
    expect(route[0]).not.toEqual(route[2]);
  });

  it('does not invent route coordinates without an editor place or route base', () => {
    expect(completeItineraryRoute(4, [], null)).toEqual([]);
  });
});

describe('itineraryMapStops', () => {
  it('returns nothing when no step has an explicit location', () => {
    expect(itineraryMapStops([{ location: '' }, {}, { location: '   ' }])).toEqual([]);
  });

  it('keeps editor order and drops blank steps', () => {
    expect(itineraryMapStops([
      { location: 'El Gouna' },
      { location: '' },
      { location: 'Valley of the Kings' },
      { location: 'Luxor Temple' },
    ])).toEqual(['El Gouna', 'Valley of the Kings', 'Luxor Temple']);
  });

  it('keeps timeline-only travel labels out of map geocoding', () => {
    expect(itineraryMapStops([
      { location: 'Your Hotel' },
      { location: 'En Route' },
      { location: 'Local Restaurant' },
      { location: 'Luxor Restaurant' },
      { location: 'Cairo Lunch Stop' },
      { location: 'Red Sea' },
      { location: 'On the boat' },
      { location: 'On board' },
      { location: 'Rotes Meer' },
      { location: 'Auf dem Boot' },
      { location: 'البحر الأحمر' },
      { location: 'Luxor' },
      { location: 'Valley of the Kings' },
      { location: 'Unterwegs' },
    ])).toEqual(['Luxor', 'Valley of the Kings']);
  });

  it('folds a round trip back into the start marker', () => {
    expect(itineraryMapStops([
      { location: 'El Gouna' },
      { location: 'Luxor' },
      { location: 'el gouna' },
    ])).toEqual(['El Gouna', 'Luxor']);
  });

  it('renders a stop visited twice only once', () => {
    expect(itineraryMapStops([
      { location: 'Cairo' },
      { location: 'Giza' },
      { location: 'Cairo' },
      { location: 'Saqqara' },
    ])).toEqual(['Cairo', 'Giza', 'Saqqara']);
  });
});

describe('itineraryStaticMapUrl', () => {
  it('needs a key and at least two stops', () => {
    expect(itineraryStaticMapUrl(['Cairo', 'Giza'], undefined)).toBeNull();
    expect(itineraryStaticMapUrl(['Cairo'], 'k')).toBeNull();
  });

  it('gives every stop a visible red numbered marker and connects the route with a strong red line', () => {
    const url = itineraryStaticMapUrl(['El Gouna', 'Valley of the Kings', 'Luxor'], 'k');
    expect(url).toContain('staticmap');
    expect(url).toContain(encodeURIComponent('scale:2|color:0xB91C1C|label:1|El Gouna, Egypt'));
    expect(url).toContain(encodeURIComponent('scale:2|color:0xEF4444|label:2|Valley of the Kings, Luxor, Egypt'));
    expect(url).toContain(encodeURIComponent('scale:2|color:0xEF4444|label:3|Luxor, Egypt'));
    expect(url).toContain(encodeURIComponent('weight:5|color:0xDC2626E6|geodesic:true|El Gouna, Egypt|Valley of the Kings, Luxor, Egypt|Luxor, Egypt'));
    expect(url).toContain(encodeURIComponent('feature:poi|element:labels|visibility:off'));
    expect(url).toContain(encodeURIComponent('feature:transit|element:labels|visibility:off'));
    expect(decodeURIComponent(url!)).not.toContain('color:blue');
  });

  it('extracts the route city from a detailed tour location without duplicating place names', () => {
    const url = itineraryStaticMapUrl(
      ['Orange Bay, Giftun Island', 'Hurghada Marina'],
      'k',
      'Orange Bay, Giftun Island, Hurghada',
    );
    const markers = new URL(url!).searchParams.getAll('markers').join('|');
    expect(markers).toContain('Orange Bay, Giftun Island, Hurghada, Egypt');
    expect(markers).toContain('Hurghada Marina, Egypt');
    expect(markers).not.toContain('Orange Bay, Giftun Island, Orange Bay');
    expect(markers).not.toContain('Hurghada Marina, Hurghada');
  });

  it('does not duplicate an existing Egypt country context', () => {
    const url = itineraryStaticMapUrl(['Luxor, Egypt', 'Karnak, Ägypten'], 'k');
    const markers = new URL(url!).searchParams.getAll('markers').join('|');
    expect(markers).toContain('Luxor, Egypt');
    expect(markers).toContain('Karnak, Ägypten');
    expect(markers).not.toContain('Egypt, Egypt');
  });

  it('uses the published tour city to disambiguate short landmark names', () => {
    const url = itineraryStaticMapUrl(['Egyptian Museum', 'Citadel'], 'k', 'Cairo, Egypt');
    const markers = new URL(url!).searchParams.getAll('markers').join('|');
    expect(markers).toContain('Egyptian Museum, Cairo, Egypt');
    expect(markers).toContain('Citadel, Cairo, Egypt');
  });

  it('uses an explicit itinerary city instead of the pickup destination', () => {
    const url = itineraryStaticMapUrl(
      ['Luxor', 'Valley of the Kings', 'Karnak'],
      'k',
      'Makadi Bay',
    );
    const markers = new URL(url!).searchParams.getAll('markers').join('|');
    expect(markers).toContain('Luxor, Egypt');
    expect(markers).toContain('Valley of the Kings, Luxor, Egypt');
    expect(markers).toContain('Karnak, Luxor, Egypt');
    expect(markers).not.toContain('Makadi Bay');
    expect(markers).not.toContain('Luxor, Luxor');
  });
});

describe('itineraryEmbedMapUrl', () => {
  it('country-scopes the no-key fallback to Egypt', () => {
    expect(itineraryEmbedMapUrl('Luxor Restaurant')).toContain('Luxor%20Restaurant%2C%20Egypt');
  });

  it('uses the keyed place embed without duplicating an existing country', () => {
    const url = itineraryEmbedMapUrl('Karnak, Egypt', 'secret key');
    expect(url).toContain('/embed/v1/place?key=secret%20key');
    expect(decodeURIComponent(url)).toContain('q=Karnak, Egypt');
    expect(decodeURIComponent(url)).not.toContain('Egypt, Egypt');
  });

  it('uses the tour city to disambiguate a one-stop place embed', () => {
    expect(decodeURIComponent(itineraryEmbedMapUrl('Hanging Church', 'secret key', 'Cairo, Egypt')))
      .toContain('q=Hanging Church, Cairo, Egypt');
  });
});

describe('itineraryDirectionsUrl', () => {
  it('uses the visited itinerary city for the external route', () => {
    const url = new URL(itineraryDirectionsUrl(
      ['Luxor', 'Valley of the Kings', 'Karnak'],
      'Makadi Bay',
    ));
    expect(url.searchParams.get('origin')).toBe('Luxor, Egypt');
    expect(url.searchParams.get('destination')).toBe('Karnak, Luxor, Egypt');
    expect(url.searchParams.get('waypoints')).toBe('Valley of the Kings, Luxor, Egypt');
    expect(url.toString()).not.toContain('Makadi');
  });

  it('uses the published city for an ambiguous single stop', () => {
    const url = new URL(itineraryDirectionsUrl(['Citadel'], 'Cairo'));
    expect(url.pathname).toBe('/maps/search/');
    expect(url.searchParams.get('query')).toBe('Citadel, Cairo, Egypt');
  });
});
