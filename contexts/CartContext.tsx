// contexts/CartContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem } from '@/types';

interface CartContextType {
    cart: CartItem[];
    // Add an optional parameter to control cart opening
    addToCart: (item: CartItem, openCartSidebar?: boolean) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

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
        // This prevents overwriting the cart with an empty array on initial load
        if (cart && cart.length > 0) {
            localStorage.setItem('cart', JSON.stringify(cart));
        } else if (cart && cart.length === 0) {
            // If the user empties the cart, we should update localStorage
             localStorage.removeItem('cart');
        }
    }, [cart]);

    const addToCart = (item: CartItem, openCartSidebar = true) => {
        setCart(prevCart => {
            // Use a unique key for each item, including add-ons
            const itemKey = `${item.id}-${item.selectedDate}-${item.selectedTime}`;
            const existingItem = prevCart.find(cartItem => {
                const cartItemKey = `${cartItem.id}-${cartItem.selectedDate}-${cartItem.selectedTime}`;
                return cartItemKey === itemKey;
            });
            
            if (existingItem) {
                // Update quantity of existing item
                return prevCart.map(cartItem =>
                    `${cartItem.id}-${cartItem.selectedDate}-${cartItem.selectedTime}` === itemKey
                        ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
                        : cartItem
                );
            }
            // Add new item
            return [...prevCart, { ...item, uniqueId: itemKey }];
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
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, totalItems, addToCart, removeFromCart, clearCart, isCartOpen, openCart, closeCart }}>
            {children}
        </CartContext.Provider>
    );
};

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}