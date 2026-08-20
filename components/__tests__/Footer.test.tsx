import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import Footer from '../Footer'

// Mock the useSettings hook
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    selectedCurrency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    selectedLanguage: { code: 'en', name: 'English', nativeName: 'English' },
    exchangeRates: { USD: 1 },
    isLoading: false,
    formatPrice: (v: number) => `$${Number(v).toFixed(2)}`,
    formatNumber: (v: number) => String(v),
    formatDate: (v: string) => String(v),
    t: (key: string) => key,
    setCurrency: jest.fn(),
    setLanguage: jest.fn(),
  }),
}))

describe('Footer', () => {
  afterEach(() => {
    window.__foxesSearchPending = null
  })

  it('should render footer', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo') || document.querySelector('footer')).toBeInTheDocument()
  })

  it('should render company information', () => {
    render(<Footer />)
    expect(screen.getByText(/egypt excursions online|all rights reserved/i)).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<Footer />)
    expect(screen.getByText(/about/i) || screen.getByText(/contact/i)).toBeInTheDocument()
  })

  it('should render social media links', () => {
    render(<Footer />)
    // Check for common social media patterns
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should render copyright notice', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument()
  })

  it('should have accessible links', () => {
    render(<Footer />)
    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveAttribute('href')
    })
  })

  it('"Chat with us" opens the FoxesConnect support widget, never the AI surface', () => {
    const open = jest.fn()
    const aiOpened = jest.fn()
    ;(window as unknown as { FoxesConnect?: { open: () => void } }).FoxesConnect = { open }
    window.addEventListener('foxes:search:open', aiOpened, { once: true })
    render(<Footer />)

    fireEvent.click(screen.getByRole('button', { name: 'Open support chat' }))

    expect(open).toHaveBeenCalledTimes(1)
    expect(aiOpened).not.toHaveBeenCalled()
    delete (window as unknown as { FoxesConnect?: unknown }).FoxesConnect
  })
})
