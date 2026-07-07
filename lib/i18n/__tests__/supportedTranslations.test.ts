import { filterSupportedTranslations } from '../supportedTranslations';

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
