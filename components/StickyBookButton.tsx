"use client";

import { useEffect, useState } from 'react';

const StickyBookButton = () => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-sidebar');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <div className="sticky-book-button-container">
      <button onClick={scrollToBooking} className="sticky-book-button">
        Book your Adventure
      </button>
    </div>
  );
};

export default StickyBookButton;