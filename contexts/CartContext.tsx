'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem, Tour } from '@/types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem, openCartSidebar?: boolean) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    totalItems: number;
}

// Create and EXPORT the context
export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        try {
            const storedCart = localStorage.getItem('cart');
            if (storedCart) {
                setCart(JSON.parse(storedCart));
            }
        } catch (error) {
            console.error("Failed to parse cart from localStorage", error);
            localStorage.removeItem('cart');
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('cart', JSON.stringify(cart));
        } catch (error)      {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cart]);

    const addToCart = (item: CartItem, openCartSidebar = true) => {
        setCart(prevCart => {
            const uniqueId = `${item.id}-${item.selectedDate}-${item.selectedTime}-${JSON.stringify(item.selectedAddOns)}`;
            const existingItem = prevCart.find(cartItem => cartItem.uniqueId === uniqueId);
            
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.uniqueId === uniqueId
                        ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
                        : cartItem
                );
            }
            return [...prevCart, { ...item, uniqueId }];
        });

        if (openCartSidebar) {
            openCart();
        }
    };

    const removeFromCart = (uniqueId: string) => {
        setCart(prevCart => prevCart.filter(item => item.uniqueId !== uniqueId));
    };

    const clearCart = () => {
        setCart([]);
        localStorage.removeItem('cart');
    };
    
    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return (
        <CartContext.Provider value={{ cart, totalItems, addToCart, removeFromCart, clearCart, isCartOpen, openCart, closeCart }}>
            {children}
        </CartContext.Provider>
    );
};