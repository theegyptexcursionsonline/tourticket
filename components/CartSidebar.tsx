'use client';

import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import { CartItem } from '@/types';

const CartSidebar: FC = () => {
  const { isCartOpen, closeCart, cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();
  const { formatPrice } = useSettings();

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sidebarVariants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
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
              <button onClick={closeCart} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <ShoppingCart size={48} className="text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">Your cart is empty</h3>
                <p className="text-slate-500 mt-2">Looks like you haven't added anything to your cart yet.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cartItems.map((item) => (
                    <CartItemCard key={item.id} item={item} />
                  ))}
                </div>
                <div className="p-6 border-t bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-slate-600">Subtotal</span>
                    <span className="text-2xl font-bold text-slate-800">{formatPrice(cartTotal)}</span>
                  </div>
                  <button className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-transform transform hover:scale-105">
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

const CartItemCard: FC<{ item: CartItem }> = ({ item }) => {
    const { updateQuantity, removeFromCart } = useCart();
    const { formatPrice } = useSettings();

    return (
        <div className="flex gap-4">
            <img src={item.image || 'https://placehold.co/100x100/EEE/31343C?text=Tour'} alt={item.title} className="w-24 h-24 object-cover rounded-lg" />
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <h4 className="font-bold text-slate-800 leading-tight">{item.title}</h4>
                    <p className="text-lg font-semibold text-red-600 mt-1">{formatPrice(item.discountPrice)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-full">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-slate-500 hover:text-red-600">
                            <Minus size={16} />
                        </button>
                        <span className="px-3 font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-slate-500 hover:text-red-600">
                            <Plus size={16} />
                        </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-400 hover:text-red-600">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};


export default CartSidebar;
