// components/CartSidebar.tsx
'use client';

import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import Image from 'next/image';

const CartSidebar: FC = () => {
    const router = useRouter();
    const { isCartOpen, closeCart, cart, totalItems, removeFromCart } = useCart();
    const { formatPrice } = useSettings();

    // Calculate total price dynamically from the cart state
    const cartTotal = cart.reduce((acc, item) => {
        const adultPrice = (item.discountPrice || 0) * (item.quantity || 1);
        const childPrice = ((item.discountPrice || 0) / 2) * (item.childQuantity || 0);
        return acc + adultPrice + childPrice;
    }, 0);

    const handleCheckout = () => {
        closeCart();
        router.push('/checkout');
    };

    const handleStartExploring = () => {
        closeCart();
        router.push('/');
    };
    
    return (
        <AnimatePresence>
            {isCartOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex justify-end"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        className="absolute inset-0 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                    />
                    <motion.div
                        className="relative bg-slate-50 h-full w-full max-w-md shadow-2xl flex flex-col"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b bg-white">
                            <h2 className="text-xl font-bold text-slate-800">
                                Your Cart ({totalItems})
                            </h2>
                            <button
                                onClick={closeCart}
                                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                                aria-label="Close cart"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Items or Empty State */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center h-full text-slate-400">
                                    <ShoppingCart size={64} className="stroke-1 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-600">Your cart is empty</h3>
                                    <p className="mt-1 text-sm">Find a tour to start your next adventure!</p>
                                    <button
                                        onClick={handleStartExploring}
                                        className="mt-6 bg-red-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"
                                    >
                                        Start Exploring
                                    </button>
                                </div>
                            ) : (
                                <ul className="space-y-5">
                                    <AnimatePresence>
                                        {cart.map((item) => (
                                            <motion.li
                                                key={item.uniqueId}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                                                className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm"
                                            >
                                                <Image
                                                    src={item.image || '/bg.png'}
                                                    alt={item.title}
                                                    width={80}
                                                    height={80}
                                                    className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800 leading-tight line-clamp-2">{item.title}</p>
                                                    <p className="text-sm text-slate-500 mt-1">{item.quantity} Adult{item.quantity > 1 ? 's' : ''}</p>
                                                    {item.childQuantity > 0 && <p className="text-sm text-slate-500">{item.childQuantity} Child{item.childQuantity > 1 ? 'ren' : ''}</p>}
                                                    <p className="font-semibold text-red-600 mt-2">
                                                        {formatPrice((item.discountPrice || 0) * (item.quantity || 1))}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.uniqueId!)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                    aria-label={`Remove ${item.title} from cart`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.li>
                                        ))}
                                    </AnimatePresence>
                                </ul>
                            )}
                        </div>
                        
                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="p-6 border-t bg-white shadow-inner">
                                <div className="flex justify-between items-baseline text-slate-800 mb-4">
                                    <p className="text-lg font-semibold">Grand Total</p>
                                    <p className="text-2xl font-extrabold">{formatPrice(cartTotal)}</p>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-red-600 text-white font-bold py-3.5 rounded-full text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                                >
                                    Proceed to Checkout
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CartSidebar;