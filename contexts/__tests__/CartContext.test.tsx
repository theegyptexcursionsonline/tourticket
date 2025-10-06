import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { CartProvider, useCart } from '../CartContext'

// Component to test the hook
function TestComponent() {
  const { cart, addToCart, removeFromCart, clearCart, totalItems } = useCart()

  return (
    <div>
      <div data-testid="cart-count">{totalItems}</div>
      <div data-testid="cart-items">{JSON.stringify(cart)}</div>
      <button onClick={() => addToCart({
        id: '1',
        title: 'Test Tour',
        price: 100,
        quantity: 1,
        selectedDate: '2024-01-01',
      } as any, false)}>
        Add Item
      </button>
      <button onClick={() => removeFromCart('1')}>Remove Item</button>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  )
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should initialize with empty cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
  })

  it('should add item to cart', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    const addButton = screen.getByText('Add Item')

    await act(async () => {
      addButton.click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
  })

  it('should remove item from cart', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    const addButton = screen.getByText('Add Item')
    const removeButton = screen.getByText('Remove Item')

    await act(async () => {
      addButton.click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')

    await act(async () => {
      removeButton.click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
  })

  it('should clear cart', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    const addButton = screen.getByText('Add Item')
    const clearButton = screen.getByText('Clear Cart')

    await act(async () => {
      addButton.click()
      addButton.click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('2')

    await act(async () => {
      clearButton.click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
  })

  it('should persist cart to localStorage', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    const addButton = screen.getByText('Add Item')

    await act(async () => {
      addButton.click()
    })

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const stored = localStorage.getItem('cart')
    expect(stored).toBeTruthy()
  })
})
