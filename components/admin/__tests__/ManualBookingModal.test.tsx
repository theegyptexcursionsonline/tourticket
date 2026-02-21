import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import ManualBookingModal from '@/components/admin/ManualBookingModal'

// Avoid Google Maps / Places loading in unit tests
jest.mock('@/components/HotelPickupMap', () => {
  return function MockHotelPickupMap(props: { onLocationSelect: (loc: any) => void }) {
    // Expose a simple button to simulate selecting a place
    return (
      <button
        type="button"
        onClick={() =>
          props.onLocationSelect({
            address: 'Hilton Hurghada, Egypt',
            lat: 27.2579,
            lng: 33.8116,
            placeId: 'test_place_id',
            name: 'Hilton Hurghada',
          })
        }
      >
        Mock Pick Location
      </button>
    )
  }
})

describe('ManualBookingModal', () => {
  beforeEach(() => {
    // Mock tours fetch
    global.fetch = jest.fn(async (input: RequestInfo) => {
      if (String(input).includes('/api/admin/tours')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                _id: 't1',
                title: 'Sample Tour',
                slug: 'sample-tour',
                discountPrice: 84.24,
                bookingOptions: [
                  { type: 'standard', label: 'Standard', price: 84.24 },
                  { type: 'vip', label: 'VIP', price: 120 },
                ],
              },
            ],
          }),
        } as any
      }

      // Booking create endpoint (not exercised in this test)
      return { ok: true, json: async () => ({}) } as any
    }) as any
  })

  it('shows non-zero base price and allows selecting a pickup location', async () => {
    render(<ManualBookingModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

    // Tour list should render with correct base price (from bookingOptions / discountPrice)
    await waitFor(() => {
      expect(screen.getByText('Sample Tour')).toBeInTheDocument()
    })
    expect(screen.getByText(/Base price:\s*\$84\.24 per adult/i)).toBeInTheDocument()

    // Select tour and go to Customer Info
    fireEvent.click(screen.getByText('Sample Tour'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/Customer Info/i)).toBeInTheDocument()

    // Simulate selecting pickup location via mocked map
    fireEvent.click(screen.getByRole('button', { name: /mock pick location/i }))

    // The optional hotel pickup input should be populated if empty
    const pickupInput = screen.getByPlaceholderText(/hotel name \(optional\)/i) as HTMLInputElement
    expect(pickupInput.value).toContain('Hilton Hurghada')
  })
})


