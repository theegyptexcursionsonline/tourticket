import React from 'react'
import { render, screen } from '@testing-library/react'
import EgyptToursClient from '../EgyptToursClient'

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}))

jest.mock('@/components/BookingSidebar', () => {
  return function MockBookingSidebar() {
    return null
  }
})

describe('EgyptToursClient', () => {
  const tour = {
    _id: 'tour-1',
    title: 'Cairo Test Tour',
    slug: 'cairo-test-tour',
    image: '/images/cairo.jpg',
    duration: '4 hours',
    rating: 4.8,
    bookings: 0,
    originalPrice: 100,
    discountPrice: 80,
    tags: [],
  }

  it('does not publish a zero-booking label', () => {
    render(<EgyptToursClient tours={[tour] as never} />)

    expect(screen.getByText('Cairo Test Tour')).toBeInTheDocument()
    expect(screen.queryByText(/0 booked/i)).not.toBeInTheDocument()
    expect(screen.getByText('4 hours')).toBeInTheDocument()
  })
})
