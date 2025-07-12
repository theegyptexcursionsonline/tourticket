"use client";

import React from 'react';

// This component uses a font from Google Fonts. 
// Make sure to import 'Poppins' in your main layout file.

const HeroSection = () => {
  return (
    <>
      <header className="relative">
        {/* Top Bar */}
        <div className="bg-gray-800 text-white">
          <div className="container mx-auto px-6 py-2 flex justify-between items-center text-sm">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {/* Contact number from the business card */}
              <span>M.: 6265507154</span>
            </div>
            <div>
              <a href="#" className="hover:text-gray-300 transition-colors mr-4">Careers</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Contacts</a>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            {/* Logo updated to M.K. Industries */}
            <div className="text-2xl font-bold text-gray-800 tracking-wider">
              M.K. INDUSTRIES
            </div>

            {/* Navigation links tailored to the client */}
            <div className="hidden md:flex items-center space-x-8 text-gray-600 font-medium">
              <a href="#" className="text-blue-700 border-b-2 border-blue-700 pb-1">Home</a>
              <a href="#" className="hover:text-blue-700 transition-colors">About Us</a>
              <a href="#" className="hover:text-blue-700 transition-colors">Our Products</a>
              <a href="#" className="hover:text-blue-700 transition-colors">Quality</a>
              <a href="#" className="hover:text-blue-700 transition-colors">Contact</a>
            </div>

            <div className="flex items-center space-x-5">
              <button className="text-gray-500 hover:text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <a href="#" className="bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2 px-6 transition-colors rounded">
                Get a Quote
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section 
        className="h-[600px] relative text-white bg-cover bg-center"
        // Using a professional image of the client's work
        style={{ backgroundImage: "url('/heroimagemk.png')" }}
      >
        <div className="bg-black bg-opacity-40 w-full h-full flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              {/* Headline reflects the company's manufacturing specialty */}
              <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                Specialists in Transformer Tank Fabrication
              </h2>
              {/* Subheading highlights the company's certification */}
              <p className="text-xl font-light mt-4 ml-1">
                An ISO 9001:2015 Certified Company
              </p>
              <a href="#" className="inline-block bg-white text-gray-800 font-semibold py-3 px-8 mt-8 hover:bg-gray-200 transition-colors rounded">
                Explore Products
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;