import { bookingDateLocale, calendarMonthTitle, calendarWeekdayNames, formatBookingDate } from '@/lib/i18n/bookingDates';

// 19 Nov 2026: the calendar heading read "November 2026" and the weekday
// columns "Su Mo Tu" on every language; a sister site printed the chosen date
// as "Friday, November 20, 2026" on its German page.
const day = new Date(2026, 10, 20, 12);

describe('booking dates follow the page language', () => {
  it.each([
    ['en', 'November 2026', 'Friday, November 20, 2026'],
    ['de', 'November 2026', 'Freitag, 20. November 2026'],
    ['fr', 'novembre 2026', 'vendredi 20 novembre 2026'],
    ['es', 'noviembre de 2026', 'viernes, 20 de noviembre de 2026'],
    ['ru', 'ноябрь 2026 г.', 'пятница, 20 ноября 2026 г.'],
  ])('%s', (locale, month, full) => {
    expect(calendarMonthTitle(day, locale)).toBe(month);
    expect(formatBookingDate(day, locale)).toBe(full);
  });

  it('Arabic uses Arabic month and day names with Latin digits', () => {
    expect(calendarMonthTitle(day, 'ar')).toMatch(/نوفمبر 2026/);
    const full = formatBookingDate(day, 'ar');
    expect(full).toMatch(/الجمعة/);
    expect(full).toMatch(/20/);
    expect(full).not.toMatch(/[٠-٩]/);
  });

  it('weekday columns start on Sunday in every language; English keeps two letters', () => {
    expect(calendarWeekdayNames('en')).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
    expect(calendarWeekdayNames('de')[0]).toMatch(/^So/);
    expect(calendarWeekdayNames('fr')[1]).toMatch(/^lun/);
    expect(calendarWeekdayNames('es')[5]).toMatch(/^vie/);
    expect(calendarWeekdayNames('ar')[5]).toMatch(/الجمعة/);
    expect(calendarWeekdayNames('ru')[0]).toMatch(/^вс/);
    for (const locale of ['ar', 'de', 'fr', 'es', 'ru']) expect(calendarWeekdayNames(locale)).toHaveLength(7);
  });

  it('a regional or missing locale still works', () => {
    expect(bookingDateLocale('de-DE')).toBe('de-u-nu-latn');
    expect(bookingDateLocale(undefined)).toBe('en-u-nu-latn');
  });
});

describe('the booking drawer calendar uses the page language', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const source = require('fs').readFileSync(require('path').join(process.cwd(), 'components', 'BookingSidebar.tsx'), 'utf8');
  it('reads month and weekday names from the language, not a fixed English list', () => {
    expect(source).toContain('{calendarMonthTitle(currentMonth, locale)}');
    expect(source).toContain('calendarWeekdayNames(locale)');
    expect(source).not.toContain("'January', 'February'");
  });

  it('reads the date-state notes from the message files in every language', () => {
    for (const key of ['noDeparturesToday', 'unavailableDatesNote', 'noDeparturesThisMonth', 'noDeparturesThisDate']) {
      expect(source).toContain(`t('booking.${key}')`);
      for (const locale of ['en', 'ar', 'de', 'fr', 'es']) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        expect(require(`../../../messages/${locale}.json`).booking[key]).toBeTruthy();
      }
    }
  });
});
