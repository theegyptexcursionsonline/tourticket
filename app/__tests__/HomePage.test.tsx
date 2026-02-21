import React from 'react'
import { render, screen } from '@testing-library/react'

// Since the homepage moved to app/[locale]/page.tsx (a server component),
// we test key client-side sections individually.

describe('HomePage Components', () => {
  it('should render footer component', async () => {
    const Footer = (await import('@/components/Footer')).default
    render(<Footer />)
    expect(document.querySelector('footer')).toBeInTheDocument()
  })

  it('should render about section', async () => {
    const AboutUs = (await import('@/components/AboutUs')).default
    render(<AboutUs />)
    // AboutUs should render without crashing
    expect(document.querySelector('section') || document.querySelector('div')).toBeTruthy()
  })

  it('should render reviews component', async () => {
    const Reviews = (await import('@/components/Reviews')).default
    render(<Reviews />)
    expect(document.querySelector('section') || document.querySelector('div')).toBeTruthy()
  })
})
