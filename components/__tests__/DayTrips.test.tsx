import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DayTripsSection from '../DayTrips'

// Mock the hooks
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}))

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: jest.fn(),
  }),
}))

// Mock react-hot-toast (used in DayTripCard for wishlist actions)
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

// Mock BookingSidebar
jest.mock('@/components/BookingSidebar', () => {
  return function MockBookingSidebar({ isOpen, onClose, tour }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="booking-sidebar">
        <button onClick={onClose}>Close Sidebar</button>
        <div>{tour?.title}</div>
      </div>
    )
  }
})

describe('DayTripsSection', () => {
  // Note: The next-intl mock in jest.setup.js makes useTranslations return a
  // function that echoes the translation key (e.g. t('errorTitle') -> 'errorTitle').
  // The i18n/routing mock makes <Link href="/x"> render as <a href="/x">.

  // Sample tour data
  const mockTours = [
    {
      _id: '1',
      title: 'Amsterdam Canal Tour',
      slug: 'amsterdam-canal-tour',
      image: '/images/tour1.jpg',
      duration: '2 hours',
      rating: 4.8,
      bookings: 1500,
      originalPrice: 50,
      discountPrice: 40,
      category: 'day-trips',
      tags: ['20% OFF', 'Best Seller'],
    },
    {
      _id: '2',
      title: 'Windmill Village Day Trip',
      slug: 'windmill-village',
      image: '/images/tour2.jpg',
      duration: '4 hours',
      rating: 4.9,
      bookings: 2000,
      originalPrice: 80,
      discountPrice: 65,
      category: 'day-trips',
      tags: ['Staff favourite'],
    },
  ]

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading skeleton while fetching tours', () => {
      // Mock pending fetch
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<DayTripsSection />)

      // Check for loading skeletons
      const skeletons = screen.getAllByRole('generic').filter(el =>
        el.className.includes('animate-pulse')
      )
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Successful Data Fetch', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: mockTours,
        }),
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should render tour cards after successful fetch', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      expect(screen.getByText('Windmill Village Day Trip')).toBeInTheDocument()
    })

    it('should display tour details correctly', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      // Check duration
      expect(screen.getByText('2 hours')).toBeInTheDocument()

      // Check rating
      expect(screen.getByText('4.8')).toBeInTheDocument()

      // Check bookings
      expect(screen.getByText('(1,500)')).toBeInTheDocument()

      // Check prices
      expect(screen.getByText('$40.00')).toBeInTheDocument()
      expect(screen.getByText('$50.00')).toBeInTheDocument()
    })

    it('should render discount tags correctly', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('20% OFF')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({
          error: 'Failed to fetch tours',
        }),
      })

      render(<DayTripsSection />)

      // The component renders t('errorTitle') which, with the mock, returns the key 'errorTitle'
      await waitFor(() => {
        expect(screen.getByText('errorTitle')).toBeInTheDocument()
      })

      // t('showErrorDetails') returns 'showErrorDetails'
      expect(screen.getByText('showErrorDetails')).toBeInTheDocument()
    })

    it('should display retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({
          error: 'Server error',
        }),
      })

      render(<DayTripsSection />)

      // t('retry') returns 'retry'
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: mockTours,
        }),
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should open booking sidebar when add to cart is clicked', async () => {
      const user = userEvent.setup()
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getAllByText('Amsterdam Canal Tour').length).toBeGreaterThan(0)
      })

      // The component uses t('addToCartAria') which returns the key 'addToCartAria'
      const addToCartButtons = screen.getAllByLabelText('addToCartAria')
      await user.click(addToCartButtons[0])

      // Check if sidebar opens
      await waitFor(() => {
        expect(screen.getByTestId('booking-sidebar')).toBeInTheDocument()
      })

      // Tour title should appear in sidebar
      const tourTitles = screen.getAllByText('Amsterdam Canal Tour')
      expect(tourTitles.length).toBeGreaterThan(1) // One in card, one in sidebar
    })

    it('should close booking sidebar when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      // Open sidebar (aria-label is the translation key)
      const addToCartButtons = screen.getAllByLabelText('addToCartAria')
      await user.click(addToCartButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('booking-sidebar')).toBeInTheDocument()
      })

      // Close sidebar
      const closeButton = screen.getByRole('button', { name: /close sidebar/i })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('booking-sidebar')).not.toBeInTheDocument()
      })
    })

    it('should navigate to tour details when card is clicked', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      // The component uses href={`/${trip.slug}`} so the link is /amsterdam-canal-tour
      const tourLink = screen.getByText('Amsterdam Canal Tour').closest('a')
      expect(tourLink).toHaveAttribute('href', '/amsterdam-canal-tour')
    })
  })

  describe('Scroll Functionality', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should render scroll buttons', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      // The component uses t('scrollLeft') and t('scrollRight') as aria-labels,
      // which with the mock return the translation keys
      const scrollLeftButton = screen.getByLabelText('scrollLeft')
      const scrollRightButton = screen.getByLabelText('scrollRight')

      expect(scrollLeftButton).toBeInTheDocument()
      expect(scrollRightButton).toBeInTheDocument()
    })

    it('should call scrollBy when scroll buttons are clicked', async () => {
      const user = userEvent.setup()
      const scrollBySpy = jest.fn()

      // Mock scrollBy
      HTMLElement.prototype.scrollBy = scrollBySpy

      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      const scrollRightButton = screen.getByLabelText('scrollRight')
      await user.click(scrollRightButton)

      expect(scrollBySpy).toHaveBeenCalledWith({ left: 294, behavior: 'smooth' })
    })
  })

  describe('Empty State', () => {
    it('should display error when no tours match the filter', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: [],
        }),
      })

      render(<DayTripsSection />)

      // When no tours are returned, fetchError is set to t('noToursFound') = 'noToursFound'
      // The error UI renders t('errorTitle') = 'errorTitle'
      await waitFor(() => {
        expect(screen.getByText('errorTitle')).toBeInTheDocument()
      }, { timeout: 2000 })

      // t('showErrorDetails') = 'showErrorDetails'
      expect(screen.getByText('showErrorDetails')).toBeInTheDocument()
      // The fetchError itself ('noToursFound') appears in the details <pre> element
      expect(screen.getByText('noToursFound')).toBeInTheDocument()
    })
  })

  describe('SafeImage Component', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: [
            {
              ...mockTours[0],
              image: null, // No image
            },
          ],
        }),
      })
    })

    it('should display placeholder when image is missing', async () => {
      render(<DayTripsSection />)

      // t('noImage') returns the key 'noImage'
      await waitFor(() => {
        expect(screen.getByText('noImage')).toBeInTheDocument()
      })
    })
  })

  describe('Price Formatting', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should format prices correctly', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('$40.00')).toBeInTheDocument()
      })

      expect(screen.getByText('$50.00')).toBeInTheDocument()
    })

    it('should show discount price when available', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        const priceElement = screen.getByText('$40.00')
        expect(priceElement).toBeInTheDocument()
      })

      // Original price should have line-through
      const originalPrice = screen.getByText('$50.00')
      expect(originalPrice.closest('span')).toHaveClass('line-through')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should have proper aria labels for buttons', async () => {
      render(<DayTripsSection />)

      // Translation keys are used as aria-labels with the mock
      await waitFor(() => {
        expect(screen.getByLabelText('scrollLeft')).toBeInTheDocument()
      })

      expect(screen.getByLabelText('scrollRight')).toBeInTheDocument()
      expect(screen.getAllByLabelText('addToCartAria').length).toBeGreaterThan(0)
    })

    it('should have proper link structure for tour cards', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        const tourLink = screen.getByText('Amsterdam Canal Tour').closest('a')
        expect(tourLink).toHaveAttribute('href')
      })
    })
  })

  describe('Data Validation', () => {
    it('should handle tours with missing optional fields', async () => {
      const incompleteTour = {
        _id: '3',
        title: 'Basic Tour',
        slug: 'basic-tour',
        category: 'day-trips',
        // Missing: image, duration, rating, bookings, prices
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: [incompleteTour],
        }),
      })

      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Basic Tour')).toBeInTheDocument()
      }, { timeout: 2000 })

      // t('durationNotSpecified') returns the key 'durationNotSpecified'
      expect(screen.getByText('durationNotSpecified')).toBeInTheDocument()
      expect(screen.getByText('0.0')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should render horizontally scrollable container', async () => {
      render(<DayTripsSection />)

      await waitFor(() => {
        expect(screen.getByText('Amsterdam Canal Tour')).toBeInTheDocument()
      })

      const scrollContainer = document.querySelector('.overflow-x-auto')
      expect(scrollContainer).toBeInTheDocument()
      expect(scrollContainer).toHaveStyle({ scrollbarWidth: 'none' })
    })
  })
})
