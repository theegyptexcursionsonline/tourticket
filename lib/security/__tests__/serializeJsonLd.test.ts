import { serializeJsonLd } from '../serializeJsonLd';

describe('serializeJsonLd', () => {
  it('prevents a database value from breaking out of the JSON-LD script', () => {
    const serialized = serializeJsonLd({
      title: '</script><script>alert(1)</script>',
      text: 'a&b\u2028c\u2029d',
    });

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).not.toContain('&');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u0026');
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
    expect(JSON.parse(serialized).title).toBe('</script><script>alert(1)</script>');
  });
});
