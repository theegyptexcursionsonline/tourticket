import Booking from '@/lib/models/Booking';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { ensureDateOnlyString, parseLocalDate } from '@/utils/date';

export class UnavailableTourError extends Error {
  status = 409;
  constructor(message = 'One or more selected departures are no longer available') {
    super(message);
    this.name = 'UnavailableTourError';
  }
}

export async function assertCartAvailability(cart: any[]) {
  for (const item of cart) {
    const tourId = String(item?._id || item?.id || '');
    const tour: any = await Tour.findOne({ _id: tourId, isPublished: true, ...DEFAULT_TENANT_FILTER })
      .select('_id availability bookingOptions')
      .lean();
    if (!tour) throw new UnavailableTourError('A selected tour is unavailable');

    const day = parseLocalDate(item.selectedDate);
    const dateString = ensureDateOnlyString(item.selectedDate);
    if (!day || !dateString || day.getTime() < new Date().setHours(0, 0, 0, 0)) {
      throw new UnavailableTourError('A selected departure date is invalid');
    }
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    const optionId = String(item?.selectedBookingOption?.id || item?.selectedBookingOption?._id || '');
    const stopSale = await StopSale.exists({
      tourId: tour._id,
      startDate: { $lte: end },
      endDate: { $gte: day },
      $or: [{ optionIds: { $size: 0 } }, ...(optionId ? [{ optionIds: optionId }] : [])],
    });
    if (stopSale) throw new UnavailableTourError();

    const requested = Number(item.quantity || 0) + Number(item.childQuantity || 0) + Number(item.infantQuantity || 0);
    const slot = tour.availability?.slots?.find((candidate: any) => candidate.time === item.selectedTime);
    if (slot && Number.isFinite(Number(slot.capacity))) {
      const sold = await Booking.aggregate([
        { $match: { tour: tour._id, dateString, status: { $nin: ['Cancelled', 'cancelled', 'Refunded', 'refunded'] }, ...DEFAULT_TENANT_FILTER } },
        { $group: { _id: null, guests: { $sum: '$guests' } } },
      ]);
      if (Number(sold[0]?.guests || 0) + requested > Number(slot.capacity || 0)) {
        throw new UnavailableTourError();
      }
    }
  }
}
