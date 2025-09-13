'use client';

import { useContext } from 'react';
import { CartContext } from '../contexts/CartContext'; // This import is correct

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};