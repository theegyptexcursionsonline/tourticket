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

  it('routes the chat action into the one hosted AI Search surface', () => {
    const opened = jest.fn()
    window.addEventListener('foxes:search:open', opened, { once: true })
    render(<Footer />)

    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))

    expect(opened).toHaveBeenCalledTimes(1)
    expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual(expect.objectContaining({
      query: '',
      mode: 'ai',
      locale: 'en',
    }))
  })
})
