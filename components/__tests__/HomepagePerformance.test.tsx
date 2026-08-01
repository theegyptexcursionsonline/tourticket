import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import DeferredAISearchWidget from '@/components/DeferredAISearchWidget';
import HeroSectionStable from '@/components/HeroSectionStable';
import FeaturedToursServer from '@/components/FeaturedToursServer';

jest.mock('@/components/BookingSidebar', () => () => null);
jest.mock('@/components/AISearchWidget', () => () => <div data-testid="full-ai-search-widget" />);
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img {...props} />,
}));

const heroImages = [
  { desktop: '/hero-a.jpg', alt: 'Hero A' },
  { desktop: '/hero-b.jpg', alt: 'Hero B' },
  { desktop: '/hero-c.jpg', alt: 'Hero C' },
];

const tours = Array.from({ length: 6 }, (_, index) => ({
  _id: `tour-${index}`,
  title: `Tour ${index}`,
  slug: `tour-${index}`,
  image: `/tour-${index}.jpg`,
  description: `Tour ${index} description`,
  duration: '4 hours',
  rating: 4.8,
  bookings: 10,
  originalPrice: 100,
  discountPrice: 80,
}));

describe('homepage performance contracts', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps only the active hero image mounted between transitions', () => {
    jest.useFakeTimers();
    const { container } = render(
      <HeroSectionStable
        initialSettings={{
          backgroundImages: heroImages,
          animationSettings: { enableAutoplay: true, slideshowSpeed: 1, fadeSpeed: 300 },
        }}
      />,
    );

    expect(container.querySelectorAll('[data-hero-slide]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-hero-slide="active"] img')).toHaveLength(1);

    act(() => jest.advanceTimersByTime(1000));
    expect(container.querySelectorAll('[data-hero-slide]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-hero-slide="previous"]')).toHaveLength(1);

    act(() => jest.advanceTimersByTime(300));
    expect(container.querySelectorAll('[data-hero-slide]')).toHaveLength(1);
  });

  it('renders each featured tour once without a duplicated marquee tree', () => {
    const { container } = render(<FeaturedToursServer tours={tours as never} />);

    expect(container.querySelectorAll('h3')).toHaveLength(tours.length);
    expect(container.querySelector('[data-testid="featured-tours-scroll"]')).toBeInTheDocument();
    expect(container.querySelector('.animate-marquee')).not.toBeInTheDocument();
  });

  it('keeps the full AI search bundle out of the scroll path until the visitor opens it', async () => {
    const requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 });

    const { getByRole, queryByTestId } = render(<DeferredAISearchWidget />);

    act(() => window.dispatchEvent(new Event('scroll')));
    expect(queryByTestId('full-ai-search-widget')).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Open tour search and AI travel assistant' }));
    await waitFor(() => expect(queryByTestId('full-ai-search-widget')).toBeInTheDocument());

    requestAnimationFrameSpy.mockRestore();
  });
});
