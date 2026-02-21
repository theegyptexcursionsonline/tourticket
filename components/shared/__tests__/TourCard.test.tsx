import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TourCard from '../TourCard'
import { Tour } from '@/types'

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
    t: (key: string) => key,
  }),
}))

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: jest.fn(),
  }),
}))

jest.mock('@/contexts/WishlistContext', () => ({
  useWishlist: () => ({
    wishlist: [],
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    isWishlisted: jest.fn(() => false),
    toggleWishlist: jest.fn(),
    isWishlistSidebarOpen: false,
    openWishlistSidebar: jest.fn(),
    closeWishlistSidebar: jest.fn(),
    isLoading: false,
  }),
}))

describe('TourCard', () => {
  const mockTour = {
    _id: '1',
    title: 'Pyramids Tour',
    slug: 'pyramids-tour',
    image: '/images/pyramid.jpg',
    description: 'Visit the ancient pyramids',
    duration: '4 hours',
    rating: 4.8,
    bookings: 1500,
    originalPrice: 100,
    discountPrice: 80,
    tags: ['Popular', '20% OFF'],
  }

  it('should render tour information', () => {
    render(<TourCard tour={mockTour as Tour} />)

    expect(screen.getByText('Pyramids Tour')).toBeInTheDocument()
    expect(screen.getByText('4 hours')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
  })

  it('should render price information', () => {
    render(<TourCard tour={mockTour as Tour} />)

    expect(screen.getByText('$80.00')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument() // original price
  })

  it('should render tour image', () => {
    render(<TourCard tour={mockTour as Tour} />)

    const image = screen.getByAltText('Pyramids Tour')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', expect.stringContaining('pyramid.jpg'))
  })

  it('should render rating', () => {
    render(<TourCard tour={mockTour as Tour} />)

    expect(screen.getByText('4.8')).toBeInTheDocument()
  })

  it('should render tour link with correct slug', () => {
    render(<TourCard tour={mockTour as Tour} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/pyramids-tour')
  })

  it('should be clickable and navigate to tour details', () => {
    render(<TourCard tour={mockTour as Tour} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('pyramids-tour'))
  })

  it('should render first tag', () => {
    render(<TourCard tour={mockTour as Tour} />)

    // TourCard renders only the first tag via slice(0, 1)
    expect(screen.getByText('Popular')).toBeInTheDocument()
  })

  it('should handle missing optional fields gracefully', () => {
    const minimalTour = {
      _id: '2',
      title: 'Basic Tour',
      slug: 'basic-tour',
      image: '',
      discountPrice: 50,
    }

    render(<TourCard tour={minimalTour as Tour} />)

    expect(screen.getByText('Basic Tour')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
  })

  it('should show add to cart button', async () => {
    const user = userEvent.setup()
    render(<TourCard tour={mockTour as Tour} />)

    const addButton = screen.getByLabelText(/add to cart/i) || screen.getByRole('button')
    expect(addButton).toBeInTheDocument()

    await user.click(addButton)
    // Should trigger add to cart
  })

  it('should display discount price when discount exists', () => {
    render(<TourCard tour={mockTour as Tour} />)

    // The discount is shown via the discountPrice vs originalPrice
    expect(screen.getByText('$80.00')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })
})
