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

   <div className="flex justify-center gap-4">
  <button type="button" className="w-12 h-12 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center">
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  </button>
  <button type="button" className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  </button>
  <button type="button" className="w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  </button>
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