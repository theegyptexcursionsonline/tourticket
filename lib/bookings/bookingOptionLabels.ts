const LABELS: Record<string, string> = {
  'per person': 'per person',
  'per couple': 'per couple',
  'per group': 'per group',
  'per family': 'per family',
};

export function bookingOptionUnitLabel(type?: string | null): string {
  return LABELS[String(type || '').trim().toLowerCase()] || 'per booking';
}

// Difficulty is stored as an English enum; the booking drawer shows it in the
// visitor's language. Unknown values are shown as entered.
const DIFFICULTY_KEYS: Record<string, string> = {
  easy: 'booking.difficultyEasy',
  moderate: 'booking.difficultyModerate',
  challenging: 'booking.difficultyChallenging',
  difficult: 'booking.difficultyDifficult',
};

export function difficultyLabel(value: string | null | undefined, t: (key: string) => string): string {
  const key = DIFFICULTY_KEYS[String(value || '').trim().toLowerCase()];
  return key ? t(key) : String(value || '');
}
