/**
 * Golden render tests for every transactional email.
 *
 * The transport is never imported here — these tests render only. Nothing in
 * this file can send mail.
 */
import { renderEmailTemplate } from '@/lib/email/render';
import { contrastRatio, renderEmail, safeUrl, type EmailSpec } from '@/lib/email/layout';
import { ALL_TYPES, SAMPLES } from '../sampleData';
import type { EmailType } from '@/lib/email/type';

/** Text nodes only, so an assertion cannot be satisfied by a style attribute. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
}

function imgTags(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
}

describe.each(ALL_TYPES)('email template: %s', (type: EmailType) => {
  const sample = SAMPLES[type];
  const rendered = renderEmailTemplate(type, sample.data);

  it('produces both an HTML part and a plain-text alternative', () => {
    expect(rendered.html.length).toBeGreaterThan(500);
    expect(rendered.text.length).toBeGreaterThan(100);
    expect(rendered.subject.trim()).not.toBe('');
    // The text part is a real alternative, not a stripped HTML dump.
    expect(rendered.text).not.toMatch(/<[a-z][\s\S]*>/i);
    expect(rendered.text).not.toContain('style=');
  });

  it('carries every required fact in BOTH parts', () => {
    const html = visibleText(rendered.html);
    for (const fact of sample.requiredFacts) {
      expect(html).toContain(fact);
      expect(rendered.text).toContain(fact);
    }
  });

  it('leaves no unresolved template placeholder anywhere', () => {
    for (const part of [rendered.subject, rendered.html, rendered.text]) {
      expect(part).not.toMatch(/\{\{/);
      expect(part).not.toMatch(/\}\}/);
      expect(part).not.toContain('undefined');
      expect(part).not.toContain('[object Object]');
      expect(part).not.toContain('NaN');
    }
  });

  it('uses only absolute https URLs', () => {
    for (const href of hrefs(rendered.html)) {
      if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      expect(href).toMatch(/^https:\/\//);
    }
    // The text part repeats the same URLs and must hold no relative ones.
    for (const url of rendered.text.match(/\bhttps?:\/\/\S+/g) ?? []) {
      expect(url).toMatch(/^https:\/\//);
    }
    expect(rendered.text).not.toMatch(/(^|\s)\/(user|admin|checkout)\//);
  });

  it('meets the rendering rules the standard sets', () => {
    const { html } = rendered;
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain('name="supported-color-schemes"');
    expect(html).toContain('@media (prefers-color-scheme: dark)');
    // Outlook gets a real button, not a bare link.
    expect(html).toContain('<!--[if mso]>');
    expect(html).toMatch(/max-width:600px/);
    expect(html).toContain('@media only screen and (max-width:640px)');
    // Hex only: no oklch/lab, which no mail client understands.
    expect(html).not.toMatch(/oklch\(|lab\(|lch\(/);
    // No external CSS, JS, iframes or webfonts.
    expect(html).not.toMatch(/<script|<iframe|<link\b|@import|\.js"/i);
    // Body copy is 16px or larger; the headline is 24px or larger.
    expect(html).toMatch(/font-size:1[6-9]px|font-size:2\dpx/);
    expect(html).toMatch(/font-size:2[4-9]px/);
  });

  it('hides a preheader that continues, and never repeats, the subject', () => {
    const preheader = /<div style="display:none;font-size:0;[^"]*">([^<]*)<\/div>/.exec(rendered.html);
    expect(preheader).not.toBeNull();
    // Length is measured on the DECODED text: "&amp;" is one character to a
    // reader, five in the markup.
    const text = preheader![1]
      .replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThanOrEqual(90);
    expect(text).not.toBe(rendered.subject.trim());
  });

  it('gives every image real alt text or marks it presentational', () => {
    for (const tag of imgTags(rendered.html)) {
      expect(tag).toMatch(/\balt="/);
      if (/alt=""/.test(tag)) expect(tag).toContain('role="presentation"');
    }
  });

  it('keeps one primary action at a 44px-plus tap target', () => {
    const buttons = rendered.html.match(/class="btn mso-fix"/g) ?? [];
    expect(buttons.length).toBeLessThanOrEqual(1);
    if (buttons.length) {
      const height = /min-height:(\d+)px;line-height:\d+px/.exec(rendered.html);
      expect(Number(height?.[1])).toBeGreaterThanOrEqual(44);
    }
  });

  it('never emits two class attributes on one element', () => {
    // HTML keeps the FIRST `class` and silently drops the second, so a
    // duplicate makes the dark-mode override vanish with no error anywhere.
    const duplicate = /<[a-z]+\b[^>]*\bclass="[^"]*"(?:(?!class=")[^>])*\bclass="/i;
    expect(rendered.html).not.toMatch(duplicate);
  });

  it('applies a dark-mode class to every colour-bearing cell', () => {
    // Each of these selectors is overridden in the dark block; if a cell sets a
    // light TEXT colour inline without one of them, dark mode leaves it
    // unreadable. `background-color` is excluded on purpose: the brand header
    // keeps its own colour in both schemes.
    const coloured = [...rendered.html.matchAll(/<td\b([^>]*(?<!background-)color:#[0-9a-f]{6}[^>]*)>/gi)];
    expect(coloured.length).toBeGreaterThan(0);
    for (const [, attributes] of coloured) {
      // #78350f is the amber warning plate's own ink; that plate deliberately
      // keeps its colours in dark mode, so it needs no override class.
      if (attributes.includes('color:#78350f')) continue;
      expect(attributes).toMatch(/class="[^"]*\b(t-strong|t-muted|t-faint|logo-plate)\b/);
    }
  });

  it('tells the reader why they received it', () => {
    expect(visibleText(rendered.html)).toMatch(/You are receiving this/);
    expect(rendered.text).toMatch(/You are receiving this/);
  });
});

describe('user input is escaped, never injected', () => {
  const HOSTILE = '<script>alert("xss")</script> & "quoted" \'apostrophe\'';

  it('escapes hostile text in every field a customer controls', () => {
    const rendered = renderEmailTemplate('booking-confirmation', {
      ...SAMPLES['booking-confirmation'].data,
      customerName: HOSTILE,
      specialRequests: HOSTILE,
      tourTitle: HOSTILE,
      hotelPickupDetails: HOSTILE,
    });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
    // The text part is not HTML, so it carries the raw characters — and must
    // never carry HTML entities the reader would see literally.
    expect(rendered.text).toContain('<script>');
    expect(rendered.text).not.toContain('&lt;');
  });

  it('refuses a javascript: or data: URL instead of rendering a live link', () => {
    for (const hostile of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
      expect(safeUrl(hostile)).toBeNull();
    }
    const rendered = renderEmailTemplate('welcome', {
      ...SAMPLES.welcome.data,
      dashboardLink: 'javascript:alert(1)',
    });
    expect(rendered.html).not.toContain('javascript:');
    expect(rendered.text).not.toContain('javascript:');
  });

  it('cannot be used to inject CSS through a tenant brand colour', () => {
    const rendered = renderEmailTemplate('welcome', {
      ...SAMPLES.welcome.data,
      primaryColor: 'red;background-image:url(https://tracker.example/pixel.png)',
    });
    expect(rendered.html).not.toContain('tracker.example');
    expect(rendered.html).not.toContain('background-image');
  });
});

describe('money rows are never rendered empty', () => {
  const base = SAMPLES['booking-confirmation'].data;

  /** A label followed by a cell whose only content is whitespace. */
  function labelWithBlankValue(html: string, label: string): boolean {
    const pattern = new RegExp(`>${label}</td>\\s*<td[^>]*>\\s*(?:<span[^>]*>\\s*</span>\\s*)?</td>`);
    return pattern.test(html);
  }

  it('omits the whole payment block when there is no pricing object', () => {
    const rendered = renderEmailTemplate('booking-confirmation', {
      ...base, pricingDetails: undefined, totalPrice: '',
    });
    const text = visibleText(rendered.html);
    expect(text).not.toContain('Subtotal');
    expect(text).not.toContain('Taxes & fees');
    expect(text).not.toContain('Total paid');
  });

  it('omits the block rather than printing a blank total', () => {
    const rendered = renderEmailTemplate('booking-confirmation', {
      ...base,
      totalPrice: '',
      pricingDetails: { subtotal: '$248.00', serviceFee: '', tax: '', discount: '', total: '', currencySymbol: '$' },
    });
    expect(visibleText(rendered.html)).not.toContain('Total paid');
    expect(labelWithBlankValue(rendered.html, 'Subtotal')).toBe(false);
  });

  it('drops only the missing rows when the total is real', () => {
    const rendered = renderEmailTemplate('booking-confirmation', {
      ...base,
      pricingDetails: { subtotal: '$248.00', serviceFee: '', tax: '', discount: '', total: '$248.00', currencySymbol: '$' },
    });
    const text = visibleText(rendered.html);
    expect(text).toContain('Total paid');
    expect(text).toContain('Subtotal');
    expect(text).not.toContain('Service fee');
    expect(text).not.toContain('Taxes & fees');
  });

  it('never prints a currency symbol with no number beside it', () => {
    const rendered = renderEmailTemplate('payment-confirmation', {
      ...SAMPLES['payment-confirmation'].data, amount: '$',
    });
    expect(visibleText(rendered.html)).not.toContain('Amount paid');
  });
});

describe('one authoritative total', () => {
  const base = SAMPLES['booking-confirmation'].data as Record<string, unknown>;

  it('labels exactly one figure "Total paid", and it is the amount charged', () => {
    const rendered = renderEmailTemplate('booking-confirmation', base);
    const html = visibleText(rendered.html);

    const labels = html.match(/Total paid/g) ?? [];
    expect(labels).toHaveLength(1);

    // $244.80 is what the customer was charged. $248.00 is the tour total
    // before the service fee, taxes and the promo — it must not appear under
    // this label anywhere in the email.
    const charged = (base.pricingDetails as { total: string }).total;
    expect(/Total paid\s*\$?244\.80/.test(html.replace(/\s+/g, ' '))).toBe(true);
    expect(charged).toBe('$244.80');
    expect(rendered.text).toContain('Total paid: $244.80');
    expect(rendered.text).not.toMatch(/Total paid: \$248\.00/);
  });

  it('shows the gross tour total nowhere under a "paid" label', () => {
    const rendered = renderEmailTemplate('booking-confirmation', base);
    const paidFigures = [...visibleText(rendered.html).matchAll(/Total paid\s*(\$[\d.,]+)/g)]
      .map((match) => match[1]);
    expect(new Set(paidFigures).size).toBeLessThanOrEqual(1);
  });

  it('still shows one total when there is no pricing breakdown at all', () => {
    const rendered = renderEmailTemplate('booking-confirmation', {
      ...base, pricingDetails: undefined, orderedItems: undefined,
    });
    expect((visibleText(rendered.html).match(/Total paid/g) ?? [])).toHaveLength(1);
    expect(visibleText(rendered.html)).toContain('$248.00');
  });

  it('keeps the line-item panel for a multi-tour cart', () => {
    const rendered = renderEmailTemplate('booking-confirmation', {
      ...base,
      orderedItems: [
        { title: 'Pyramids of Giza', adults: 2, children: 1, infants: 0, totalPrice: '$248.00' },
        { title: 'Nile Dinner Cruise', adults: 2, children: 0, infants: 0, totalPrice: '$118.00' },
      ],
    });
    const html = visibleText(rendered.html);
    expect(html).toContain('Order summary');
    expect(html).toContain('Nile Dinner Cruise');
    // Still only one "Total paid".
    expect((html.match(/Total paid/g) ?? [])).toHaveLength(1);
  });

  it('drops the panel that only restates a single booking', () => {
    const rendered = renderEmailTemplate('booking-confirmation', base);
    expect(visibleText(rendered.html)).not.toContain('Order summary');
  });
});

describe('contrast', () => {
  // Every text/background pair the layout can produce, light and dark.
  // The shipped EEO tokens: ink #0a2540, muted #5b6b7f, border #e6ebf1,
  // page #f6f9fc, primary #dc2626. Every text pair the layout can produce.
  const PAIRS: Array<[string, string, number, string]> = [
    ['#0a2540', '#ffffff', 4.5, 'ink on the light card'],
    ['#0a2540', '#f6f9fc', 4.5, 'ink on a light panel'],
    ['#5b6b7f', '#ffffff', 4.5, 'muted on the light card'],
    ['#5b6b7f', '#f6f9fc', 4.5, 'muted on the page/panel'],
    ['#eef4fa', '#0e2132', 4.5, 'ink on the dark card'],
    ['#c3d0dd', '#0e2132', 4.5, 'muted on the dark card'],
    ['#c3d0dd', '#162c40', 4.5, 'muted on a dark panel'],
    ['#9aabbd', '#0e2132', 4.5, 'footer on the dark card'],
    ['#78350f', '#fef3c7', 4.5, 'warning text on its amber plate'],
    // Status pills are coloured text on a white chip in the brand header.
    ['#047857', '#ffffff', 4.5, 'positive status pill'],
    ['#b45309', '#ffffff', 4.5, 'warning status pill'],
    ['#b91c1c', '#ffffff', 4.5, 'negative status pill'],
    ['#0a2540', '#ffffff', 4.5, 'neutral status pill'],
    ['#ffffff', '#dc2626', 4.5, 'button label on the EEO brand red'],
  ];

  it.each(PAIRS)('%s on %s clears %s:1 (%s)', (fg, bg, minimum) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimum);
  });

  it('darkens a pale brand accent until the button label is readable', () => {
    const spec = makeSpec('#fde047'); // a light yellow brand
    const html = renderEmail(spec).html;
    const fill = /background-color:(#[0-9a-f]{6});border-radius:6px/.exec(html)?.[1];
    expect(fill).toBeDefined();
    expect(contrastRatio('#ffffff', fill!)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('right-to-left', () => {
  const spec = makeSpec('#dc2626', 'rtl');

  it('mirrors the document and isolates Latin values', () => {
    const html = renderEmail(spec).html;
    expect(html).toContain('<html lang="ar" dir="rtl"');
    expect(html).toContain('<body class="page" dir="rtl"');
    expect(html).toContain('align="right"');
    // A reference must not be reordered by the bidi algorithm.
    expect(html).toContain('<span dir="ltr" style="unicode-bidi:isolate;">EEO-10421</span>');
  });

  it('produces the same facts as the LTR rendering', () => {
    expect(renderEmail(spec).text).toContain('EEO-10421');
  });
});

function makeSpec(primaryColor: string, dir: 'ltr' | 'rtl' = 'ltr'): EmailSpec {
  return {
    dir,
    preheader: 'A short line continuing the subject.',
    brand: {
      companyName: 'Egypt Excursions Online',
      primaryColor,
      supportEmail: 'booking@egypt-excursionsonline.com',
      website: 'https://egypt-excursionsonline.com',
    },
    headline: 'Booking confirmed',
    summary: 'Everything is set for your tour.',
    facts: { eyebrow: 'Booking EEO-10421', rows: [{ label: 'Reference', value: 'EEO-10421', ltr: true }] },
    cta: { label: 'View my booking', url: 'https://egypt-excursionsonline.com/user/bookings' },
    footerReason: 'You are receiving this because you booked with us.',
  };
}
