import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from '../page'

// Mock all the components
jest.mock('@/components/Header', () => () => <div data-testid="header">Header</div>)
jest.mock('@/components/Footer', () => () => <div data-testid="footer">Footer</div>)
jest.mock('@/components/HeroSection', () => () => <div data-testid="hero">Hero</div>)
jest.mock('@/components/DayTrips', () => () => <div data-testid="daytrips">DayTrips</div>)
jest.mock('@/components/FeaturedTours', () => () => <div data-testid="featured">Featured</div>)
jest.mock('@/components/Destinations', () => () => <div data-testid="destinations">Destinations</div>)
jest.mock('@/components/InterestGrid', () => () => <div data-testid="interests">Interests</div>)
jest.mock('@/components/Reviews', () => () => <div data-testid="reviews">Reviews</div>)
jest.mock('@/components/FAQ', () => () => <div data-testid="faq">FAQ</div>)
jest.mock('@/components/IcebarPromo', () => () => <div data-testid="icebar">IcebarPromo</div>)
jest.mock('@/components/PopularInterest', () => () => <div data-testid="popular">PopularInterest</div>)
jest.mock('@/components/AboutUs', () => () => <div data-testid="about">AboutUs</div>)
jest.mock('@/components/ReviewsStructuredData', () => () => null)
jest.mock('@/components/ElfsightWidget', () => () => null)

describe('HomePage', () => {
  it('should render all main sections', () => {
    render(<HomePage />)

    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('hero')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('should render featured tours section', () => {
    render(<HomePage />)

    expect(screen.getByTestId('featured') || screen.getByTestId('daytrips')).toBeInTheDocument()
  })

  it('should render destinations section', () => {
    render(<HomePage />)

    expect(screen.getByTestId('destinations')).toBeInTheDocument()
  })

  it('should be accessible', () => {
    const { container } = render(<HomePage />)

    // Check for main element
    expect(container.querySelector('main') || container.querySelector('[role="main"]')).toBeTruthy()
  })
})
