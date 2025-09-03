'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Lock, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { formatPrice } = useSettings();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    nameOnCard: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would process the payment here.
    alert('Thank you for your order! (This is a demo)');
    clearCart();
    // Redirect to a success page or homepage
    router.push('/');
  };

  const subtotal = getCartTotal();
  const taxes = subtotal * 0.08; // Example 8% tax
  const total = subtotal + taxes;

  return (
    <>
      <Header startSolid={true} />
      <main className="bg-slate-50 pt-24">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-4xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-red-600 font-semibold mb-8 hover:underline">
              <ArrowLeft size={20} />
              <span>Back to shopping</span>
            </Link>
            <h1 className="text-4xl font-extrabold text-slate-800 mb-8">Checkout</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Order Summary */}
              <div className="lg:col-span-1 lg:order-2 bg-white p-6 rounded-xl shadow-lg h-fit sticky top-28">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Order Summary</h2>
                <div className="space-y-4">
                  {cartItems.length > 0 ? (
                    cartItems.map(item => (
                      <div key={item.id} className="flex justify-between items-start gap-4">
                        <div className="flex gap-4">
                          <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{item.name}</p>
                            <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-slate-800 whitespace-nowrap">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center">Your cart is empty.</p>
                  )}
                </div>
                {cartItems.length > 0 && (
                  <div className="border-t mt-6 pt-4 space-y-2 text-slate-600">
                    <div className="flex justify-between">
                      <p>Subtotal</p>
                      <p className="font-medium">{formatPrice(subtotal)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p>Taxes & Fees</p>
                      <p className="font-medium">{formatPrice(taxes)}</p>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-800 mt-2">
                      <p>Total</p>
                      <p>{formatPrice(total)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="lg:col-span-2 lg:order-1">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">First Name</label>
                        <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">Last Name</label>
                        <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone Number</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Payment Details</h2>
                    <div className="space-y-4">
                       <div>
                          <label htmlFor="nameOnCard" className="block text-sm font-medium text-slate-700">Name on Card</label>
                          <input type="text" name="nameOnCard" id="nameOnCard" value={formData.nameOnCard} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" />
                       </div>
                       <div>
                          <label htmlFor="cardNumber" className="block text-sm font-medium text-slate-700">Card Number</label>
                          <div className="relative mt-1">
                            <input type="text" name="cardNumber" id="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required className="block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm pl-10" placeholder="0000 0000 0000 0000" />
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <CreditCard className="h-5 w-5 text-slate-400" />
                            </div>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-700">Expiry Date</label>
                            <input type="text" name="expiryDate" id="expiryDate" value={formData.expiryDate} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" placeholder="MM / YY" />
                         </div>
                         <div>
                            <label htmlFor="cvc" className="block text-sm font-medium text-slate-700">CVC</label>
                            <input type="text" name="cvc" id="cvc" value={formData.cvc} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm" placeholder="123" />
                         </div>
                       </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full flex justify-center items-center gap-2 bg-red-600 text-white font-bold py-4 px-6 rounded-full text-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg" disabled={cartItems.length === 0}>
                    <Lock size={20} />
                    <span>Place Order</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
