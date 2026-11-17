import { bookingOptionUnitLabel, difficultyLabel } from '@/lib/bookings/bookingOptionLabels';

describe('bookingOptionUnitLabel', () => {
  it.each([
    ['Per Person', 'per person'],
    ['Per Couple', 'per couple'],
    ['Per Group', 'per group'],
    ['Per Family', 'per family'],
  ])('maps %s without claiming every option is per person', (type, expected) => {
    expect(bookingOptionUnitLabel(type)).toBe(expected);
  });

  it('uses a truthful neutral label for unknown legacy types', () => {
    expect(bookingOptionUnitLabel('')).toBe('per booking');
  });
});

describe('difficultyLabel', () => {
  const ar: Record<string, string> = {
    'booking.difficultyEasy': 'سهلة',
    'booking.difficultyModerate': 'متوسطة',
    'booking.difficultyChallenging': 'صعبة',
    'booking.difficultyDifficult': 'صعبة جدًا',
  };
  const t = (key: string) => ar[key] ?? key;

  it.each([
    ['Easy', 'سهلة'],
    [' moderate ', 'متوسطة'],
    ['Challenging', 'صعبة'],
    ['DIFFICULT', 'صعبة جدًا'],
  ])('shows %s in the visitor language', (value, expected) => {
    expect(difficultyLabel(value, t)).toBe(expected);
  });

  it('keeps an unknown value as entered and never invents one', () => {
    expect(difficultyLabel('Extreme', t)).toBe('Extreme');
    expect(difficultyLabel(undefined, t)).toBe('');
  });
});
