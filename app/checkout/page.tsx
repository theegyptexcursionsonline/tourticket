'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, User, Zap, Lock, Shield, Smartphone, Headphones } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';

// Mock checkout data
const checkoutData = {
  tour: {
    title: 'Amsterdam Evening & Night Boat Tour',
    guests: '2 adults',
    type: 'Canal Cruise 1hr',
    date: '05/09/2025',
    time: '09:15',
    price: 31.00,
    image: '/images2/3.png'
  },
  pricing: {
    subtotal: 32.50,
    tax: 2.82,
    bookingFee: 1.50,
    total: 32.50
  }
};

const upgrades = [
  {
    id: 'red-light-secrets',
    title: 'ADD-ON: RED LIGHT SECRETS',
    description: 'Save 25%',
    duration: '45 minutes',
    bookings: 3638,
    originalPrice: 17,
    salePrice: 12.50,
    image: '/images2/red-light.png'
  },
  {
    id: 'ripleys-believe',
    title: 'ADD-ON: RIPLEY\'S BELIEVE IT OR NOT!',
    description: '',
    duration: '2 hours',
    bookings: 10573,
    originalPrice: 22.50,
    salePrice: 12.50,
    image: '/images2/ripleys.png'
  }
];

const CheckoutSteps = ({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) => (
  <div className="flex items-center justify-center mb-8">
    <div className="flex items-center gap-4">
      <button
        onClick={() => onStepClick(1)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
          currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        <User size={18} />
        <span>Personal details</span>
      </button>
      
      <div className={`w-8 h-0.5 ${currentStep > 1 ? 'bg-blue-500' : 'bg-gray-200'}`} />
      
      <button
        onClick={() => onStepClick(2)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
          currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        <Zap size={18} />
        <span>Upgrades</span>
      </button>
      
      <div className={`w-8 h-0.5 ${currentStep > 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
      
      <button
        onClick={() => onStepClick(3)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
          currentStep >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        <Lock size={18} />
        <span>Payment</span>
      </button>
    </div>
  </div>
);

const BookingSummary = () => {
  const { formatPrice } = useSettings();
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
      {/* Timer */}
      <div className="bg-blue-900 text-white p-3 rounded-lg mb-4 flex items-center gap-2">
        <Clock size={18} />
        <span className="text-sm font-medium">Prices are valid for another 08:24 minutes</span>
      </div>

      {/* Tour Details */}
      <div className="flex gap-4 mb-4">
        <img 
          src={checkoutData.tour.image} 
          alt={checkoutData.tour.title}
          className="w-20 h-20 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            {checkoutData.tour.title}
          </h3>
          <p className="text-sm text-gray-600 mb-1">{checkoutData.tour.guests}</p>
          <p className="text-sm text-gray-600 mb-1">{checkoutData.tour.type}</p>
          <p className="text-sm text-gray-600">
            {checkoutData.tour.date} {checkoutData.tour.time}
          </p>
        </div>
        <div className="text-right">
          <button className="text-blue-600 font-medium text-sm mb-1">EDIT</button>
          <br />
          <button className="text-red-600 font-medium text-sm">REMOVE</button>
          <p className="text-xl font-bold text-red-600 mt-2">
            €{checkoutData.tour.price}
          </p>
        </div>
      </div>

      {/* Discount Code */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" />
          <span className="text-gray-700">I have a discount code</span>
        </label>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2 mb-4 pt-4 border-t">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(checkoutData.pricing.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatPrice(checkoutData.pricing.tax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Booking fee</span>
          <span>{formatPrice(checkoutData.pricing.bookingFee)}</span>
        </div>
      </div>

      <div className="flex justify-between text-xl font-bold pt-4 border-t">
        <span>Total</span>
        <span>{formatPrice(checkoutData.pricing.total)}</span>
      </div>
    </div>
  );
};

const PersonalDetailsStep = ({ onNext }: { onNext: () => void }) => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal details</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your e-mail address*
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your full name*
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone number
          </label>
          <div className="flex">
            <select className="p-3 border border-gray-300 rounded-l-lg bg-white">
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
            </select>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Phone number"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            We'll reach out to you via WhatsApp with essential updates, news, or changes to your booking. You can stop this service at any time.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center mt-12 mb-8">
        <span className="text-gray-500 mr-4">or</span>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-xl font-bold mb-4">SIGN IN WITH</h3>
        <div className="flex justify-center gap-4">
          <button type="button" className="p-3 bg-gray-900 text-white rounded-full">
            <span className="text-lg font-bold">G</span>
          </button>
          <button type="button" className="p-3 bg-blue-600 text-white rounded-full">
            <span className="text-lg font-bold">f</span>
          </button>
          <button type="button" className="p-3 bg-black text-white rounded-full">
            <span className="text-lg font-bold">🍎</span>
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-red-600 text-white font-bold py-4 rounded-full hover:bg-red-700 transition-colors text-lg"
      >
        CONTINUE TO UPGRADES
      </button>
    </form>
  );
};

const UpgradesStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
  const { formatPrice } = useSettings();

  return (
    <div className="bg-white rounded-lg p-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 font-medium mb-6 hover:underline"
      >
        <ArrowLeft size={20} />
        BACK TO CART
      </button>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Book together to save money</h2>
      <p className="text-lg text-gray-600 mb-8">Make more memories with an extra experience.</p>

      <div className="space-y-6 mb-8">
        {upgrades.map((upgrade) => (
          <div key={upgrade.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 flex gap-4">
              <div className="relative">
                <img
                  src={upgrade.image}
                  alt={upgrade.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                {upgrade.description && (
                  <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {upgrade.description}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{upgrade.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span>{upgrade.bookings} bookings</span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {upgrade.duration}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-500 line-through">
                    From {formatPrice(upgrade.originalPrice)}
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatPrice(upgrade.salePrice)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="px-6 pb-4">
              <button className="text-blue-600 font-medium text-sm mb-3 hover:underline">
                Show more info
              </button>
              <button className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">
                ADD TO CART
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-red-600 text-white font-bold py-4 rounded-full hover:bg-red-700 transition-colors text-lg"
      >
        PAY NOW
      </button>
    </div>
  );
};

const PaymentStep = ({ onBack }: { onBack: () => void }) => {
  const { formatPrice } = useSettings();
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    securityCode: '',
    nameOnCard: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle payment processing
    alert('Payment processed successfully!');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 font-medium mb-6 hover:underline"
      >
        <ArrowLeft size={20} />
        BACK TO UPGRADES
      </button>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Please select your payment method</h2>

      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-4 bg-gray-900 rounded"></div>
          <span className="font-bold text-lg">Cards</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">All fields are required unless marked otherwise.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card number
            </label>
            <input
              type="text"
              required
              value={paymentData.cardNumber}
              onChange={(e) => setPaymentData({...paymentData, cardNumber: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1234 5678 9012 3456"
            />
            <div className="flex gap-2 mt-2">
              <img src="/payment/visa.svg" alt="Visa" className="w-8 h-5" />
              <img src="/payment/mastercard.svg" alt="Mastercard" className="w-8 h-5" />
              <img src="/payment/maestro.svg" alt="Maestro" className="w-8 h-5" />
              <img src="/payment/jcb.svg" alt="JCB" className="w-8 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry date
              </label>
              <input
                type="text"
                required
                value={paymentData.expiryDate}
                onChange={(e) => setPaymentData({...paymentData, expiryDate: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="MM/YY"
              />
              <p className="text-xs text-gray-500 mt-1">Front of card in MM/YY format</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security code
              </label>
              <input
                type="text"
                required
                value={paymentData.securityCode}
                onChange={(e) => setPaymentData({...paymentData, securityCode: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123"
              />
              <p className="text-xs text-gray-500 mt-1">3 digits on back of card</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name on card
            </label>
            <input
              type="text"
              required
              value={paymentData.nameOnCard}
              onChange={(e) => setPaymentData({...paymentData, nameOnCard: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gray-900 text-white font-bold py-4 rounded-lg mt-6 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <Lock size={18} />
          Pay {formatPrice(checkoutData.pricing.total)}
        </button>
      </div>
    </form>
  );
};

const TrustIndicators = () => (
  <div className="flex flex-wrap justify-center items-center gap-6 py-6 text-sm text-gray-600 border-t">
    <div className="flex items-center gap-2">
      <Shield size={16} className="text-green-600" />
      <span>Easy and secure booking</span>
    </div>
    <div className="flex items-center gap-2">
      <Smartphone size={16} className="text-blue-600" />
      <span>Ticket is directly available on smartphone</span>
    </div>
    <div className="flex items-center gap-2">
      <Headphones size={16} className="text-purple-600" />
      <span>Excellent customer service</span>
    </div>
  </div>
);

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <Header startSolid={true} />
      <main className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <CheckoutSteps currentStep={currentStep} onStepClick={setCurrentStep} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {currentStep === 1 && (
                <PersonalDetailsStep onNext={() => setCurrentStep(2)} />
              )}
              
              {currentStep === 2 && (
                <UpgradesStep 
                  onNext={() => setCurrentStep(3)} 
                  onBack={() => setCurrentStep(1)}
                />
              )}
              
              {currentStep === 3 && (
                <PaymentStep onBack={() => setCurrentStep(2)} />
              )}
            </div>

            <div className="lg:col-span-1">
              <BookingSummary />
            </div>
          </div>

          <TrustIndicators />
        </div>
      </main>
      <Footer />
    </>
  );
}