import {
  isBoundedString,
  isBoundedStringArray,
  isPlainRecord,
  isSafeHttpsUrl,
  isTranslationEnvelope,
} from '@/lib/content/receiverPayloadValidation';

describe('content receiver payload validation', () => {
  it('accepts only bounded, nonblank strings and arrays', () => {
    expect(isBoundedString(' Cairo ', 2, 20)).toBe(true);
    expect(isBoundedString('   ', 1, 20)).toBe(false);
    expect(isBoundedString('x'.repeat(21), 1, 20)).toBe(false);
    expect(isBoundedStringArray(['one', 'two'], 2, 3, 2, 10)).toBe(true);
    expect(isBoundedStringArray(['one', ''], 2, 3, 2, 10)).toBe(false);
    expect(isBoundedStringArray(['one'], 2, 3, 2, 10)).toBe(false);
  });

  it('allows only credential-free HTTPS URLs', () => {
    expect(isSafeHttpsUrl('https://res.cloudinary.com/dm3sxllch/image/upload/example.jpg')).toBe(true);
    expect(isSafeHttpsUrl('http://res.cloudinary.com/dm3sxllch/image/upload/example.jpg')).toBe(false);
    expect(isSafeHttpsUrl('https://res.cloudinary.com/another-account/image/upload/example.jpg')).toBe(false);
    expect(isSafeHttpsUrl('https://127.0.0.1/image.jpg')).toBe(false);
    expect(isSafeHttpsUrl('https://user:secret@res.cloudinary.com/dm3sxllch/image.jpg')).toBe(false);
    expect(isSafeHttpsUrl('data:image/png;base64,AAAA')).toBe(false);
  });

  it('requires a small object map of object translation buckets', () => {
    expect(isPlainRecord({})).toBe(true);
    expect(isPlainRecord([])).toBe(false);
    expect(isTranslationEnvelope(undefined)).toBe(true);
    expect(isTranslationEnvelope({ de: { name: 'Kairo' } })).toBe(true);
    expect(isTranslationEnvelope({ de: 'Kairo' })).toBe(false);
    expect(isTranslationEnvelope([])).toBe(false);
    expect(isTranslationEnvelope(Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`l${i}`, {}])))).toBe(false);
  });
});
