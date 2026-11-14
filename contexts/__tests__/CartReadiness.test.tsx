// The checkout page treats an empty cart as "nothing to pay for" and leaves.
// That is only true once the cart has been restored for this visitor, so the
// provider must say when restoring has finished — for a guest (this browser),
// for a signed-in customer (the account), and not while the session is still
// being looked up.
jest.unmock('@/contexts/CartContext')
jest.unmock('@/hooks/useCart')

const mockAuth: { token: string | null; isAuthenticated: boolean; isLoading: boolean } = {
  token: null,
  isAuthenticated: false,
  isLoading: false,
}

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { CartProvider } from '../CartContext'
import { useCart } from '@/hooks/useCart'

function Probe() {
  const { cart, isCartReady } = useCart()
  return (
    <div>
      <span data-testid="ready">{String(isCartReady)}</span>
      <span data-testid="count">{cart.length}</span>
    </div>
  )
}

const storedItem = {
  id: 'tour-1',
  _id: 'tour-1',
  uniqueId: 'tour-1-2026-11-20-08:30',
  title: 'Orange Bay yacht cruise',
  quantity: 2,
  childQuantity: 0,
  infantQuantity: 0,
  selectedDate: '2026-11-20',
  selectedTime: '08:30',
  guestPrices: { adult: 69.17, child: 34.59, infant: 0 },
}

const flushTimers = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers()
  })
}

describe('CartProvider readiness', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
    mockAuth.token = null
    mockAuth.isAuthenticated = false
    mockAuth.isLoading = false
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is not ready on the first render, before the saved cart is read', () => {
    window.localStorage.setItem('cart', JSON.stringify([storedItem]))
    render(<CartProvider><Probe /></CartProvider>)
    expect(screen.getByTestId('ready').textContent).toBe('false')
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('becomes ready for a guest once the saved cart is restored, with its items', async () => {
    window.localStorage.setItem('cart', JSON.stringify([storedItem]))
    render(<CartProvider><Probe /></CartProvider>)
    await flushTimers()
    expect(screen.getByTestId('ready').textContent).toBe('true')
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('becomes ready for a guest with nothing saved, so an empty cart is truly empty', async () => {
    render(<CartProvider><Probe /></CartProvider>)
    await flushTimers()
    expect(screen.getByTestId('ready').textContent).toBe('true')
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('stays not ready while the session is still being looked up', async () => {
    mockAuth.isLoading = true
    render(<CartProvider><Probe /></CartProvider>)
    await flushTimers()
    expect(screen.getByTestId('ready').textContent).toBe('false')
  })

  it('waits for the account cart before a signed-in customer counts as ready', async () => {
    mockAuth.token = 'session'
    mockAuth.isAuthenticated = true
    let resolveFetch: (value: unknown) => void = () => {}
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve }))

    render(<CartProvider><Probe /></CartProvider>)
    await flushTimers()
    expect(screen.getByTestId('ready').textContent).toBe('false')

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ success: true, cart: [] }) })
    })
    expect(screen.getByTestId('ready').textContent).toBe('true')
  })

  it('becomes ready even when the account cart cannot be read, so checkout never hangs', async () => {
    mockAuth.token = 'session'
    mockAuth.isAuthenticated = true
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('offline'))
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<CartProvider><Probe /></CartProvider>)
    await act(async () => {})
    expect(screen.getByTestId('ready').textContent).toBe('true')
    errorSpy.mockRestore()
  })
})
