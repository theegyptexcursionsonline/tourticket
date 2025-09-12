// components/CartSidebar.tsx
'use client';

import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import { CartItem } from '@/types';

/**
 * CartSidebar (complete)
 *
 * - Shows cart items, quantities, remove
 * - Proceed to checkout (navigates to /checkout)
 * - Start exploring (navigates to /) when cart empty
 * - Uses framer-motion for entrance/exit
 * - Accessible buttons and keyboard-friendly layout
 */

const CartSidebar: FC = () => {
  const router = useRouter();
  const { isCartOpen, closeCart, cartItems = [], cartTotal = 0, removeFromCart, updateQuantity } = useCart();
  const { formatPrice } = useSettings();

  const isLoading = cartItems == null;

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sidebarVariants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  const handleProceedToCheckout = () => {
    if (isLoading || !cartItems || cartItems.length === 0) return;
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
          className="fixed inset-0 z-50"
          initial="hidden"
          animate="visible"
          exit="hidden"
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            onClick={closeCart}
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <ShoppingCart size={24} /> Your Cart
              </h2>
              <button
                onClick={closeCart}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Close cart"
              >
                <X size={24} />
              </button>
            </div>

            {/* Loading skeleton */}
            {isLoading ? (
              <div className="flex-1 overflow-y-auto p-6" aria-busy="true">
                <CartSkeleton />
              </div>
            ) : cartItems.length === 0 ? (
              // Empty cart state
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ShoppingCart size={56} className="text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">Your cart is empty</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                  Looks like you haven't added any experiences yet. Start exploring our tours and add your favorites.
                </p>
                <div className="mt-8 flex flex-col gap-3 w-full px-6">
                  <button
                    onClick={handleStartExploring}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 rounded-full transition-transform transform hover:scale-105 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Start Exploring
                    <ArrowRight size={20} />
                  </button>

                  <button
                    onClick={() => router.push('/tours')}
                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold py-3 rounded-full hover:bg-slate-50 transition-colors"
                  >
                    Browse Tours
                  </button>
                </div>
              </div>
            ) : (
              // Cart with items
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cartItems.map((item) => (
                    <CartItemCard
                      key={String(item.id)}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>

                <div className="p-6 border-t bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-slate-600">Subtotal</span>
                    <span className="text-2xl font-bold text-slate-800">{formatPrice(cartTotal)}</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleProceedToCheckout}
                      className={`flex-1 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 ${
                        isLoading || cartItems.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                      }`}
                      disabled={isLoading || cartItems.length === 0}
                    >
                      Proceed to Checkout
                    </button>

                    <button
                      onClick={() => {
                        closeCart();
                        router.push('/cart'); // or keep on homepage; optional "View cart" page
                      }}
                      className="py-3 px-4 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      View Cart
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* -------------------------
   Cart item card component
   ------------------------- */
const CartItemCard: FC<{
  item: CartItem;
  onUpdateQuantity: (id: string | number, qty: number) => void;
  onRemove: (id: string | number) => void;
  formatPrice: (value: number) => string;
}> = ({ item, onUpdateQuantity, onRemove, formatPrice }) => {
  const safeUpdate = (id: string | number, qty: number) => {
    // allow decreasing to 0 which triggers removal
    if (qty < 1) {
      onRemove(id);
      return;
    }
    onUpdateQuantity(id, qty);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      className="flex gap-4 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <img
        src={item.image || 'https://placehold.co/100x100/EEE/31343C?text=Tour'}
        alt={item.title}
        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-slate-800 leading-tight line-clamp-2">{item.title}</h4>
          <p className="text-lg font-semibold text-red-600 mt-1">{formatPrice((item.discountPrice || 0) * (item.quantity || 1))}</p>
          {item.details && <p className="text-sm text-slate-500 mt-1">{item.details}</p>}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border rounded-full">
            <button
              onClick={() => safeUpdate(item.id, (item.quantity || 1) - 1)}
              className="p-2 text-slate-500 hover:text-red-600 disabled:opacity-50"
              aria-label={`Decrease quantity of ${item.title}`}
            >
              <Minus size={16} />
            </button>
            <span className="px-3 font-semibold text-slate-700 w-8 text-center">{item.quantity}</span>
            <button
              onClick={() => safeUpdate(item.id, (item.quantity || 1) + 1)}
              className="p-2 text-slate-500 hover:text-red-600"
              aria-label={`Increase quantity of ${item.title}`}
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50"
            aria-label={`Remove ${item.title} from cart`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------
   Skeleton component
   ------------------------- */
const CartSkeleton: FC = () => {
  const row = (key: number) => (
    <div key={key} className="flex gap-4 items-start animate-pulse" aria-hidden="true">
      <div className="w-24 h-24 bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-5 bg-slate-200 rounded w-1/3" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-9 bg-slate-200 rounded-full w-28" />
          <div className="h-8 bg-slate-200 rounded-full w-10" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6 p-6">
        {row(1)}
        {row(2)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
        </div>
        <div className="h-12 bg-slate-200 rounded-full w-full animate-pulse" />
      </div>
    </>
  );
};

export default CartSidebar;
