/** @jest-environment node */
import Handlebars from 'handlebars';
import { TemplateEngine } from '../templateEngine';
import { SUBJECTS } from '../render';

// Rendering is transport-free: no Mailgun import or delivery is exercised.
describe('email subject compiler compatibility and security', () => {
  it.each(Object.entries(SUBJECTS))('renders the fixed %s subject', (_type, subject) => {
    const data = {
      tourTitle: 'Cairo & Giza', companyName: 'Travel Team',
      enquiryReference: 'QA-REF', action: 'updated', bookingId: 'QA-BOOKING',
    };
    const expected = subject.replace(/{{(\w+)}}/g, (_match, key: string) => data[key as keyof typeof data]);
    expect(TemplateEngine.generateSubject(subject, data)).toBe(expected);
  });

  it('keeps untrusted values as data rather than compiling another template', () => {
    const value = '{{lookup constructor "prototype"}} <script>text only</script>';
    expect(TemplateEngine.generateSubject('Booking: {{tourTitle}}', { tourTitle: value }))
      .toBe(`Booking: ${value}`);
  });

  it('preserves escaped HTML in the generic renderer and plain-text subject decoding', () => {
    const data = { name: 'Cairo & "Giza" <tour> \'day\'' };
    expect(TemplateEngine.replaceVariables('{{name}}', data))
      .toBe('Cairo &amp; &quot;Giza&quot; &lt;tour&gt; &#x27;day&#x27;');
    expect(TemplateEngine.generateSubject('{{name}}', data)).toBe(data.name);
  });

  it('preserves helper conditionals and Unicode subject values', () => {
    expect(TemplateEngine.generateSubject('{{#if (or active (gt guests 1))}}{{#if (eq locale "ar")}}{{title}}{{/if}}{{/if}}', {
      active: false, guests: 2, locale: 'ar', title: 'رحلة النيل 🛳️',
    })).toBe('رحلة النيل 🛳️');
  });

  it('rejects malformed AST metadata rather than treating it as generated code', () => {
    const ast = Handlebars.parse('{{#if true}}body{{/if}}');
    const block = ast.body[0] as unknown as { program: { blockParams: unknown } };
    block.program.blockParams = { length: '1 + 1' };
    expect(() => TemplateEngine.replaceVariables(ast as unknown as string, {})).toThrow();
  });

  it('does not expose prototype constructors through the default renderer', () => {
    expect(TemplateEngine.replaceVariables('{{lookup value "constructor"}}', { value: {} })).toBe('');
  });
});
