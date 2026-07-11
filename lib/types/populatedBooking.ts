import type { IBookingOption } from '@/lib/models/Tour';

export interface PopulatedBookingUser {
  _id: { toString(): string } | string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
}

export interface PopulatedBookingTour {
  _id: { toString(): string } | string;
  title: string;
  slug?: string;
  image?: string;
  images?: string[];
  duration?: string;
  rating?: number;
  discountPrice?: number;
  meetingPoint?: string;
  destination?: unknown;
  bookingOptions?: IBookingOption[];
}
