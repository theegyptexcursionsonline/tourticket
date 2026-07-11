const sameDate = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);

export type TourSchedule = {
  availability?: {
    type?: string;
    availableDays?: number[];
    startDate?: Date;
    endDate?: Date;
    specificDates?: Date[];
    blockedDates?: Date[];
  };
};

export function isTourScheduled(tour: TourSchedule, date: Date) {
  const availability = tour.availability;
  if (!availability) return false;
  if ((availability.blockedDates || []).some((blocked: Date) => sameDate(new Date(blocked), date))) return false;
  if (availability.type === 'specific_dates') return (availability.specificDates || []).some((item: Date) => sameDate(new Date(item), date));
  if (availability.type === 'date_range') {
    if (!availability.startDate || !availability.endDate) return false;
    if (date < new Date(availability.startDate) || date > new Date(availability.endDate)) return false;
  }
  return (availability.availableDays || [0, 1, 2, 3, 4, 5, 6]).includes(date.getUTCDay());
}
