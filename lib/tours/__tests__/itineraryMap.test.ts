import { itineraryMapStops, itineraryStaticMapUrl } from '@/lib/tours/itineraryMap';

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

  it('gives the start a prominent marker and the rest smaller ones', () => {
    const url = itineraryStaticMapUrl(['El Gouna', 'Valley of the Kings', 'Luxor'], 'k');
    expect(url).toContain('staticmap');
    expect(url).toContain(encodeURIComponent('size:mid|color:red|label:1|El Gouna, Egypt'));
    expect(url).toContain(encodeURIComponent('size:small|color:blue|Valley of the Kings, Egypt|Luxor, Egypt'));
  });

  it('does not duplicate an existing Egypt country context', () => {
    const url = itineraryStaticMapUrl(['Luxor, Egypt', 'Karnak, Ägypten'], 'k');
    const markers = new URL(url!).searchParams.getAll('markers').join('|');
    expect(markers).toContain('Luxor, Egypt');
    expect(markers).toContain('Karnak, Ägypten');
    expect(markers).not.toContain('Egypt, Egypt');
  });
});
