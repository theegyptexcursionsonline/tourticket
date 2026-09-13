import {
  toDestinationTourPayload,
  toToursIndexPayload,
} from '@/lib/content/storefrontTourPayload';

const sourceTour = {
  _id: { toString: () => 'tour-1' },
  title: 'Cairo highlights',
  description: 'Card search copy',
  slug: 'cairo-highlights',
  image: '/tour.jpg',
  discountPrice: 45,
  duration: '8 hours',
  bookingOptions: [{ label: 'Private', price: 45 }],
  availability: { type: 'daily', slots: [] },
  destination: { _id: 'dest-1', name: 'Cairo', slug: 'cairo', longDescription: 'large' },
  category: { _id: 'cat-1', name: 'Day trips', slug: 'day-trips', translations: { de: { name: 'Ausflüge' } } },
  translations: { de: { longDescription: 'very large translated content' } },
  itinerary: [{ title: 'Unused itinerary' }],
  faq: [{ question: 'Unused FAQ' }],
  images: Array.from({ length: 20 }, (_, index) => `/gallery-${index}.jpg`),
};

describe('storefront tour payloads', () => {
  it('keeps booking fields but removes detail-only content from destination pages', () => {
    const payload = toDestinationTourPayload(sourceTour);

    expect(payload).toMatchObject({
      _id: 'tour-1',
      title: 'Cairo highlights',
      bookingOptions: sourceTour.bookingOptions,
      availability: sourceTour.availability,
      destination: { _id: 'dest-1', name: 'Cairo', slug: 'cairo' },
      category: { _id: 'cat-1', name: 'Day trips', slug: 'day-trips' },
    });
    expect(payload).not.toHaveProperty('translations');
    expect(payload).not.toHaveProperty('itinerary');
    expect(payload).not.toHaveProperty('faq');
    expect(payload).not.toHaveProperty('images');
    expect(payload.category).not.toHaveProperty('translations');
  });

  it('emits only the fields needed by the all-tours cards and filters', () => {
    const payload = toToursIndexPayload(sourceTour);

    expect(payload).toMatchObject({
      _id: 'tour-1',
      title: 'Cairo highlights',
      description: 'Card search copy',
      destination: { name: 'Cairo' },
      categories: [{ name: 'Day trips' }],
    });
    expect(payload).not.toHaveProperty('bookingOptions');
    expect(payload).not.toHaveProperty('availability');
    expect(payload).not.toHaveProperty('translations');
  });
});
