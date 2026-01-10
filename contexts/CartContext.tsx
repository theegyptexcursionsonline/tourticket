// contexts/CartContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { CartItem } from '@/types';
import { useAuth } from './AuthContext';

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem, openCartSidebar?: boolean) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    totalItems: number;
    isLoading: boolean;
}

// Create and EXPORT the context
export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSyncedFromServer, setHasSyncedFromServer] = useState(false);

    const { token, isAuthenticated } = useAuth();

    const toNumberQty = useCallback((value: any, fallback = 1): number => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
            return fallback;
        }
        if (value && typeof value === 'object') {
            const inner = (value as any).quantity ?? (value as any).qty ?? (value as any).count;
            return toNumberQty(inner, fallback);
        }
        return fallback;
    }, []);

    const normalizeCartItem = useCallback((item: any): CartItem => {
        // Normalize selectedAddOns into the client format:
        // selectedAddOns: { [addOnId]: number }
        // selectedAddOnDetails: { [addOnId]: { id, title, price, category, perGuest } }
        const nextItem: any = { ...item };

        const selectedAddOns: { [key: string]: number } = {};
        const selectedAddOnDetails: {
            [key: string]: { id: string; title: string; price: number; category: string; perGuest: boolean };
        } = {};

        // Case 1: Server/user schema format (array)
        if (Array.isArray(nextItem.selectedAddOns)) {
            nextItem.selectedAddOns.forEach((addon: any) => {
                if (!addon?.id) return;
                selectedAddOns[addon.id] = toNumberQty(addon.quantity, 1);
                selectedAddOnDetails[addon.id] = {
                    id: addon.id,
                    title: addon.name || addon.title || 'Add-on',
                    price: Number(addon.price || 0),
                    category: addon.category || 'add-on',
                    perGuest: addon.perGuest ?? false,
                };
            });
        }

        // Case 2: Corrupted client format where values are objects instead of numbers
        // e.g. selectedAddOns: { "addonId": { id, name, price, quantity } }
        if (nextItem.selectedAddOns && !Array.isArray(nextItem.selectedAddOns) && typeof nextItem.selectedAddOns === 'object') {
            for (const [key, rawVal] of Object.entries(nextItem.selectedAddOns)) {
                if (typeof rawVal === 'number' || typeof rawVal === 'string') {
                    selectedAddOns[key] = toNumberQty(rawVal, 1);
                    continue;
                }
                if (rawVal && typeof rawVal === 'object') {
                    const valObj: any = rawVal;
                    const id = valObj.id || key;
                    selectedAddOns[id] = toNumberQty(valObj.quantity, 1);
                    selectedAddOnDetails[id] = {
                        id,
                        title: valObj.name || valObj.title || 'Add-on',
                        price: Number(valObj.price || 0),
                        category: valObj.category || 'add-on',
                        perGuest: valObj.perGuest ?? false,
                    };
                }
            }
        }

        if (Object.keys(selectedAddOns).length > 0) {
            nextItem.selectedAddOns = selectedAddOns;
        }
        if (Object.keys(selectedAddOnDetails).length > 0) {
            nextItem.selectedAddOnDetails = {
                ...(nextItem.selectedAddOnDetails || {}),
                ...selectedAddOnDetails,
            };
        }

        return nextItem as CartItem;
    }, [toNumberQty]);

    // Load cart from localStorage (for guests or initial load)
    useEffect(() => {
        if (!isAuthenticated) {
            try {
                const storedCart = localStorage.getItem('cart');
                if (storedCart) {
                    const parsed = JSON.parse(storedCart);
                    setCart(Array.isArray(parsed) ? parsed.map(normalizeCartItem) : []);
                }
            } catch (error) {
                console.error("Failed to parse cart from localStorage", error);
                localStorage.removeItem('cart');
            }
            setHasSyncedFromServer(false);
        }
    }, [isAuthenticated, normalizeCartItem]);

    // Sync cart from server when user logs in
    useEffect(() => {
        const syncFromServer = async () => {
            if (!isAuthenticated || !token || hasSyncedFromServer) return;

            setIsLoading(true);
            try {
                const response = await fetch('/api/user/cart', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.cart) {
                        // Get local cart
                        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');

                        // Transform server cart to CartItem format (then normalize add-ons)
                        const serverCart = data.cart.map((item: any) => normalizeCartItem({
                            ...item,
                            id: item.tourId?.toString() || item.tourId,
                            _id: item.tourId?.toString() || item.tourId,
                            slug: item.tourSlug,
                            title: item.tourTitle,
                            image: item.tourImage,
                            images: item.tourImage ? [{ url: item.tourImage }] : [],
                            pricing: { adult: item.adultPrice, child: item.childPrice },
                        }));

                        const serverIds = new Set(serverCart.map((c: CartItem) => c.uniqueId));

                        // Merge: server + local items not on server
                        const mergedCart = [...serverCart];
                        for (const item of localCart) {
                            if (!serverIds.has(item.uniqueId)) {
                                mergedCart.push(normalizeCartItem(item));
                            }
                        }

                        setCart(mergedCart);

                        // If there were local items not on server, sync them
                        if (localCart.some((item: CartItem) => !serverIds.has(item.uniqueId))) {
                            await syncToServer(mergedCart);
                        }

                        // Clear local storage since we're now using server
                        localStorage.removeItem('cart');
                    }
                }
            } catch (error) {
                console.error('Failed to sync cart from server:', error);
            } finally {
                setIsLoading(false);
                setHasSyncedFromServer(true);
            }
        };

        syncFromServer();
    }, [isAuthenticated, token, hasSyncedFromServer, normalizeCartItem]);

    // Sync to server helper
    const syncToServer = useCallback(async (items: CartItem[]) => {
        if (!isAuthenticated || !token) return;

        try {
            // Transform CartItem to server format
            const serverCart = items.map(item => ({
                id: item._id || item.id,
                tourId: item._id || item.id,
                tourSlug: item.slug,
                tourTitle: item.title,
                tourImage: item.images?.[0]?.url,
                selectedDate: item.selectedDate,
                selectedTime: item.selectedTime,
                quantity: item.quantity,
                childQuantity: item.childQuantity,
                adultPrice: item.pricing?.adult || 0,
                childPrice: item.pricing?.child || 0,
                selectedAddOns: item.selectedAddOnDetails ?
                    Object.values(item.selectedAddOnDetails).map(addon => ({
                        id: addon.id,
                        name: addon.title,
                        price: addon.price,
                        quantity: toNumberQty((item.selectedAddOns as any)?.[addon.id], 1),
                        category: addon.category || 'add-on',
                        perGuest: addon.perGuest ?? false,
                    })) : [],
                uniqueId: item.uniqueId,
            }));

            await fetch('/api/user/cart', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ cart: serverCart }),
            });
        } catch (error) {
            console.error('Failed to sync cart to server:', error);
        }
    }, [isAuthenticated, token, toNumberQty]);

    // Save to localStorage (for guests) whenever cart changes
    useEffect(() => {
        if (!isAuthenticated) {
            try {
                localStorage.setItem('cart', JSON.stringify(cart));
            } catch (error) {
                console.error("Failed to save cart to localStorage", error);
            }
        }
    }, [cart, isAuthenticated]);

    const addToCart = useCallback(async (item: CartItem, openCartSidebar = true) => {
        const normalizedItem = normalizeCartItem(item);
        const uniqueId = normalizedItem.uniqueId || `${normalizedItem.id}-${normalizedItem.selectedDate}-${normalizedItem.selectedTime}-${JSON.stringify(normalizedItem.selectedAddOns)}`;

        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.uniqueId === uniqueId);

            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.uniqueId === uniqueId
                        ? { ...cartItem, quantity: cartItem.quantity + normalizedItem.quantity }
                        : cartItem
                );
            }
            return [...prevCart, { ...normalizedItem, uniqueId }];
        });

        if (openCartSidebar) {
            openCart();
        }

        // Sync to server if authenticated
        if (isAuthenticated && token) {
            try {
                await fetch('/api/user/cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: normalizedItem._id || normalizedItem.id,
                        tourId: normalizedItem._id || normalizedItem.id,
                        tourSlug: normalizedItem.slug,
                        tourTitle: normalizedItem.title,
                        tourImage: normalizedItem.images?.[0]?.url,
                        selectedDate: normalizedItem.selectedDate,
                        selectedTime: normalizedItem.selectedTime,
                        quantity: normalizedItem.quantity,
                        childQuantity: normalizedItem.childQuantity,
                        adultPrice: normalizedItem.pricing?.adult || 0,
                        childPrice: normalizedItem.pricing?.child || 0,
                        selectedAddOns: normalizedItem.selectedAddOnDetails ?
                            Object.values(normalizedItem.selectedAddOnDetails).map(addon => ({
                                id: addon.id,
                                name: addon.title,
                                price: addon.price,
                                quantity: toNumberQty((normalizedItem.selectedAddOns as any)?.[addon.id], 1),
                                category: addon.category || 'add-on',
                                perGuest: addon.perGuest ?? false,
                            })) : [],
                        uniqueId,
                    }),
                });
            } catch (error) {
                console.error('Failed to add to cart on server:', error);
            }
        }
    }, [isAuthenticated, token, normalizeCartItem, toNumberQty]);

    const removeFromCart = useCallback(async (uniqueId: string) => {
        setCart(prevCart => prevCart.filter(item => item.uniqueId !== uniqueId));

        // Sync to server if authenticated
        if (isAuthenticated && token) {
            try {
                await fetch(`/api/user/cart?uniqueId=${encodeURIComponent(uniqueId)}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Failed to remove from cart on server:', error);
            }
        }
    }, [isAuthenticated, token]);

    const clearCart = useCallback(async () => {
        setCart([]);
        localStorage.removeItem('cart');

        // Sync to server if authenticated
        if (isAuthenticated && token) {
            try {
                await fetch('/api/user/cart?clearAll=true', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Failed to clear cart on server:', error);
            }
        }
    }, [isAuthenticated, token]);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0) + (item.childQuantity || 0), 0);

    return (
        <CartContext.Provider value={{
            cart,
            totalItems,
            addToCart,
            removeFromCart,
            clearCart,
            isCartOpen,
            openCart,
            closeCart,
            isLoading,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
