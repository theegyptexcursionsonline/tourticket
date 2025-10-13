import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from '../page'

// Mock all the components
jest.mock('@/components/Header', () => {
  const Header = () => <div data-testid="header">Header</div>;
  Header.displayName = 'Header';
  return Header;
})
jest.mock('@/components/Footer', () => {
  const Footer = () => <div data-testid="footer">Footer</div>;
  Footer.displayName = 'Footer';
  return Footer;
})
jest.mock('@/components/HeroSection', () => {
  const HeroSection = () => <div data-testid="hero">Hero</div>;
  HeroSection.displayName = 'HeroSection';
  return HeroSection;
})
jest.mock('@/components/DayTrips', () => {
  const DayTrips = () => <div data-testid="daytrips">DayTrips</div>;
  DayTrips.displayName = 'DayTrips';
  return DayTrips;
})
jest.mock('@/components/FeaturedTours', () => {
  const FeaturedTours = () => <div data-testid="featured">Featured</div>;
  FeaturedTours.displayName = 'FeaturedTours';
  return FeaturedTours;
})
jest.mock('@/components/Destinations', () => {
  const Destinations = () => <div data-testid="destinations">Destinations</div>;
  Destinations.displayName = 'Destinations';
  return Destinations;
})
jest.mock('@/components/InterestGrid', () => {
  const InterestGrid = () => <div data-testid="interests">Interests</div>;
  InterestGrid.displayName = 'InterestGrid';
  return InterestGrid;
})
jest.mock('@/components/Reviews', () => {
  const Reviews = () => <div data-testid="reviews">Reviews</div>;
  Reviews.displayName = 'Reviews';
  return Reviews;
})
jest.mock('@/components/FAQ', () => {
  const FAQ = () => <div data-testid="faq">FAQ</div>;
  FAQ.displayName = 'FAQ';
  return FAQ;
})
jest.mock('@/components/IcebarPromo', () => {
  const IcebarPromo = () => <div data-testid="icebar">IcebarPromo</div>;
  IcebarPromo.displayName = 'IcebarPromo';
  return IcebarPromo;
})
jest.mock('@/components/PopularInterest', () => {
  const PopularInterest = () => <div data-testid="popular">PopularInterest</div>;
  PopularInterest.displayName = 'PopularInterest';
  return PopularInterest;
})
jest.mock('@/components/AboutUs', () => {
  const AboutUs = () => <div data-testid="about">AboutUs</div>;
  AboutUs.displayName = 'AboutUs';
  return AboutUs;
})
jest.mock('@/components/ReviewsStructuredData', () => {
  const ReviewsStructuredData = () => null;
  ReviewsStructuredData.displayName = 'ReviewsStructuredData';
  return ReviewsStructuredData;
})
jest.mock('@/components/ElfsightWidget', () => {
  const ElfsightWidget = () => null;
  ElfsightWidget.displayName = 'ElfsightWidget';
  return ElfsightWidget;
})

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
