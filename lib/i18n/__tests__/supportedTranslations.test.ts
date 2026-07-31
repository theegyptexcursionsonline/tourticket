import {
  filterSupportedTranslations,
  resolveBaseLocale,
  withBaseLocaleBucket,
} from '../supportedTranslations';

describe('filterSupportedTranslations', () => {
  it('keeps only site-supported locales and reports the dropped ones', () => {
    const { translations, droppedLocales } = filterSupportedTranslations({
      ar: { title: 'عنوان' },
      de: { title: 'Titel' },
      it: { title: 'Titolo' },
      ru: { title: 'Заголовок' },
    });

    expect(Object.keys(translations)).toEqual(['ar', 'de']);
    expect(droppedLocales).toEqual(['it', 'ru']);
  });

  it('accepts regioned codes whose base locale is supported', () => {
    const { translations, droppedLocales } = filterSupportedTranslations({
      'de-DE': { title: 'Titel' },
      'pt-BR': { title: 'Título' },
    });

    expect(Object.keys(translations)).toEqual(['de-DE']);
    expect(droppedLocales).toEqual(['pt-BR']);
  });

  it('handles missing translations', () => {
    expect(filterSupportedTranslations(undefined)).toEqual({
      translations: {},
      droppedLocales: [],
    });
    expect(filterSupportedTranslations(null)).toEqual({
      translations: {},
      droppedLocales: [],
    });
  });

  it('respects an explicit supported set', () => {
    const { translations, droppedLocales } = filterSupportedTranslations(
      { de: { title: 'Titel' }, fr: { title: 'Titre' } },
      ['de'],
    );

    expect(Object.keys(translations)).toEqual(['de']);
    expect(droppedLocales).toEqual(['fr']);
  });
});

describe('resolveBaseLocale', () => {
  it('falls back to the site default when the engine sends no defaultLocale', () => {
    expect(resolveBaseLocale(undefined)).toEqual({ ok: true, baseLocale: 'en' });
    expect(resolveBaseLocale(null)).toEqual({ ok: true, baseLocale: 'en' });
    expect(resolveBaseLocale('  ')).toEqual({ ok: true, baseLocale: 'en' });
  });

  it('accepts a locale this site serves', () => {
    expect(resolveBaseLocale('de')).toEqual({ ok: true, baseLocale: 'de' });
    expect(resolveBaseLocale('AR')).toEqual({ ok: true, baseLocale: 'ar' });
  });

  it('resolves a regioned code to its base locale', () => {
    expect(resolveBaseLocale('de-DE')).toEqual({ ok: true, baseLocale: 'de' });
  });

  it('rejects a locale this site does not serve', () => {
    const result = resolveBaseLocale('it');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain('not served by this site');
  });

  it('rejects a non-string defaultLocale', () => {
    expect(resolveBaseLocale(42).ok).toBe(false);
  });

  it('honours an explicit supported set', () => {
    expect(resolveBaseLocale('fr', ['de', 'en']).ok).toBe(false);
    expect(resolveBaseLocale('de', ['de', 'en'])).toEqual({ ok: true, baseLocale: 'de' });
  });
});

describe('withBaseLocaleBucket', () => {
  const bucket = { title: 'Titel', content: 'Inhalt' };

  it('files a non-default base payload under its own locale', () => {
    expect(withBaseLocaleBucket({}, 'de', bucket)).toEqual({ de: bucket });
  });

  it('leaves translations untouched when the base payload is already the site default', () => {
    const existing = { ar: { title: 'عنوان' } };

    expect(withBaseLocaleBucket(existing, 'en', bucket)).toEqual(existing);
  });

  it('never overwrites an explicit translation for the base locale', () => {
    const existing = { de: { title: 'Redaktionell' } };

    expect(withBaseLocaleBucket(existing, 'de', bucket)).toEqual(existing);
  });

  it('treats a regioned explicit translation as already provided', () => {
    const existing = { 'de-DE': { title: 'Redaktionell' } };

    expect(withBaseLocaleBucket(existing, 'de', bucket)).toEqual(existing);
  });
});
