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
});
