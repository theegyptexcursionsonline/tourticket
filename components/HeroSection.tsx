"use client";

import React, { useState, useEffect } from 'react';

// This component uses a font from Google Fonts.
// Make sure to import 'Poppins' in your main layout file.

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for the modal

  // Function to toggle modal visibility
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  // Slide content data
  const slides = [
    {
      headline: "Specialists in Transformer Tank Fabrication",
      subheading: "An ISO 9001:2015 Certified Company",
      buttonText: "Explore Products",
      buttonLink: "#products",
      imageUrl: "/bgimage2.png"
    },
    {
      headline: "Premium Quality Manufacturing Solutions",
      subheading: "25+ Years of Excellence in Industrial Fabrication",
      buttonText: "View Our Work",
      buttonLink: "#portfolio",
      imageUrl: "/heroimagemk.png"
    },
    {
      headline: "Trusted Partner for Electrical Infrastructure",
      subheading: "Advanced Technology & Precision Engineering",
      buttonText: "Get Quote Now",
      buttonLink: "#", // Changed to trigger modal
      imageUrl: "/bgimage3.png"
    }
  ];

  // Auto-slide functionality
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <>
      <header className="relative z-50">
        {/* Top Bar */}
        <div className="bg-gray-800 text-white">
          <div className="container mx-auto px-4 sm:px-6 py-2 flex justify-between items-center text-xs sm:text-sm">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>M.: 6265507154</span>
            </div>
            <div className="hidden sm:block">
              <a href="#" className="hover:text-gray-300 transition-colors mr-4">Careers</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Contacts</a>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <img src="/mklogo1.png" alt="M.K. Industries Logo" className="h-20 w-auto object-contain" />
            </div>

            {/* Desktop Navigation links */}
            <div className="hidden md:flex items-center space-x-8 text-gray-600 font-medium">
              <a href="#" className="text-blue-700 border-b-2 border-blue-700 pb-1">Home</a>
              <a href="#" className="hover:text-blue-700 transition-colors">About Us</a>
              <a href="#" className="hover:text-blue-700 transition-colors">Our Products</a>
              <a href="#" className="hover:text-blue-700 transition-colors">Quality</a>
              <a href="#" className="hover:text-blue-700 transition-colors">Contact</a>
            </div>

            {/* "Get a Quote" Button for Desktop */}
            <div className="hidden md:flex items-center">
               <button onClick={toggleModal} className="bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-6 transition-colors rounded">
                Get a Quote
               </button>
            </div>


            {/* Mobile Menu Controls */}
            <div className="md:hidden flex items-center space-x-4">
               <button onClick={toggleModal} className="bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-4 transition-colors rounded text-sm">
                Get a Quote
               </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-white shadow-lg absolute w-full">
              <a href="#" className="block px-6 py-3 text-blue-700 font-semibold">Home</a>
              <a href="#" className="block px-6 py-3 hover:bg-gray-100">About Us</a>
              <a href="#" className="block px-6 py-3 hover:bg-gray-100">Our Products</a>
              <a href="#" className="block px-6 py-3 hover:bg-gray-100">Quality</a>
              <a href="#" className="block px-6 py-3 hover:bg-gray-100">Contact</a>
            </div>
          )}
        </nav>
      </header>

       {/* Get a Quote Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md relative animate-fade-in-up">
            <button
              onClick={toggleModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Request a Quote</h2>
            <form>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-medium mb-2">Full Name</label>
                <input type="text" id="name" name="name" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="John Doe" />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
                <input type="email" id="email" name="email" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="you@example.com" />
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                <input type="tel" id="phone" name="phone" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="+1 (555) 123-4567" />
              </div>
              <div className="mb-6">
                <label htmlFor="details" className="block text-gray-700 text-sm font-medium mb-2">Project Details</label>
                <textarea id="details" name="details" rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Briefly describe your requirements..."></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Hero Section with Carousel */}
      <section className="h-screen md:h-[90vh] relative -mt-[120px] text-white">
        {/* Background Image Slides */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url('${slide.imageUrl}')` }}
          />
        ))}

        {/* Content Container */}
        <div className="relative z-20 w-full h-full flex flex-col justify-center items-center text-center">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              {/* Sliding Text Content */}
              <div className="relative h-80 overflow-hidden">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col justify-center items-center ${
                      index === currentSlide ? 'translate-x-0 opacity-100' : index < currentSlide ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'
                    }`}
                  >
                    <div className="space-y-6">
                      <h2 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-tight [text-shadow:_2px_2px_4px_rgb(0_0_0_/_60%)] transform transition-all duration-700 delay-100 ${
                        index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}>
                        {slide.headline}
                      </h2>
                      <p className={`text-lg md:text-xl font-light [text-shadow:_1px_1px_2px_rgb(0_0_0_/_60%)] transform transition-all duration-700 delay-200 ${
                        index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}>
                        {slide.subheading}
                      </p>
                      <button
                        onClick={slide.buttonLink === '#' ? toggleModal : () => window.location.href = slide.buttonLink}
                        className={`inline-block bg-white text-gray-800 font-semibold py-3 px-8 hover:bg-gray-200 transition-all duration-300 rounded shadow-lg transform ${
                          index === currentSlide ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-4 opacity-0'
                        }`}
                      >
                        {slide.buttonText}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute z-30 w-full top-1/2 -translate-y-1/2 flex justify-between px-3 sm:px-6">
          <button onClick={prevSlide} className="bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-200" aria-label="Previous slide">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={nextSlide} className="bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-200" aria-label="Next slide">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Slide Indicators */}
        <div className="absolute z-30 bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                currentSlide === index ? 'bg-white' : 'bg-white bg-opacity-60 hover:bg-opacity-80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default HeroSection;