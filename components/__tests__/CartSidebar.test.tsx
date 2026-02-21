import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CartSidebar from '../CartSidebar'

const mockRemoveFromCart = jest.fn()
const mockCloseCart = jest.fn()

// The component reads all state from useCart() - it does NOT accept isOpen/onClose props.
const defaultCartState = {
  cart: [
    {
      id: '1',
      uniqueId: 'unique-1',
      title: 'Pyramids Tour',
      price: 100,
      quantity: 2,
      childQuantity: 0,
      image: '/pyramid.jpg',
      discountPrice: 100,
      selectedDate: '2026-03-01',
      selectedTime: '10:00 AM',
      selectedAddOns: {},
      selectedAddOnDetails: {},
    },
  ],
  totalPrice: 200,
  totalItems: 2,
  removeFromCart: mockRemoveFromCart,
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
  addToCart: jest.fn(),
  isCartOpen: true,
  openCart: jest.fn(),
  closeCart: mockCloseCart,
}

jest.mock('@/hooks/useCart', () => ({
  useCart: jest.fn(() => defaultCartState),
}))

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}))

// Mock framer-motion so AnimatePresence renders children synchronously
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    li: React.forwardRef(({ children, ...props }: any, ref: any) => <li ref={ref} {...props}>{children}</li>),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock parseLocalDate used in CartSidebar
jest.mock('@/utils/date', () => ({
  parseLocalDate: (val: string) => {
    if (!val) return null
    return new Date(val + 'T00:00:00')
  },
}))

describe('CartSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset to default open cart state
    const useCartMock = require('@/hooks/useCart').useCart
    useCartMock.mockReturnValue(defaultCartState)
  })

  it('should render when open', () => {
    render(<CartSidebar />)

    expect(screen.getByText(/cart/i)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    const useCartMock = require('@/hooks/useCart').useCart
    useCartMock.mockReturnValue({
      ...defaultCartState,
      isCartOpen: false,
    })

    render(<CartSidebar />)

    expect(screen.queryByText(/Your Cart/i)).not.toBeInTheDocument()
  })

  it('should display cart items', () => {
    render(<CartSidebar />)

    expect(screen.getByText('Pyramids Tour')).toBeInTheDocument()
    // The item total is discountPrice * quantity = 100 * 2 = $200.00
    // It appears in the item price, the Items summary, and the Total
    expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0)
  })

  it('should display total price', () => {
    render(<CartSidebar />)

    // cartTotal = discountPrice(100) * quantity(2) = $200.00
    expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0)
  })

  it('should call closeCart when close button clicked', async () => {
    const user = userEvent.setup()
    render(<CartSidebar />)

    // The close button has aria-label="Close cart"
    const closeButton = screen.getByLabelText(/close cart/i)
    await user.click(closeButton)

    expect(mockCloseCart).toHaveBeenCalled()
  })

  it('should display item quantity in header', () => {
    render(<CartSidebar />)

    // totalItems (2) appears in the header "Your Cart (2)"
    // and in the guest details "2 Adults"
    expect(screen.getByText(/Your Cart/)).toBeInTheDocument()
    expect(screen.getByText(/2 Adults/)).toBeInTheDocument()
  })

  it('should have checkout button', () => {
    render(<CartSidebar />)

    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument()
  })

  it('should show empty cart message when no items', () => {
    const useCartMock = require('@/hooks/useCart').useCart
    useCartMock.mockReturnValue({
      ...defaultCartState,
      cart: [],
      totalPrice: 0,
      totalItems: 0,
    })

    render(<CartSidebar />)

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('should have remove button for each item', () => {
    render(<CartSidebar />)

    // The remove button has aria-label="Remove Pyramids Tour from cart"
    const removeButton = screen.getByLabelText(/remove pyramids tour from cart/i)
    expect(removeButton).toBeInTheDocument()
  })

  it('should display item image', () => {
    render(<CartSidebar />)

    // The next/image mock renders a plain <img> with alt={item.title}
    const image = screen.getByAltText(/pyramids tour/i)
    expect(image).toBeInTheDocument()
  })
})
