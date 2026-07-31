import fs from 'node:fs';
import path from 'node:path';
import {
  tourTranslationFields,
  destinationTranslationFields,
  imageMetadataStructuredField,
  destinationStructuredFields,
  attractionPageStructuredFields,
} from '@/lib/i18n/translationFields';
import { localizeStructuredEntries } from '@/lib/i18n/contentLocalization';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

// Every field the client listed as missing from auto-translate.
const CLIENT_REPORTED_TOUR_FIELDS = [
  'difficulty', 'keywords', 'whatToBring', 'whatToWear', 'notSuitableFor', 'needToKnow',
  'accessibilityInfo', 'healthSafety', 'culturalInfo', 'localCustoms', 'physicalRequirements',
  'transportationDetails', 'mealInfo', 'weatherPolicy', 'photoPolicy', 'tipPolicy',
  'seasonalVariations',
];

describe('auto-translate covers every reported field', () => {
  const tourKeys = tourTranslationFields.map((f) => f.key);
  const tourModel = read('lib/models/Tour.ts');
  const localizeTour = read('lib/i18n/localizeTour.ts');

  it.each(CLIENT_REPORTED_TOUR_FIELDS)('translates tour.%s', (key) => {
    expect(tourKeys).toContain(key);
  });

  it.each(CLIENT_REPORTED_TOUR_FIELDS)('stores and reads back tour.%s', (key) => {
    const start = tourModel.indexOf('const TourTranslationSchema');
    const schema = tourModel.slice(start, tourModel.indexOf('const TourSchema', start));
    expect(schema).toContain(`${key}:`);
    expect(localizeTour).toContain(`'${key}'`);
  });

  it('translates per-image alt text and title', () => {
    expect(imageMetadataStructuredField.fields).toEqual(['alt', 'title']);
    expect(localizeTour).toContain('getLocalizedImageMetadata');
  });

  it('translates destination summer and winter temperatures', () => {
    const keys = destinationTranslationFields.map((f) => f.key);
    expect(keys).toContain('summerTemperature');
    expect(keys).toContain('winterTemperature');
  });

  it('translates image metadata, FAQs, and travel tips for destinations and pages', () => {
    for (const specs of [destinationStructuredFields, attractionPageStructuredFields]) {
      expect(specs).toContainEqual(imageMetadataStructuredField);
      expect(specs).toContainEqual({ key: 'faqs', fields: ['question', 'answer'] });
      expect(specs).toContainEqual({ key: 'travelTips', fields: ['title', 'content'] });
    }
  });

  it('includes structured destination/page content in the manual translation stream', () => {
    const streamRoute = read('app/api/admin/translate/stream/route.ts');
    expect(streamRoute).toContain('extractStructuredSpecContent');
    expect(streamRoute).toContain('translateStructuredSpecContentForLocale');
    expect(streamRoute).toContain('destinationStructuredFields');
    expect(streamRoute).toContain('attractionPageStructuredFields');
  });
});

describe('translation never invents policy content', () => {
  it('marks operational and policy fields as never-generate', () => {
    const policyFields = ['weatherPolicy', 'tipPolicy', 'mealInfo', 'photoPolicy',
      'accessibilityInfo', 'healthSafety', 'physicalRequirements', 'notSuitableFor'];
    for (const key of policyFields) {
      const def = tourTranslationFields.find((f) => f.key === key);
      expect(def?.neverGenerate).toBe(true);
    }
  });

  it('excludes never-generate fields from the "generate this" prompt section', () => {
    const source = read('lib/i18n/autoTranslate.ts');
    expect(source).toContain('!fieldsToTranslate[def.key] && !def.neverGenerate');
  });
});

describe('image captions follow their image, not their position', () => {
  it('merges by url so a reordered gallery keeps correct captions', () => {
    const entity = {
      imageMetadata: [
        { url: 'b.jpg', alt: 'Beach' },
        { url: 'a.jpg', alt: 'Pyramid' },
      ],
      translations: {
        ar: {
          // stored in the original (pre-reorder) order
          imageMetadata: [
            { url: 'a.jpg', alt: 'هرم' },
            { url: 'b.jpg', alt: 'شاطئ' },
          ],
        },
      },
    };

    const localized = localizeStructuredEntries(entity, 'ar', [
      { key: 'imageMetadata', fields: ['alt', 'title'], matchKey: 'url' },
    ]) as typeof entity;

    expect(localized.imageMetadata[0]).toMatchObject({ url: 'b.jpg', alt: 'شاطئ' });
    expect(localized.imageMetadata[1]).toMatchObject({ url: 'a.jpg', alt: 'هرم' });
  });

  it('positional merge would have captioned the wrong image', () => {
    const entity = {
      imageMetadata: [{ url: 'b.jpg', alt: 'Beach' }, { url: 'a.jpg', alt: 'Pyramid' }],
      translations: { ar: { imageMetadata: [{ url: 'a.jpg', alt: 'هرم' }, { url: 'b.jpg', alt: 'شاطئ' }] } },
    };

    const positional = localizeStructuredEntries(entity, 'ar', [
      { key: 'imageMetadata', fields: ['alt', 'title'] },
    ]) as typeof entity;

    expect(positional.imageMetadata[0].alt).toBe('هرم');
  });
});
