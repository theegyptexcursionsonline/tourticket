/**
 * Client report (26 Jul): auto-translate skipped the repeated blocks — a
 * destination's FAQs / travel tips / weather warnings and a landing page's FAQs
 * stayed English on every locale. These lock both halves: what gets sent to the
 * translator, and how a translated bucket is merged back on read.
 */

import { extractStructuredSpecContent } from '@/lib/i18n/structuredContent';
import { localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import {
  destinationStructuredFields,
  destinationTranslationFields,
  attractionPageStructuredFields,
  categoryStructuredFields,
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

  it('covers the same blocks for migrated category pages', () => {
    const content = extractStructuredSpecContent(
      {
        faqs: [{ question: 'Who can join?', answer: 'Everyone.' }],
        travelTips: [{ title: 'Arrive early', content: 'Come 15 minutes before.' }],
        imageMetadata: [{ url: 'category.jpg', alt: 'Category hero', title: 'Hero' }],
      },
      categoryStructuredFields,
    );
    expect(content.faqs).toHaveLength(1);
    expect(content.travelTips).toHaveLength(1);
    expect(content.imageMetadata?.[0]).toMatchObject({ url: 'category.jpg', alt: 'Category hero' });
  });

  it('keeps image URLs as stable join keys while extracting captions', () => {
    const content = extractStructuredSpecContent(
      { imageMetadata: [{ url: 'hero.jpg', alt: 'Cairo skyline', title: 'Sunset' }] },
      attractionPageStructuredFields
    );
    expect(content.imageMetadata).toEqual([
      { url: 'hero.jpg', alt: 'Cairo skyline', title: 'Sunset' },
    ]);
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

  it('matches translated image captions by URL after gallery reordering', () => {
    const localized = localizeStructuredEntries({
      imageMetadata: [
        { url: 'second.jpg', alt: 'Second' },
        { url: 'first.jpg', alt: 'First' },
      ],
      translations: {
        de: {
          imageMetadata: [
            { url: 'first.jpg', alt: 'Erste' },
            { url: 'second.jpg', alt: 'Zweite' },
          ],
        },
      },
    }, 'de', attractionPageStructuredFields);

    expect(localized.imageMetadata[0].alt).toBe('Zweite');
    expect(localized.imageMetadata[1].alt).toBe('Erste');
  });
});
