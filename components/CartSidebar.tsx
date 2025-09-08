'use client';

import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import { CartItem } from '@/types';

const CartSidebar: FC = () => {
  const router = useRouter();
  const { isCartOpen, closeCart, cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();
  const { formatPrice } = useSettings();

  // consider cartItems === undefined/null as loading
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
    if (isLoading) return;
    closeCart();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div
          className="fixed inset-0 z-50"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            variants={backdropVariants}
            onClick={closeCart}
          />
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            variants={sidebarVariants}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-slate-800">Your Cart</h2>
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
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <ShoppingCart size={48} className="text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">Your cart is empty</h3>
                <p className="text-slate-500 mt-2">Looks like you haven't added anything to your cart yet.</p>
              </div>
            ) : (
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
                  <button
                    onClick={handleProceedToCheckout}
                    className={`w-full text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 ${
                      isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    }`}
                    disabled={isLoading}
                  >
                    Proceed to Checkout
                  </button>
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
    if (qty < 1) return;
    onUpdateQuantity(id, qty);
  };

  return (
    <div className="flex gap-4">
      <img
        src={item.image || 'https://placehold.co/100x100/EEE/31343C?text=Tour'}
        alt={item.title}
        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
      />
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-slate-800 leading-tight">{item.title}</h4>
          <p className="text-lg font-semibold text-red-600 mt-1">{formatPrice(item.discountPrice)}</p>
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
            <span className="px-3 font-semibold">{item.quantity}</span>
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
            className="p-2 text-slate-400 hover:text-red-600"
            aria-label={`Remove ${item.title} from cart`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------
   Skeleton component
   ------------------------- */
const CartSkeleton: FC = () => {
  const row = (key: number) => (
    <div key={key} className="flex gap-4 items-start animate-pulse" aria-hidden="true">
      <div className="w-24 h-24 bg-slate-200 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-3" />
        <div className="flex items-center justify-between">
          <div className="h-8 bg-slate-200 rounded-full w-28" />
          <div className="h-8 bg-slate-200 rounded-full w-10" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {row(1)}
        {row(2)}
        {row(3)}
      </div>

      <div className="mt-6 border-t pt-6">
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
