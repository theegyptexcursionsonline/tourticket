'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tour } from '@/types';

// Define the shape of the context
interface WishlistContextType {
  wishlist: Tour[];
  addToWishlist: (tour: Tour) => void;
  removeFromWishlist: (tourId: string) => void;
  isWishlisted: (tourId: string) => boolean;
  isWishlistSidebarOpen: boolean;
  openWishlistSidebar: () => void;
  closeWishlistSidebar: () => void;
}

// Create the context with a default value
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Create the provider component
export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlist, setWishlist] = useState<Tour[]>([]);
  const [isWishlistSidebarOpen, setIsWishlistSidebarOpen] = useState(false);

  // Load wishlist from localStorage on initial render
  useEffect(() => {
    try {
      const storedWishlist = localStorage.getItem('wishlist');
      if (storedWishlist) {
        setWishlist(JSON.parse(storedWishlist));
      }
    } catch (error) {
      console.error("Failed to parse wishlist from localStorage", error);
    }
  }, []);

  // Update localStorage whenever the wishlist changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (tour: Tour) => {
    setWishlist((prevWishlist) => {
      // Avoid adding duplicates
      if (prevWishlist.some(item => item._id === tour._id)) {
        return prevWishlist;
      }
      return [...prevWishlist, tour];
    });
  };

  const removeFromWishlist = (tourId: string) => {
    setWishlist((prevWishlist) => prevWishlist.filter((item) => item._id !== tourId));
  };

  const isWishlisted = (tourId: string) => {
    return wishlist.some((item) => item._id === tourId);
  };

  const openWishlistSidebar = () => setIsWishlistSidebarOpen(true);
  const closeWishlistSidebar = () => setIsWishlistSidebarOpen(false);

  return (
    <WishlistContext.Provider value={{ 
        wishlist, 
        addToWishlist, 
        removeFromWishlist, 
        isWishlisted,
        isWishlistSidebarOpen,
        openWishlistSidebar,
        closeWishlistSidebar
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
