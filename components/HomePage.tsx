"use client";

import React, { useState, useEffect } from 'react';
import HeroSection from '@/components/HeroSection';
import IntroductionSection from '@/components/IntroductionSection';
import CoreCapabilitiesSection from '@/components/CoreCapabilitiesSection';
import ProcessSection from '@/components/ProcessSection';
import FacilitiesSection from '@/components/FacilitiesSection';
import QualitySection from '@/components/QualitySection';
import HSESection from '@/components/HSESection';
import ExperienceSection from '@/components/ExperienceSection';
import ClientsSection from '@/components/ClientsSection';
import FinalCTASection from '@/components/FinalCTASection';
import Footer from '@/components/Footer';
import GetQuoteModal from './GetQuoteModal'; // Import the new modal component

// Define SVG icons for the sticky buttons
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.49 1.49c-.292.292-.752.292-1.044 0l-4.243-4.243a.75.75 0 010-1.044l1.49-1.49a.75.75 0 00.417-1.173l-1.106-4.423a1.125 1.125 0 00-1.091-.852H6.75A2.25 2.25 0 004.5 4.5v2.25z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516z"/>
  </svg>
);

export default function HomePage() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [hasPopupBeenShown, setHasPopupBeenShown] = useState(false);

  const openPopup = () => {
    if (!hasPopupBeenShown) {
      setIsPopupOpen(true);
      setHasPopupBeenShown(true);
    }
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  // Effect for Time-Based Popup
  useEffect(() => {
    const timer = setTimeout(() => {
      openPopup();
    }, 15000); // 15 seconds

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPopupBeenShown]);

  // Effect for Exit-Intent Popup
  useEffect(() => {
    const handleMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        openPopup();
      }
    };
    
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPopupBeenShown]);

  return (
    <div className="relative">
      {/* Pass openPopup function to HeroSection */}
      <HeroSection onGetQuoteClick={openPopup} /> 
      <IntroductionSection />
      <CoreCapabilitiesSection />
      <ExperienceSection />
      <ProcessSection />
      <FacilitiesSection />
      <QualitySection />
      <HSESection />
      <ClientsSection />
      <FinalCTASection />
      <Footer />

      {/* The new modal component */}
      <GetQuoteModal isOpen={isPopupOpen} onClose={closePopup} />

      {/* Sticky Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-y-4">
        <a 
          href="https://wa.me/919893030763" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="group relative flex items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          aria-label="Chat on WhatsApp"
        >
          <span className="absolute inset-0 bg-white/20 -translate-x-full animate-shimmer group-hover:animate-shimmer-fast rounded-full"></span>
          <WhatsAppIcon />
          <div className="absolute right-full mr-4 px-3 py-2 text-sm font-semibold text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Chat on WhatsApp
          </div>
        </a>

        <div className="group relative">
          <a 
            href="tel:+919893030763" 
            className="flex items-center justify-center w-16 lg:w-52 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl overflow-hidden transition-all duration-300 transform hover:scale-110"
            aria-label="Call Us"
          >
            <span className="absolute inset-0 bg-white/20 -translate-x-full animate-shimmer group-hover:animate-shimmer-fast rounded-full"></span>
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex-shrink-0 lg:pl-5">
                <PhoneIcon />
              </div>
              <div className="hidden lg:block ml-2 overflow-hidden">
                <span className="font-semibold text-sm whitespace-nowrap">
                  +91 9893030763
                </span>
              </div>
            </div>
          </a>
          <div className="absolute right-full mr-4 px-3 py-2 text-sm font-semibold text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap lg:hidden">
            Call Us Now
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite;
        }
        .animate-shimmer-fast {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}