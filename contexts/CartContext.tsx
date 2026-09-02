// contexts/CartContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { CartItem } from '@/types';
import { useAuth } from './AuthContext';
import {
    normalizeStoredCartPricingFields,
    replaceCartPriceQuote,
    type AuthoritativePriceQuote,
    type StoredCartPricingFields,
} from '@/lib/cart/authoritativeCart';

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
    acceptAuthoritativePriceQuote: (quote: AuthoritativePriceQuote) => Promise<boolean>;
}

interface RawAddOn {
    id?: string;
    name?: string;
    title?: string;
    price?: number;
    quantity?: unknown;
    category?: string;
    perGuest?: boolean;
}

type RawCartItem = Omit<Partial<CartItem>, 'selectedAddOns' | 'selectedBookingOption'> & {
    selectedAddOns?: Record<string, unknown> | RawAddOn[];
    selectedBookingOption?: StoredCartPricingFields['selectedBookingOption'];
    tourId?: string | { toString(): string };
    tourSlug?: string;
    tourTitle?: string;
    tourImage?: string;
    adultPrice?: number;
    childPrice?: number;
};

// Create and EXPORT the context
export const CartContext = createContext<CartContextType | undefined>(undefined);

const toNumberQty = (value: unknown, fallback = 1): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return toNumberQty(record.quantity ?? record.qty ?? record.count, fallback);
    }
    return fallback;
};

const serializeCartItemForServer = (item: CartItem) => {
    const pricingFields = normalizeStoredCartPricingFields(item);
    return {
        id: item._id || item.id,
        tourId: item._id || item.id,
        tourSlug: item.slug,
        tourTitle: item.title,
        tourImage: item.images?.[0] || item.image,
        selectedDate: item.selectedDate,
        selectedTime: item.selectedTime,
        quantity: item.quantity,
        childQuantity: item.childQuantity,
        infantQuantity: pricingFields.infantQuantity,
        adultPrice: pricingFields.guestPrices?.adult ?? item.selectedBookingOption?.price ?? item.discountPrice ?? item.price ?? 0,
        childPrice: pricingFields.guestPrices?.child ?? 0,
        selectedBookingOption: pricingFields.selectedBookingOption,
        guestPrices: pricingFields.guestPrices,
        priceVersion: pricingFields.priceVersion,
        priceExecutionId: pricingFields.priceExecutionId,
        priceOverrideId: pricingFields.priceOverrideId,
        priceSource: pricingFields.priceSource,
        addOnQuantityVersion: item.addOnQuantityVersion,
        selectedAddOns: item.selectedAddOnDetails
            ? Object.values(item.selectedAddOnDetails).map(addon => ({
                id: addon.id,
                name: addon.title,
                price: addon.price,
                quantity: toNumberQty(item.selectedAddOns?.[addon.id], 1),
                category: addon.category || 'add-on',
                perGuest: addon.perGuest ?? false,
            }))
            : [],
        uniqueId: item.uniqueId,
    };
};

const syncCartToServer = async (token: string, items: CartItem[]) => {
    const serverCart = items.map(serializeCartItemForServer);

    const response = await fetch('/api/user/cart', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cart: serverCart }),
    });
    if (!response.ok) {
        throw new Error('The cart could not be saved to your account.');
    }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSyncedFromServer, setHasSyncedFromServer] = useState(false);
    const [hasLoadedGuestCart, setHasLoadedGuestCart] = useState(false);
    const cartRef = useRef<CartItem[]>([]);

    const { token, isAuthenticated } = useAuth();

    useEffect(() => {
        cartRef.current = cart;
    }, [cart]);

    const normalizeCartItem = useCallback((item: RawCartItem): CartItem => {
        // Normalize selectedAddOns into the client format:
        // selectedAddOns: { [addOnId]: number }
        // selectedAddOnDetails: { [addOnId]: { id, title, price, category, perGuest } }
        const nextItem: RawCartItem = { ...item };

        const selectedAddOns: { [key: string]: number } = {};
        const selectedAddOnDetails: {
            [key: string]: { id: string; title: string; price: number; category: string; perGuest: boolean };
        } = {};

        // Case 1: Server/user schema format (array)
        if (Array.isArray(nextItem.selectedAddOns)) {
            nextItem.selectedAddOns.forEach((addon: RawAddOn) => {
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
                    const valObj = rawVal as RawAddOn;
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
    }, []);

    // Load cart from localStorage (for guests or initial load)
    useEffect(() => {
        // Defer both branches so this external-storage synchronization never
        // cascades a synchronous state update from the effect body.
        const timeoutId = window.setTimeout(() => {
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
                setHasLoadedGuestCart(true);
            } else {
                setHasLoadedGuestCart(false);
            }
        }, 0);
        return () => window.clearTimeout(timeoutId);
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
                        const serverCart = (data.cart as RawCartItem[]).map((item) => {
                            const tourId = item.tourId ? String(item.tourId) : '';
                            const pricingFields = normalizeStoredCartPricingFields(item);
                            return normalizeCartItem({
                                ...item,
                                id: tourId,
                                _id: tourId,
                                slug: item.tourSlug,
                                title: item.tourTitle,
                                image: item.tourImage,
                                images: item.tourImage ? [item.tourImage] : [],
                                discountPrice: item.adultPrice ?? 0,
                                ...pricingFields,
                                guestPrices: pricingFields.guestPrices || {
                                    adult: item.adultPrice ?? 0,
                                    child: item.childPrice ?? 0,
                                    infant: 0,
                                },
                            });
                        });

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
                            await syncCartToServer(token, mergedCart);
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

    // Save to localStorage (for guests) whenever cart changes
    useEffect(() => {
        if (!isAuthenticated && hasLoadedGuestCart) {
            try {
                localStorage.setItem('cart', JSON.stringify(cart));
            } catch (error) {
                console.error("Failed to save cart to localStorage", error);
            }
        }
    }, [cart, isAuthenticated, hasLoadedGuestCart]);

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    const addToCart = useCallback(async (item: CartItem, openCartSidebar = true) => {
        const normalizedItem = normalizeCartItem(item);
        const uniqueId = normalizedItem.uniqueId || `${normalizedItem.id}-${normalizedItem.selectedDate}-${normalizedItem.selectedTime}-${JSON.stringify(normalizedItem.selectedAddOns)}`;

        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.uniqueId === uniqueId);

            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.uniqueId === uniqueId
                        ? {
                            ...cartItem,
                            ...normalizedItem,
                            uniqueId,
                            quantity: cartItem.quantity + normalizedItem.quantity,
                            childQuantity: (cartItem.childQuantity || 0) + (normalizedItem.childQuantity || 0),
                            infantQuantity: (cartItem.infantQuantity || 0) + (normalizedItem.infantQuantity || 0),
                        }
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
                const response = await fetch('/api/user/cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(serializeCartItemForServer({ ...normalizedItem, uniqueId })),
                });
                if (!response.ok) throw new Error('The cart item could not be saved to your account.');
            } catch (error) {
                console.error('Failed to add to cart on server:', error);
            }
        }
    }, [isAuthenticated, token, normalizeCartItem, openCart]);

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

    const acceptAuthoritativePriceQuote = useCallback(async (quote: AuthoritativePriceQuote) => {
        const replacement = replaceCartPriceQuote(cartRef.current, quote);
        if (replacement.replacements === 0) return false;

        try {
            if (isAuthenticated) {
                if (!token) return false;
                await syncCartToServer(token, replacement.cart);
            } else {
                localStorage.setItem('cart', JSON.stringify(replacement.cart));
            }
            cartRef.current = replacement.cart;
            setCart(replacement.cart);
            return true;
        } catch (error) {
            console.error('Failed to accept authoritative cart price:', error);
            return false;
        }
    }, [isAuthenticated, token]);

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0);

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
            acceptAuthoritativePriceQuote,
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
