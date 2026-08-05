import { itineraryEmbedMapUrl, itineraryMapStops, itineraryStaticMapUrl } from '@/lib/tours/itineraryMap';

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
    expect(url).toContain(encodeURIComponent('size:mid|color:0xB91C1C|label:1|El Gouna, Egypt'));
    expect(url).toContain(encodeURIComponent('size:mid|color:0xEF4444|label:2|Valley of the Kings, Egypt'));
    expect(url).toContain(encodeURIComponent('size:mid|color:0xEF4444|label:3|Luxor, Egypt'));
    expect(url).toContain(encodeURIComponent('weight:5|color:0xDC2626E6|geodesic:true|El Gouna, Egypt|Valley of the Kings, Egypt|Luxor, Egypt'));
    expect(decodeURIComponent(url!)).not.toContain('color:blue');
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
