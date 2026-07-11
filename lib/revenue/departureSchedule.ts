const sameDate = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);

export function isTourScheduled(tour: any, date: Date) {
  const availability = tour.availability;
  if (!availability) return false;
  if ((availability.blockedDates || []).some((blocked: Date) => sameDate(new Date(blocked), date))) return false;
  if (availability.type === 'specific_dates') return (availability.specificDates || []).some((item: Date) => sameDate(new Date(item), date));
  if (availability.type === 'date_range' && (date < new Date(availability.startDate) || date > new Date(availability.endDate))) return false;
  return (availability.availableDays || [0, 1, 2, 3, 4, 5, 6]).includes(date.getUTCDay());
}
