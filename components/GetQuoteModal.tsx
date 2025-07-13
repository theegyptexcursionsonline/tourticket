"use client";

import React, { useState, useEffect, useRef } from 'react';

// --- SVG Icon Components ---
const CloseIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SuccessIcon = ({ className = "h-16 w-16" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// --- Type Definition ---
type GetQuoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
};


// --- Main Component ---
const GetQuoteModal = ({ isOpen, onClose }: GetQuoteModalProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Function to handle closing the modal and resetting the form state
  const handleClose = () => {
    setIsSubmitted(false); // Reset form state on close
    onClose();
  };

  // Effect for handling outside clicks and Escape key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Form submission handler
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent page reload
    // Here you would typically send data to an API
    console.log("Form submitted!");
    setIsSubmitted(true); // Show the thank you message
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md relative animate-fade-in-up"
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors z-10"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        
        {isSubmitted ? (
          // --- Thank You View ---
          <div className="text-center animate-fade-in">
            <div className="flex justify-center text-green-500 mb-4">
               <SuccessIcon />
            </div>
            <h2 id="modal-title" className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
            <p className="text-gray-600">Your quote request has been received. We will get back to you shortly.</p>
          </div>
        ) : (
          // --- Form View ---
          <>
            <h2 id="modal-title" className="text-2xl font-bold text-gray-800 mb-6 text-center">Request a Quote</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-medium mb-2">Full Name</label>
                <input type="text" id="name" name="name" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="John Doe" required />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
                <input type="email" id="email" name="email" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="you@example.com" required />
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                <input type="tel" id="phone" name="phone" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="+91 9893030763" />
              </div>
              <div className="mb-6">
                <label htmlFor="details" className="block text-gray-700 text-sm font-medium mb-2">Project Details</label>
                <textarea id="details" name="details" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Briefly describe your requirements..."></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-md transition-transform transform hover:scale-105">
                Submit Request
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default GetQuoteModal;