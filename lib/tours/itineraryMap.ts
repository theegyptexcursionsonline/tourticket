// Itinerary map rules (client sheet 02.08, N4):
// - The map renders ONLY from locations an editor typed into itinerary steps.
//   With none, there is no map — never a guess from the tour title's keywords.
// - Each distinct physical location receives a numbered marker, in itinerary
//   order, and the route order is visible as a line between those stops.
// - A round trip (last location equals the first) reuses the start marker
//   instead of stacking a second one, and repeated stops render once.

export interface ItineraryStepLike {
  location?: string | null;
}

const STATIC_MAP_MARKER_LABELS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STATIC_MAP_START_COLOR = '0xB91C1C';
const STATIC_MAP_STOP_COLOR = '0xEF4444';
const STATIC_MAP_ROUTE_COLOR = '0xDC2626E6';

// Editor-facing itinerary copy often uses travel-stage labels in the location
// field. Those labels are useful in the timeline, but they are not real map
// places and can make Google zoom out to a world view. Keep them in the cards
// while excluding them from map geocoding.
const GENERIC_LOCATION_LABELS = new Set([
  'your hotel',
  'hotel pickup',
  'hotel pick up',
  'hotel drop-off',
  'hotel drop off',
  'pickup point',
  'pick up point',
  'drop-off point',
  'drop off point',
  'meeting point',
  'start point',
  'end point',
  'en route',
  'on the way',
  'various locations',
  'local restaurant',
  'restaurant',
  'lunch stop',
  'lunch break',
  'lunch',
  'ihr hotel',
  'hotelabholung',
  'abholung vom hotel',
  'rückfahrt zum hotel',
  'unterwegs',
]);

function isMappableLocation(location: string): boolean {
  const normalized = location
    .toLocaleLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[.,:;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 2 && !GENERIC_LOCATION_LABELS.has(normalized);
}

export function itineraryMapStops(itinerary: ItineraryStepLike[]): string[] {
  const locations = (itinerary || [])
    .map((step) => String(step?.location || '').trim())
    .filter(isMappableLocation);

  if (locations.length > 1 && locations[locations.length - 1].toLowerCase() === locations[0].toLowerCase()) {
    locations.pop();
  }

  const seen = new Set<string>();
  const stops: string[] = [];
  for (const location of locations) {
    const key = location.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    stops.push(location);
  }
  return stops;
}

function hasEgyptCountryContext(value: string): boolean {
  return /(?:\bEgypt\b|\bÄgypten\b|مصر)/iu.test(value);
}

function egyptScopedStop(stop: string): string {
  return hasEgyptCountryContext(stop) ? stop : `${stop}, Egypt`;
}

// Itinerary locations are short, editor-facing landmark names. When the tour
// has a published city, include it in the Google query so names such as
// "Citadel" and "Hanging Church" resolve to the tour's city rather than a
// similarly named place elsewhere in Egypt.
function mapStopQuery(stop: string, tourLocation?: string | null): string {
  const normalizedTourLocation = String(tourLocation || '').trim();
  if (!normalizedTourLocation || hasEgyptCountryContext(stop)) {
    return egyptScopedStop(stop);
  }
  return `${stop}, ${egyptScopedStop(normalizedTourLocation)}`;
}

// A no-key fallback is still needed on tenant deployments that do not expose
// the Google Embed API key. Country-scoping is mandatory: generic business
// names such as "Luxor Restaurant" otherwise resolve to unrelated countries.
export function itineraryEmbedMapUrl(stop: string, apiKey?: string | null, tourLocation?: string | null): string {
  const scopedStop = mapStopQuery(stop, tourLocation);
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(scopedStop)}&zoom=12`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(scopedStop)}&z=11&output=embed`;
}

// Static Maps URL with a numbered marker for every distinct physical stop and
// a line showing their itinerary order. It is used for 2+ stops (a single stop
// keeps the richer interactive place embed); returns null without a key so the
// caller can hide the map instead of rendering a broken image.
export function itineraryStaticMapUrl(stops: string[], apiKey?: string | null, tourLocation?: string | null): string | null {
  if (!apiKey || stops.length < 2) return null;

  // These storefronts sell Egypt experiences. Supplying the country context
  // prevents ambiguous editor labels (for example, "Luxor Restaurant") from
  // resolving to an unrelated place abroad and zooming the route to the world.
  const mapStops = stops.map((stop) => mapStopQuery(stop, tourLocation));
  const markers = mapStops.map((stop, index) => {
    const label = STATIC_MAP_MARKER_LABELS[index];
    // Keep every stop in one red route system. The darker first marker makes
    // the starting point distinct without forcing visitors to decode a second
    // unrelated colour.
    const color = index === 0 ? STATIC_MAP_START_COLOR : STATIC_MAP_STOP_COLOR;
    const marker = `size:mid|color:${color}${label ? `|label:${label}` : ''}|${stop}`;
    return `markers=${encodeURIComponent(marker)}`;
  });
  const parts = [
    'size=640x640',
    'scale=2',
    'maptype=roadmap',
    // This is route order, not turn-by-turn driving directions. Directions
    // need a server-side Directions API request and a client-approved key.
    // A thicker, high-opacity red stroke remains legible over Google's blue
    // roads, waterways and grey city labels.
    `path=${encodeURIComponent(`weight:5|color:${STATIC_MAP_ROUTE_COLOR}|geodesic:true|${mapStops.join('|')}`)}`,
    ...markers,
    `key=${encodeURIComponent(apiKey)}`,
  ];
  return `https://maps.googleapis.com/maps/api/staticmap?${parts.join('&')}`;
}
