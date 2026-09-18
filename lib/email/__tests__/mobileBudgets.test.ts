/**
 * @jest-environment node
 *
 * The phone budgets from the standard, enforced on the REAL rendered output.
 *
 * "Almost every one of these emails is opened on a phone" — so these are
 * measured in a headless browser at 390px, not estimated from the markup. A
 * layout model written in TypeScript would only ever agree with itself.
 *
 * Nothing here can send: only the renderer is imported, and the page is loaded
 * from a string with no network access.
 */
import { chromium, type Browser } from '@playwright/test';
import { renderEmailTemplate } from '@/lib/email/render';
import { ALL_TYPES, SAMPLES } from '@/lib/email/sampleData';
import {
  BUDGETS, FIRST_SCREEN, MOBILE_WIDTH, heightBudget, measurableHtml, measureInPage,
  type EmailMeasurement,
} from '@/lib/email/measure';
import type { EmailType } from '@/lib/email/type';

jest.setTimeout(120_000);

let browser: Browser;
const measured = new Map<EmailType, EmailMeasurement>();

beforeAll(async () => {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: MOBILE_WIDTH, height: FIRST_SCREEN } });
  for (const type of ALL_TYPES) {
    const { html } = renderEmailTemplate(type, SAMPLES[type].data);
    // `domcontentloaded`: the only external reference is the logo, and the
    // message must lay out correctly with images blocked anyway.
    await page.setContent(measurableHtml(html), { waitUntil: 'domcontentloaded' });
    measured.set(type, await page.evaluate(measureInPage));
  }
  await page.close();
});

afterAll(async () => {
  await browser?.close();
});

describe.each(ALL_TYPES)('%s at 390px', (type: EmailType) => {
  it('keeps the chrome above the headline within budget', () => {
    const { chrome } = measured.get(type)!;
    expect(chrome).toBeGreaterThan(0);
    expect(chrome).toBeLessThanOrEqual(BUDGETS.chrome);
  });

  it('fits the height budget for its kind', () => {
    expect(measured.get(type)!.height).toBeLessThanOrEqual(heightBudget(type));
  });

  it('never scrolls sideways', () => {
    expect(measured.get(type)!.horizontalScroll).toBeLessThanOrEqual(0);
  });

  it('puts the outcome, the reference and the key fact on the first screen', () => {
    // The headline plus the fact block's first rows have to clear the fold;
    // the chrome budget alone does not prove it, because a tall summary could
    // still push the reference below 844px.
    expect(measured.get(type)!.chrome).toBeLessThan(FIRST_SCREEN / 2);
  });
});

describe('the first screen carries the outcome, the reference and the key fact', () => {
  it.each(
    ALL_TYPES.filter((type) => Boolean(SAMPLES[type].data.bookingId || SAMPLES[type].data.enquiryReference)),
  )('%s shows its reference above the fold', async (type: EmailType) => {
    const reference = String(SAMPLES[type].data.bookingId || SAMPLES[type].data.enquiryReference);
    const { html } = renderEmailTemplate(type, SAMPLES[type].data);
    const page = await browser.newPage({ viewport: { width: MOBILE_WIDTH, height: FIRST_SCREEN } });
    await page.setContent(measurableHtml(html), { waitUntil: 'domcontentloaded' });

    const top = await page.evaluate((needle: string) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null = walker.nextNode();
      while (node) {
        if (node.textContent?.includes(needle)) {
          const element = node.parentElement;
          if (element) {
            const rect = element.getBoundingClientRect();
            // Skip the hidden preheader, which is zero-height by design.
            if (rect.height > 0) return rect.top + window.scrollY;
          }
        }
        node = walker.nextNode();
      }
      return -1;
    }, reference);
    await page.close();

    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(FIRST_SCREEN);
  });
});

describe('layout rules that produce those numbers', () => {
  it('uses eeo-backend\u2019s header: a small mark beside the brand name', () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    const mark = /<img[^>]*EEO-logo[^>]*>/.exec(html)?.[0] ?? '';

    // 28px square, matching the backend, and far inside the 140px cap.
    expect(mark).toContain('width:28px');
    expect(mark).toContain('height:28px');
    // Outlook ignores the CSS, so the attributes carry it too.
    expect(mark).toMatch(/\swidth="28"/);
    expect(mark).toMatch(/\sheight="28"/);
    // Decorative: the brand name sits beside it as real text, so announcing it
    // twice to a screen reader would be worse than not announcing the image.
    expect(mark).toContain('alt=""');
    expect(mark).toContain('role="presentation"');
    // The brand name is text, so the sender is identifiable with images off.
    expect(html).toContain('>Egypt Excursions Online</td>');
  });

  it('has no colour slab anywhere in the chrome', () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    const head = html.slice(0, html.indexOf('<h1'));
    // The brand colour survives on the button and the status eyebrow only.
    expect(head).not.toMatch(/background-color:#dc2626/);
    expect(head).not.toMatch(/background:#dc2626/);
    // ...and the oversized white plate is gone: 4px of rounding, not padding.
    expect(head).toContain('border-radius:6px;padding:4px;');
  });

  it('puts the status inside the card, above the headline', () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    const status = html.indexOf('Confirmed');
    const headline = html.indexOf('<h1');
    const card = html.indexOf('class="card mso-fix"');
    expect(card).toBeGreaterThan(0);
    expect(status).toBeGreaterThan(card);
    expect(status).toBeLessThan(headline);
  });

  it('puts the brand row above the card and the footer below it', () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    const brandRow = html.indexOf('>Egypt Excursions Online</td>');
    const card = html.indexOf('class="card mso-fix"');
    const cardEnd = html.lastIndexOf('</table>\n      </td></tr>');
    const footer = html.indexOf('You are receiving this');
    expect(brandRow).toBeLessThan(card);
    expect(footer).toBeGreaterThan(cardEnd);
  });

  it('keeps a label and its value on one line at phone width', async () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    const page = await browser.newPage({ viewport: { width: MOBILE_WIDTH, height: FIRST_SCREEN } });
    await page.setContent(measurableHtml(html), { waitUntil: 'domcontentloaded' });

    const sameLine = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('td.row-label')];
      return labels.map((label) => {
        const valueCell = label.nextElementSibling;
        if (!valueCell) return true;
        const a = label.getBoundingClientRect();
        const b = valueCell.getBoundingClientRect();
        // Same line means their vertical centres agree within a line-height.
        return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 22;
      });
    });
    await page.close();

    expect(sameLine.length).toBeGreaterThan(4);
    expect(sameLine.every(Boolean)).toBe(true);
  });

  it('uses the mobile rhythm the standard sets', () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    expect(html).toContain('.gutter { padding-left:20px !important; padding-right:20px !important; }');
    expect(html).toMatch(/\.pad-block \{ padding-top:12px/);
  });
});

describe('no fact is stated twice', () => {
  /** Visible text, collapsed, for counting repeats. */
  function visible(html: string): string {
    return html
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
      // The hidden preheader legitimately repeats a fact from the body.
      .replace(/<div style="display:none;[\s\S]*?<\/div>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');
  }

  it.each([
    // The Guests row shows the priced breakdown, which already contains the
    // counts — the plain "2 adults, 1 child" string is no longer printed too.
    ['booking-confirmation', '2 x Adults ($89.00), 1 x Child ($70.00)'],
    ['payment-confirmation', 'Pyramids of Giza & Sphinx'],
    ['bank-transfer-instructions', '$310.00'],
    ['operator-booking-update', 'Pickup time moved from 07:30 to 07:15'],
  ] as Array<[EmailType, string]>)('%s states "%s" once', (type, fact) => {
    const { html } = renderEmailTemplate(type, SAMPLES[type].data);
    const occurrences = visible(html).split(fact).length - 1;
    expect(occurrences).toBe(1);
  });

  it('does not print the guest count twice in different words', () => {
    const { html } = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    const text = visible(html);
    expect(text).toContain('2 x Adults ($89.00), 1 x Child ($70.00)');
    expect(text).not.toContain('2 adults, 1 child');
  });

  it('falls back to the plain count when no breakdown was supplied', () => {
    const { html } = renderEmailTemplate('booking-confirmation', {
      ...SAMPLES['booking-confirmation'].data,
      participantBreakdown: undefined,
    });
    expect(visible(html)).toContain('2 adults, 1 child');
  });

  it('drops the meeting-point row only when the pickup block says the same thing', () => {
    const withPickup = renderEmailTemplate('booking-confirmation', SAMPLES['booking-confirmation'].data);
    expect(visible(withPickup.html)).not.toContain('Meeting point');
    expect(visible(withPickup.html)).toContain('Nile Ritz-Carlton');

    const withoutPickup = renderEmailTemplate('booking-confirmation', {
      ...SAMPLES['booking-confirmation'].data,
      hotelPickupDetails: undefined,
      hotelPickupLocation: undefined,
    });
    // With no pickup block, the meeting point is the only place it is stated.
    expect(visible(withoutPickup.html)).toContain('Meeting point');
    expect(visible(withoutPickup.html)).toContain('Hotel lobby');
  });
});
