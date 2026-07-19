import { formatExperienceDescription } from '../experienceDescription';

describe('formatExperienceDescription', () => {
  it('turns a long plain-text description into readable paragraphs', () => {
    const result = formatExperienceDescription(
      'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.'
    );

    expect(result).toBe(
      '<p>First sentence. Second sentence.</p>' +
      '<p>Third sentence. Fourth sentence. Fifth sentence.</p>' +
      '<p>Sixth sentence.</p>'
    );
  });

  it('preserves already structured rich text', () => {
    const html = '<p>Opening paragraph.</p><ul><li>Included item</li></ul>';
    expect(formatExperienceDescription(html)).toBe(html);
  });
});
