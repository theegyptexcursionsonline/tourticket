const sameDate = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);

export const EEO_TIME_ZONE = 'Africa/Cairo';

export function isValidDepartureDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** Convert a catalogue-local departure into an unambiguous UTC instant. */
export function localDepartureToUtc(date: string, time: string, timeZone = EEO_TIME_ZONE) {
  if (!isValidDepartureDate(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid local departure');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour === 24 ? 0 : parts.hour, parts.minute, parts.second);
    candidate -= rendered - desired;
  }
  const matches = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    return parts.year === year && parts.month === month && parts.day === day
      && (parts.hour === 24 ? 0 : parts.hour) === hour && parts.minute === minute;
  };
  // A missing or repeated local clock time needs an authored unambiguous slot,
  // never an implicit rollover into another departure.
  if (!matches(candidate) || matches(candidate - 3_600_000) || matches(candidate + 3_600_000)) {
    throw new Error('Invalid local departure');
  }
  return new Date(candidate).toISOString();
}

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

/** Shared display/admission clock rule. Missing and malformed slots fail closed. */
export function isFutureDeparture(date: string, time: string, now = new Date()) {
  try {
    return Number.isFinite(now.getTime()) && new Date(localDepartureToUtc(date, time)).getTime() > now.getTime();
  } catch {
    return false;
  }
}

export function futureDepartureSlots<T extends { time: string }>(date: string, slots: readonly T[], now = new Date()): T[] {
  return slots.filter(slot => isFutureDeparture(date, slot.time, now));
}
