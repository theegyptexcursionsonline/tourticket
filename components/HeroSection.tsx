"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';

// --- SVG Icon Components ---

const PhoneIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const XIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);


// --- Type Definitions ---
type Slide = {
  headline: string;
  subheading: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
};

type HeroSectionProps = {
  onGetQuoteClick: () => void;
};

// --- Data Constants ---
const SLIDES_DATA: Slide[] = [
  {
    headline: "Excellence in Transformer Tank Fabrication",
    subheading: "An ISO 9001:2015, 14001:2015 & 45001:2018 Certified Company",
    buttonText: "Our Capabilities",
    buttonLink: "#capabilities",
    imageUrl: "/main.png"
  },
  {
    headline: "Delivering Robust & Reliable Steel Solutions",
    subheading: "Your trusted partner in the energy sector since 2021.",
    buttonText: "View Our Process",
    buttonLink: "#process",
    imageUrl: "/bgimage2.png"
  },
  {
    headline: "Ready to Fabricate Your Next Project?",
    subheading: "We handle projects from 2.5 MVA to 160 MVA with precision and care.",
    buttonText: "Request a Quote",
    buttonLink: "#",
    imageUrl: "/bgimage3.png"
  }
];

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/products', label: 'Our Products' },
    { href: '/quality', label: 'Quality' },
    { href: '/contact', label: 'Contact' },
];

// --- Sub-components ---

const TopBar = () => (
    <div className="bg-gray-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-2 flex justify-between items-center text-xs sm:text-sm">
            <div className="flex items-center">
                <PhoneIcon className="h-4 w-4 mr-2" />
                <span>Phone: +91 9893030763</span>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
                <a href="/careers" className="hover:text-gray-300 transition-colors">Careers</a>
                <a href="/contact" className="hover:text-gray-300 transition-colors">Contact</a>
            </div>
        </div>
    </div>
);

const Navigation = ({ onGetQuoteClick, onMenuToggle, isMenuOpen }: { onGetQuoteClick: () => void; onMenuToggle: () => void; isMenuOpen: boolean; }) => (
    <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex-shrink-0">
                <Image src="/mklogo.png" alt="M.K. Industries Logo" width={160} height={80} className="h-20 w-auto object-contain" priority />
            </div>
            <div className="hidden md:flex items-center space-x-10 text-gray-700 font-semibold">
                {NAV_LINKS.map(link => (
                     <a key={link.href} href={link.href} className="hover:text-blue-700 relative py-2 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-blue-700 after:scale-x-0 after:transition-transform after:duration-300 after:origin-left hover:after:scale-x-100">
                        {link.label}
                    </a>
                ))}
            </div>
            <div className="hidden md:flex items-center">
                <button onClick={onGetQuoteClick} className="bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-6 transition-colors rounded-md">
                    Get a Quote
                </button>
            </div>
            <div className="md:hidden flex items-center space-x-4">
                <button onClick={onGetQuoteClick} className="bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-4 transition-colors rounded-md text-sm">
                    Get a Quote
                </button>
                <button onClick={onMenuToggle} aria-label="Toggle menu" aria-expanded={isMenuOpen}>
                    {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                </button>
            </div>
        </div>
    </nav>
);

const MobileMenu = ({ isOpen, onMenuToggle }: { isOpen: boolean; onMenuToggle: () => void; }) => {
    if (!isOpen) return null;

    return (
        <div className="md:hidden bg-white shadow-lg absolute w-full animate-fade-in-down z-40">
            <nav className="flex flex-col items-center pt-4 pb-2">
            {NAV_LINKS.map((link, index) => (
                    <a key={link.href} href={link.href} className={`block w-full text-center px-6 py-4 font-semibold transition-colors ${index === 0 ? 'bg-blue-700 text-white' : 'hover:bg-blue-50 hover:text-blue-700'}`}>
                        {link.label}
                    </a>
                ))}
            </nav>
        </div>
    );
};

const CarouselSlide = ({ slide, isActive, onGetQuoteClick }: { slide: Slide; isActive: boolean; onGetQuoteClick: () => void; }) => (
    <div
        className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col justify-center items-center text-center ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
        aria-hidden={!isActive}
    >
        <div className="space-y-6">
            <h2 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-tight [text-shadow:_2px_2px_4px_rgb(0_0_0_/_60%)] transform transition-all duration-700 delay-100 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                {slide.headline}
            </h2>
            <p className={`text-lg md:text-xl font-light [text-shadow:_1px_1px_2px_rgb(0_0_0_/_60%)] transform transition-all duration-700 delay-200 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                {slide.subheading}
            </p>
            <button
                onClick={() => {
                    if (slide.buttonLink === '#') {
                        onGetQuoteClick();
                    } else {
                        window.location.href = slide.buttonLink;
                    }
                }}
                className={`inline-block bg-white text-gray-800 font-semibold py-3 px-8 hover:bg-gray-200 transition-all duration-300 rounded-md shadow-lg transform ${isActive ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-4 opacity-0'}`}
                tabIndex={isActive ? 0 : -1}
            >
                {slide.buttonText}
            </button>
        </div>
    </div>
);

// --- Main HeroSection Component ---

const HeroSection = ({ onGetQuoteClick }: HeroSectionProps) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const slides = useMemo(() => SLIDES_DATA, []);

    // Preload images
    useEffect(() => {
        slides.forEach(slide => {
            const img = new window.Image();
            img.src = slide.imageUrl;
        });
    }, [slides]);

    // Automatic slide transition
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const nextSlide = useCallback(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    const handleMenuToggle = () => {
        setIsMenuOpen(prev => !prev);
    };
    
    return (
        <>
            <header className="relative z-50">
                <TopBar />
                <Navigation onGetQuoteClick={onGetQuoteClick} onMenuToggle={handleMenuToggle} isMenuOpen={isMenuOpen} />
                <MobileMenu isOpen={isMenuOpen} onMenuToggle={handleMenuToggle} />
            </header>
            
            <section className="h-screen md:h-[90vh] relative -mt-[120px] text-white overflow-hidden" aria-roledescription="carousel" aria-label="Highlighted features">
                {/* Background Images */}
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        style={{ backgroundImage: `url('${slide.imageUrl}')` }}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`Slide ${index + 1} of ${slides.length}`}
                        aria-hidden={index !== currentSlide}
                    />
                ))}
                
                {/* Slide Content */}
                <div className="relative z-20 w-full h-full flex flex-col justify-center items-center text-center">
                    <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-3xl mx-auto">
                            <div className="relative h-80 overflow-hidden">
                                {slides.map((slide, index) => (
                                    <CarouselSlide key={index} slide={slide} isActive={index === currentSlide} onGetQuoteClick={onGetQuoteClick} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Carousel Controls */}
                <div className="absolute z-30 w-full top-1/2 -translate-y-1/2 flex justify-between px-3 sm:px-6">
                    <button onClick={prevSlide} className="bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Previous slide">
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    <button onClick={nextSlide} className="bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Next slide">
                        <ChevronRightIcon className="h-6 w-6" />
                    </button>
                </div>
                
                {/* Carousel Pagination */}
                <div className="absolute z-30 bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-200 ${currentSlide === index ? 'bg-white scale-125' : 'bg-white bg-opacity-60 hover:bg-opacity-80'}`}
                            aria-label={`Go to slide ${index + 1}`}
                            aria-current={currentSlide === index}
                        />
                    ))}
                </div>
            </section>
        </>
    );
};

export default HeroSection;