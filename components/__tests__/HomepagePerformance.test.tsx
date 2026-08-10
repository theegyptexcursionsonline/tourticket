import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HeroSectionStable from '@/components/HeroSectionStable';
import FeaturedToursServer from '@/components/FeaturedToursServer';

jest.mock('@/components/BookingSidebar', () => () => null);
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

  it('makes every featured photo cover its responsive media frame', () => {
    render(<FeaturedToursServer tours={tours as never} />);

    const frames = screen.getAllByTestId('featured-tour-media');
    expect(frames).toHaveLength(tours.length);

    frames.forEach((frame, index) => {
      expect(frame).toHaveClass('relative', 'h-40', 'w-full', 'overflow-hidden', 'sm:h-48', 'md:h-56');
      expect(frame).not.toHaveAttribute('style');

      const image = screen.getByAltText(`Tour ${index}`);
      expect(image).toHaveClass('h-full', 'w-full', 'object-cover');
    });
  });

  it('opens the singleton hosted search instead of mounting a second widget', () => {
    const opened = jest.fn();
    window.addEventListener('foxes:search:open', opened, { once: true });
    render(<HeroSectionStable />);

    fireEvent.click(screen.getByTestId('hosted-ai-search-entry'));

    expect(opened).toHaveBeenCalledTimes(1);
    expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual(expect.objectContaining({
      query: '',
      mode: 'catalog',
    }));
    expect(document.querySelectorAll('[data-testid="hosted-ai-search-entry"]')).toHaveLength(1);
  });

});
