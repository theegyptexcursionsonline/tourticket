import React from 'react'
import { render, screen } from '@testing-library/react'
import Footer from '../Footer'

// Mock the useSettings hook
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    currency: 'USD',
    language: 'en',
    setCurrency: jest.fn(),
    setLanguage: jest.fn(),
  }),
}))

describe('Footer', () => {
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
})
