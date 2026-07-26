/**
 * Client report (26 Jul): auto-translate skipped the repeated blocks — a
 * destination's FAQs / travel tips / weather warnings and a landing page's FAQs
 * stayed English on every locale. These lock both halves: what gets sent to the
 * translator, and how a translated bucket is merged back on read.
 */

import {
  extractStructuredObjectContent,
  extractStructuredSpecContent,
  normalizeStructuredTranslationContent,
} from '@/lib/i18n/structuredContent';
import {
  localizeStructuredEntries,
  localizeStructuredObjects,
} from '@/lib/i18n/contentLocalization';
import {
  categoryStructuredFields,
  destinationStructuredObjectFields,
  destinationStructuredFields,
  destinationTranslationFields,
  attractionPageStructuredFields,
} from '@/lib/i18n/translationFields';

describe('structured translation extraction', () => {
  it('pulls FAQ and travel-tip text out of a destination', () => {
    const content = extractStructuredSpecContent(
      {
        faqs: [{ question: 'Is it hot?', answer: 'Very.', _id: 'abc' }],
        travelTips: [{ title: 'Bring water', content: 'Two litres per person.' }],
      },
      destinationStructuredFields
    );

    expect(content).toEqual({
      faqs: [{ question: 'Is it hot?', answer: 'Very.' }],
      travelTips: [{ title: 'Bring water', content: 'Two litres per person.' }],
    });
  });

  it('drops blocks with no readable text instead of sending empty arrays', () => {
    expect(extractStructuredSpecContent({ faqs: [], travelTips: undefined }, destinationStructuredFields)).toEqual({});
    expect(extractStructuredSpecContent({ faqs: [{ _id: 'x' }] }, destinationStructuredFields)).toEqual({});
  });

  it('covers the same blocks for attraction/landing pages', () => {
    const content = extractStructuredSpecContent(
      { faqs: [{ question: 'Where do we meet?', answer: 'At the gate.' }] },
      attractionPageStructuredFields
    );
    expect(content.faqs).toHaveLength(1);
  });

  it('covers FAQs, travel tips, and image SEO for category pages', () => {
    const content = extractStructuredSpecContent(
      {
        faqs: [{ question: 'Who can join?', answer: 'Everyone.' }],
        travelTips: [{ title: 'Book early', content: 'Spaces fill fast.' }],
        imageMetadata: [{ url: '/hero.jpg', alt: '', title: 'Cairo adventures' }],
      },
      categoryStructuredFields
    );

    expect(content).toEqual({
      faqs: [{ question: 'Who can join?', answer: 'Everyone.' }],
      travelTips: [{ title: 'Book early', content: 'Spaces fill fast.' }],
      imageMetadata: [{ url: '/hero.jpg', alt: '', title: 'Cairo adventures' }],
    });
  });

  it('keeps image URLs as identities and exposes empty SEO fields for generation', () => {
    const content = extractStructuredSpecContent(
      { imageMetadata: [{ url: '/cairo.jpg', alt: '', title: '' }] },
      destinationStructuredFields
    );

    expect(content.imageMetadata).toEqual([
      { url: '/cairo.jpg', alt: '', title: '' },
    ]);
  });

  it('extracts destination temperature values from the nested object', () => {
    expect(
      extractStructuredObjectContent(
        { averageTemperature: { summer: '35°C', winter: '20°C', internal: 'drop' } },
        destinationStructuredObjectFields
      )
    ).toEqual({
      averageTemperature: { summer: '35°C', winter: '20°C' },
    });
  });

  it('normalizes AI output and preserves the original image URL', () => {
    const source = {
      imageMetadata: [{ url: '/cairo.jpg', alt: 'Cairo', title: 'Cairo tours' }],
      averageTemperature: { summer: '35°C', winter: '20°C' },
    };
    const normalized = normalizeStructuredTranslationContent(
      source,
      {
        imageMetadata: [{
          url: '/rewritten-by-ai.jpg',
          alt: 'Kairo',
          title: 'Kairo Touren',
          unexpected: 'drop',
        }],
        averageTemperature: { summer: '35 Grad', winter: '20 Grad', unexpected: 'drop' },
      },
      destinationStructuredFields,
      destinationStructuredObjectFields
    );

    expect(normalized).toEqual({
      imageMetadata: [{ url: '/cairo.jpg', alt: 'Kairo', title: 'Kairo Touren' }],
      averageTemperature: { summer: '35 Grad', winter: '20 Grad' },
    });
  });

  it('keeps weather warnings translatable as a flat array field', () => {
    expect(destinationTranslationFields.map((f) => f.key)).toContain('weatherWarnings');
  });
});

describe('structured translation merge on read', () => {
  const entity = {
    faqs: [
      { question: 'Is it hot?', answer: 'Very.' },
      { question: 'Any shade?', answer: 'Some.' },
    ],
    translations: {
      de: {
        faqs: [
          { question: 'Ist es heiß?', answer: 'Sehr.' },
          { question: 'Gibt es Schatten?', answer: 'Etwas.' },
        ],
      },
    },
  };

  it('returns the translated entries for the requested locale', () => {
    const localized = localizeStructuredEntries(entity, 'de', destinationStructuredFields);
    expect(localized.faqs[0].question).toBe('Ist es heiß?');
    expect(localized.faqs[1].answer).toBe('Etwas.');
  });

  it('falls back per entry when the translator returned fewer items', () => {
    const partial = {
      ...entity,
      translations: { de: { faqs: [{ question: 'Ist es heiß?', answer: 'Sehr.' }] } },
    };
    const localized = localizeStructuredEntries(partial, 'de', destinationStructuredFields);
    expect(localized.faqs[0].question).toBe('Ist es heiß?');
    expect(localized.faqs[1].question).toBe('Any shade?');
  });

  it('falls back per field when the translator left one blank', () => {
    const partial = {
      ...entity,
      translations: { de: { faqs: [{ question: 'Ist es heiß?', answer: '  ' }] } },
    };
    const localized = localizeStructuredEntries(partial, 'de', destinationStructuredFields);
    expect(localized.faqs[0].answer).toBe('Very.');
  });

  it('leaves the entity untouched when the locale has no bucket', () => {
    const localized = localizeStructuredEntries(entity, 'fr', destinationStructuredFields);
    expect(localized.faqs[0].question).toBe('Is it hot?');
  });

  it('matches translated image metadata by URL after gallery reordering', () => {
    const imageEntity = {
      imageMetadata: [
        { url: '/second.jpg', alt: 'Second', title: 'Second title' },
        { url: '/first.jpg', alt: 'First', title: 'First title' },
      ],
      translations: {
        de: {
          imageMetadata: [
            { url: '/first.jpg', alt: 'Erstes', title: 'Erster Titel' },
            { url: '/second.jpg', alt: 'Zweites', title: 'Zweiter Titel' },
          ],
        },
      },
    };

    const localized = localizeStructuredEntries(
      imageEntity,
      'de',
      destinationStructuredFields
    );
    expect(localized.imageMetadata[0].alt).toBe('Zweites');
    expect(localized.imageMetadata[1].title).toBe('Erster Titel');
  });

  it('merges translated destination temperatures with per-field fallback', () => {
    const temperatureEntity = {
      averageTemperature: { summer: '35°C', winter: '20°C' },
      translations: {
        de: { averageTemperature: { summer: '35 Grad', winter: '' } },
      },
    };

    const localized = localizeStructuredObjects(
      temperatureEntity,
      'de',
      destinationStructuredObjectFields
    );
    expect(localized.averageTemperature).toEqual({
      summer: '35 Grad',
      winter: '20°C',
    });
  });
});
