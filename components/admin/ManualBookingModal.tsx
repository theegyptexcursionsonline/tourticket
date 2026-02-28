'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search, Calendar, Clock, Users, DollarSign, Mail, Phone, User, MapPin, CreditCard, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import HotelPickupMap from '@/components/HotelPickupMap';

interface Tour {
  _id: string;
  title: string;
  slug: string;
  // Current DB schema uses discountPrice/originalPrice (and optional price)
  discountPrice?: number;
  originalPrice?: number;
  price?: number;
  bookingOptions?: {
    type: string;
    label: string;
    price: number;
    duration?: string;
    originalPrice?: number;
    badge?: string;
  }[];
}

interface HotelPickupLocation {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  name?: string;
}

// Safe toFixed helper - handles undefined/null/NaN values
const safeToFixed = (value: number | undefined | null, digits = 2): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return (0).toFixed(digits);
  return Number(value).toFixed(digits);
};

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [tourSearch, setTourSearch] = useState('');

  const getTourBasePrice = (tour: Tour): number => {
    const optionPrices = (tour.bookingOptions || [])
      .map(o => Number(o?.price))
      .filter(p => Number.isFinite(p) && p >= 0);
    if (optionPrices.length > 0) return Math.min(...optionPrices);

    const fallback = tour.discountPrice ?? tour.price ?? 0;
    return Number.isFinite(fallback) ? fallback : 0;
  };

  const getBookingOptionKey = (option: NonNullable<Tour['bookingOptions']>[number], index: number) => {
    // bookingOptions are stored without an id in DB (schema uses _id:false), so we generate a stable key per tour payload
    return `${option.type || 'option'}-${index}`;
  };

  // Form data
  const [formData, setFormData] = useState({
    // Tour selection
    tourId: '',
    selectedTour: null as Tour | null,
    bookingOptionId: '',
    bookingOptionTitle: '',
    bookingOptionPrice: 0,

    // Customer info
    customerFirstName: '',
    customerLastName: '',
    customerEmail: '',
    customerPhone: '',
    isNewCustomer: true,
    existingUserId: '',

    // Booking details
    bookingDate: '',
    bookingTime: '10:00',
    adultGuests: 1,
    childGuests: 0,
    infantGuests: 0,

    // Pricing
    basePrice: 0,
    customPrice: false,
    totalPrice: 0,
    serviceFee: 0,
    tax: 0,

    // Payment
    paymentMethod: 'external' as 'external' | 'cash' | 'bank',
    paymentId: '',
    paymentStatus: 'paid' as 'paid' | 'pending',

    // Additional
    specialRequests: '',
    hotelPickupDetails: '',
    hotelPickupLocation: null as HotelPickupLocation | null,
    internalNotes: '',
  });

  // Fetch tours
  useEffect(() => {
    const fetchTours = async () => {
      setLoadingTours(true);
      try {
        const response = await fetch('/api/admin/tours?limit=500');
        if (response.ok) {
          const result = await response.json();
          // Handle different API response formats
          const toursData = result.data || result.tours || result || [];
          setTours(Array.isArray(toursData) ? toursData : []);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
        toast.error('Failed to load tours');
      } finally {
        setLoadingTours(false);
      }
    };

    if (isOpen) {
      fetchTours();
    }
  }, [isOpen]);

  // Calculate pricing whenever relevant fields change
  useEffect(() => {
    if (!formData.customPrice) {
      const price = formData.bookingOptionPrice || formData.basePrice || 0;
      const adultTotal = price * formData.adultGuests;
      const childTotal = (price / 2) * formData.childGuests;
      const subtotal = adultTotal + childTotal;
      const serviceFee = subtotal * 0.03;
      const tax = subtotal * 0.05;
      const total = subtotal + serviceFee + tax;

      setFormData(prev => ({
        ...prev,
        serviceFee: parseFloat(serviceFee.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        totalPrice: parseFloat(total.toFixed(2)),
      }));
    }
  }, [formData.bookingOptionPrice, formData.basePrice, formData.adultGuests, formData.childGuests, formData.customPrice]);

  // Filter tours based on search
  const filteredTours = tours.filter(tour =>
    tour.title.toLowerCase().includes(tourSearch.toLowerCase())
  );

  // Handle tour selection
  const handleTourSelect = (tour: Tour) => {
    const defaultPrice = getTourBasePrice(tour);
    const firstOption = tour.bookingOptions?.[0];
    const firstOptionKey = firstOption ? getBookingOptionKey(firstOption, 0) : '';

    setFormData(prev => ({
      ...prev,
      tourId: tour._id,
      selectedTour: tour,
      basePrice: defaultPrice,
      bookingOptionId: firstOptionKey,
      bookingOptionTitle: firstOption?.label || '',
      bookingOptionPrice: firstOption?.price || defaultPrice,
    }));
  };

  // Handle booking option selection
  const handleBookingOptionChange = (optionId: string) => {
    const options = formData.selectedTour?.bookingOptions || [];
    const idx = options.findIndex((o, i) => getBookingOptionKey(o, i) === optionId);
    const option = idx >= 0 ? options[idx] : undefined;

    if (option) {
      setFormData(prev => ({
        ...prev,
        bookingOptionId: optionId,
        bookingOptionTitle: option.label,
        bookingOptionPrice: option.price,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate
    if (!formData.tourId) {
      toast.error('Please select a tour');
      setStep(1);
      return;
    }
    if (!formData.customerEmail || !formData.customerFirstName || !formData.customerLastName) {
      toast.error('Please fill in customer details');
      setStep(2);
      return;
    }
    if (!formData.bookingDate) {
      toast.error('Please select a booking date');
      setStep(3);
      return;
    }
    if (formData.adultGuests + formData.childGuests === 0) {
      toast.error('Please add at least one guest');
      setStep(3);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: formData.tourId,
          customer: {
            firstName: formData.customerFirstName,
            lastName: formData.customerLastName,
            email: formData.customerEmail,
            phone: formData.customerPhone,
            isNew: formData.isNewCustomer,
            existingUserId: formData.existingUserId || undefined,
          },
          booking: {
            date: formData.bookingDate,
            time: formData.bookingTime,
            adultGuests: formData.adultGuests,
            childGuests: formData.childGuests,
            infantGuests: formData.infantGuests,
            bookingOption: formData.bookingOptionId ? {
              id: formData.bookingOptionId,
              title: formData.bookingOptionTitle,
              price: formData.bookingOptionPrice,
            } : undefined,
          },
          pricing: {
            basePrice: formData.bookingOptionPrice || formData.basePrice,
            serviceFee: formData.serviceFee,
            tax: formData.tax,
            totalPrice: formData.totalPrice,
          },
          payment: {
            method: formData.paymentMethod,
            externalPaymentId: formData.paymentId || undefined,
            status: formData.paymentStatus,
          },
          specialRequests: formData.specialRequests || undefined,
          hotelPickupDetails: formData.hotelPickupDetails || undefined,
          hotelPickupLocation: formData.hotelPickupLocation || undefined,
          internalNotes: formData.internalNotes || undefined,
          isManualBooking: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      const data = await response.json();
      toast.success(`Booking created successfully! Reference: ${data.bookingReference}`);
      onSuccess();
      onClose();
      resetForm();
    } catch (error: unknown) {
      console.error('Error creating booking:', error);
      const message = error instanceof Error ? error.message : 'Failed to create booking';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      tourId: '',
      selectedTour: null,
      bookingOptionId: '',
      bookingOptionTitle: '',
      bookingOptionPrice: 0,
      customerFirstName: '',
      customerLastName: '',
      customerEmail: '',
      customerPhone: '',
      isNewCustomer: true,
      existingUserId: '',
      bookingDate: '',
      bookingTime: '10:00',
      adultGuests: 1,
      childGuests: 0,
      infantGuests: 0,
      basePrice: 0,
      customPrice: false,
      totalPrice: 0,
      serviceFee: 0,
      tax: 0,
      paymentMethod: 'external',
      paymentId: '',
      paymentStatus: 'paid',
      specialRequests: '',
      hotelPickupDetails: '',
      hotelPickupLocation: null,
      internalNotes: '',
    });
    setTourSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={() => !isSubmitting && onClose()}
        />

        <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div>
              <h2 className="text-xl font-bold text-white">Create Manual Booking</h2>
              <p className="text-blue-100 text-sm mt-1">Add a new booking manually</p>
            </div>
            <button
              onClick={() => !isSubmitting && onClose()}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Select Tour' },
                { num: 2, label: 'Customer Info' },
                { num: 3, label: 'Booking Details' },
                { num: 4, label: 'Payment & Review' },
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1">
                  <button
                    onClick={() => setStep(s.num)}
                    className={`flex items-center gap-2 ${
                      step === s.num
                        ? 'text-blue-600'
                        : step > s.num
                        ? 'text-green-600'
                        : 'text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                        step === s.num
                          ? 'bg-blue-600 text-white border-blue-600'
                          : step > s.num
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-slate-300 text-slate-400'
                      }`}
                    >
                      {step > s.num ? <CheckCircle size={16} /> : s.num}
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{s.label}</span>
                  </button>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-green-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Select Tour */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search tours..."
                    value={tourSearch}
                    onChange={(e) => setTourSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {loadingTours ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {filteredTours.map((tour) => (
                      <button
                        key={tour._id}
                        onClick={() => handleTourSelect(tour)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          formData.tourId === tour._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-medium text-slate-900">{tour.title}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          Base price: ${getTourBasePrice(tour)} per adult
                          {tour.bookingOptions && tour.bookingOptions.length > 0 && (
                            <span className="ml-2 text-blue-600">
                              • {tour.bookingOptions.length} booking options
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredTours.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        No tours found matching your search
                      </div>
                    )}
                  </div>
                )}

                {formData.selectedTour && formData.selectedTour.bookingOptions && formData.selectedTour.bookingOptions.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Booking Option
                    </label>
                    <select
                      value={formData.bookingOptionId}
                      onChange={(e) => handleBookingOptionChange(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {formData.selectedTour.bookingOptions.map((option, idx) => (
                        <option key={getBookingOptionKey(option, idx)} value={getBookingOptionKey(option, idx)}>
                          {option.label} - ${option.price}
                          {option.duration && ` (${option.duration})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Customer Info */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={formData.customerFirstName}
                        onChange={(e) => setFormData({ ...formData, customerFirstName: e.target.value })}
                        placeholder="John"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerLastName}
                      onChange={(e) => setFormData({ ...formData, customerLastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hotel Pickup Location
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={formData.hotelPickupDetails}
                        onChange={(e) => setFormData({ ...formData, hotelPickupDetails: e.target.value })}
                        placeholder="Hotel name (optional)"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <HotelPickupMap
                        tourLocation={formData.selectedTour?.title || 'Egypt'}
                        defaultPickupOption="now"
                        initialLocation={formData.hotelPickupLocation || undefined}
                        onLocationSelect={(loc) => {
                          setFormData(prev => ({
                            ...prev,
                            hotelPickupLocation: loc,
                            // If admin hasn't typed a name, default to place name/address for display
                            hotelPickupDetails: prev.hotelPickupDetails || (loc?.name || loc?.address || ''),
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Booking Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Booking Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="date"
                        value={formData.bookingDate}
                        onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Booking Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="time"
                        value={formData.bookingTime}
                        onChange={(e) => setFormData({ ...formData, bookingTime: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    <Users className="inline mr-2" size={16} />
                    Guests
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Adults</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, adultGuests: Math.max(0, formData.adultGuests - 1) })}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{formData.adultGuests}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, adultGuests: formData.adultGuests + 1 })}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Children</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, childGuests: Math.max(0, formData.childGuests - 1) })}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{formData.childGuests}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, childGuests: formData.childGuests + 1 })}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Infants</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, infantGuests: Math.max(0, formData.infantGuests - 1) })}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{formData.infantGuests}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, infantGuests: formData.infantGuests + 1 })}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                    placeholder="Any special requirements or notes..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Payment & Review */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Booking Summary */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tour:</span>
                      <span className="font-medium text-slate-900">{formData.selectedTour?.title || '—'}</span>
                    </div>
                    {formData.bookingOptionTitle && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Option:</span>
                        <span className="font-medium text-slate-900">{formData.bookingOptionTitle}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Customer:</span>
                      <span className="font-medium text-slate-900">
                        {formData.customerFirstName} {formData.customerLastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date & Time:</span>
                      <span className="font-medium text-slate-900">
                        {formData.bookingDate} at {formData.bookingTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Guests:</span>
                      <span className="font-medium text-slate-900">
                        {formData.adultGuests}A, {formData.childGuests}C, {formData.infantGuests}I
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <CreditCard className="inline mr-2" size={16} />
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'external', label: 'External (Stripe)', icon: CreditCard },
                      { value: 'cash', label: 'Cash', icon: DollarSign },
                      { value: 'bank', label: 'Bank Transfer', icon: FileText },
                    ].map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method.value as 'external' | 'cash' | 'bank' })}
                        className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${
                          formData.paymentMethod === method.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <method.icon size={18} />
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* External Payment ID */}
                {formData.paymentMethod === 'external' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Stripe Payment ID (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.paymentId}
                      onChange={(e) => setFormData({ ...formData, paymentId: e.target.value })}
                      placeholder="pi_xxxxxxxxxx"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter the Stripe payment ID if available (e.g., pi_3ShOGLDstYVU2pYL0pIIMFhI)
                    </p>
                  </div>
                )}

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Status
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentStatus: 'paid' })}
                      className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                        formData.paymentStatus === 'paid'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <CheckCircle size={18} />
                      <span className="font-medium">Paid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentStatus: 'pending' })}
                      className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                        formData.paymentStatus === 'pending'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-slate-200 hover:border-yellow-300'
                      }`}
                    >
                      <Clock size={18} />
                      <span className="font-medium">Pending</span>
                    </button>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Pricing</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.customPrice}
                        onChange={(e) => setFormData({ ...formData, customPrice: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Custom price
                    </label>
                  </div>

                  {formData.customPrice ? (
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Total Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.totalPrice}
                        onChange={(e) => setFormData({ ...formData, totalPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>{formData.adultGuests} Adults × ${formData.bookingOptionPrice || formData.basePrice}</span>
                        <span>${safeToFixed((formData.bookingOptionPrice || formData.basePrice) * formData.adultGuests)}</span>
                      </div>
                      {formData.childGuests > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>{formData.childGuests} Children × ${safeToFixed((formData.bookingOptionPrice || formData.basePrice) / 2)}</span>
                          <span>${safeToFixed(((formData.bookingOptionPrice || formData.basePrice) / 2) * formData.childGuests)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Service Fee (3%)</span>
                        <span>${safeToFixed(formData.serviceFee)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tax (5%)</span>
                        <span>${safeToFixed(formData.tax)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-200">
                        <span>Total</span>
                        <span>${safeToFixed(formData.totalPrice)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Internal Notes (Admin only)
                  </label>
                  <textarea
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                    placeholder="Notes for internal reference..."
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              {step > 1 ? '← Back' : 'Cancel'}
            </button>

            <div className="flex items-center gap-3">
              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !formData.tourId) ||
                    (step === 2 && (!formData.customerEmail || !formData.customerFirstName || !formData.customerLastName))
                  }
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Create Booking
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualBookingModal;

