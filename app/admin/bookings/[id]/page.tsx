// app/admin/bookings/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import withAuth from '@/components/admin/withAuth';
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, Users, Hash, DollarSign, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Define a type for the booking data for better type-safety
interface BookingDetails {
  _id: string;
  tour: {
    _id: string;
    title: string;
    images: string[];
    duration: string;
  };
  user: {
    name: string;
    email: string;
  };
  date: string;
  time: string;
  guests: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

const BookingDetailPage = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      const fetchBooking = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/admin/bookings/${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch booking details');
          }
          const data = await response.json();
          setBooking(data);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      };
      fetchBooking();
    }
  }, [id]);

  if (loading) {
    return (
        <div className="p-6">
            <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
            <div className="bg-white p-8 rounded-lg shadow-md animate-pulse">
                <div className="h-6 w-1/2 bg-gray-300 rounded mb-4"></div>
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="h-48 w-full bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-5 w-3/4 bg-gray-300 rounded"></div>
                    </div>
                    <div>
                        <div className="h-5 w-1/4 bg-gray-300 rounded mb-4"></div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  if (!booking) {
    return <div className="p-6">Booking not found.</div>;
  }

  // Helper component for displaying details
  const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <div className="flex items-center text-slate-700">
        <Icon className="h-5 w-5 mr-3 text-slate-400" />
        <span className="font-semibold mr-2">{label}:</span>
        <span>{value}</span>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 mr-4">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-3xl font-bold text-slate-800">Booking Details</h1>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{booking.tour.title}</h2>
            <p className="text-sm text-slate-500">
              Booking ID: <span className="font-mono">{booking._id}</span>
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
            booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {booking.status || 'Confirmed'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left side: Tour Image */}
          <div className="md:col-span-2">
            <Image
              src={booking.tour.images[0] || '/bg.png'}
              alt={booking.tour.title}
              width={500}
              height={500}
              className="rounded-lg object-cover w-full h-auto shadow-md"
            />
          </div>
          
          {/* Right side: Details */}
          <div className="md:col-span-3 space-y-5">
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Customer Information</h3>
                <div className="space-y-3">
                    <DetailItem icon={User} label="Name" value={booking.user.name} />
                    <DetailItem icon={Mail} label="Email" value={booking.user.email} />
                    <DetailItem icon={Phone} label="Phone" value="N/A" />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Booking Details</h3>
                <div className="space-y-3">
                    <DetailItem icon={Calendar} label="Date" value={new Date(booking.date).toLocaleDateString()} />
                    <DetailItem icon={Clock} label="Time" value={booking.time} />
                    <DetailItem icon={Users} label="Guests" value={booking.guests} />
                    <DetailItem icon={Tag} label="Tour Duration" value={booking.tour.duration} />
                </div>
            </div>

             <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Payment Information</h3>
                <div className="space-y-3">
                     <DetailItem icon={DollarSign} label="Total Price" value={`$${booking.totalPrice.toFixed(2)}`} />
                     <DetailItem icon={Hash} label="Booked On" value={new Date(booking.createdAt).toLocaleString()} />
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(BookingDetailPage);