// lib/email/layout.ts
//
// The single chrome for every transactional email this product sends.
//
// A template supplies an `EmailSpec` — what happened, what the reader must do,
// how to reach a human — and this module renders it to BOTH an HTML part and a
// real plain-text alternative carrying the same facts, the same reference and
// the same URL. Templates never write markup, so the rendering rules below are
// proved once instead of per template:
//
//   * every interpolated value is HTML-escaped here (templates pass plain text)
//   * hex colours only, system font stack, 600px max width, single column
//   * >= 16px body text, >= 24px headline, >= 44px tap targets
//   * dark mode via `color-scheme` + `prefers-color-scheme` overrides
//   * a VML fallback behind every button so Outlook renders a real control
//   * `dir="rtl"` mirrors the layout while Latin values stay LTR-isolated
//
// Brand colour, logo and support identity stay per-brand configurable, exactly
// as they are today — this deployment fulfils payments for white-label sites.

export type EmailDirection = 'ltr' | 'rtl';

export interface EmailBrand {
  companyName: string;
  companyLogo?: string;
  /** Brand accent. Buttons, pills and rules derive from it. */
  primaryColor: string;
  supportEmail: string;
  contactPhone?: string;
  /** Absolute origin of the product this email belongs to. */
  website: string;
  /** Shown in the legal footer. */
  postalAddress?: string;
}

/** A label/value pair. `ltr` keeps a Latin value upright inside an RTL email. */
export interface EmailRow {
  label: string;
  value: string;
  ltr?: boolean;
  /** Render the value in the strong/amount weight. */
  strong?: boolean;
}

export interface EmailFactBlock {
  /** Small caps eyebrow above the facts, e.g. "Booking EEO-10421". */
  eyebrow?: string;
  /** The single most important line, e.g. the tour title. */
  title?: string;
  /** Secondary line under the title, e.g. the selected option. */
  subtitle?: string;
  rows: EmailRow[];
}

export interface EmailTableSection {
  kind: 'table';
  title?: string;
  rows: EmailRow[];
  /** Separated from `rows` by a rule — the totals row. */
  total?: EmailRow;
}

export interface EmailNoteSection {
  kind: 'note';
  title?: string;
  /** Each entry is one paragraph of plain text. */
  body: string[];
  /** Draws the amber "action required" treatment instead of the neutral one. */
  tone?: 'neutral' | 'warning';
}

export interface EmailListSection {
  kind: 'list';
  title?: string;
  items: string[];
}

export interface EmailLineItem {
  title: string;
  /** e.g. "2 adults · 1 child · Private tour". */
  meta?: string;
  amount?: string;
  image?: string;
}

export interface EmailItemsSection {
  kind: 'items';
  title?: string;
  items: EmailLineItem[];
}

export interface EmailImageSection {
  kind: 'image';
  title?: string;
  src: string;
  /** Real alt text, or '' for a purely decorative image. */
  alt: string;
  /** Text shown whether or not the image loads — the message must be complete without it. */
  caption?: string;
  href?: string;
  width?: number;
}

export type EmailSection =
  | EmailTableSection
  | EmailNoteSection
  | EmailListSection
  | EmailItemsSection
  | EmailImageSection;

export interface EmailCta {
  label: string;
  url: string;
}

export interface EmailSpec {
  dir?: EmailDirection;
  /** BCP-47 tag for the recipient's language. */
  lang?: string;
  /** Hidden line continuing the subject. Never a repeat of it. */
  preheader: string;
  brand: EmailBrand;
  /** Pill beside the brand header, e.g. "Confirmed" / "Action required". */
  statusLabel?: string;
  statusTone?: 'positive' | 'warning' | 'negative' | 'neutral';
  /** The outcome, <= 60 characters. */
  headline: string;
  /** One sentence: what this means for the reader. */
  summary: string;
  facts?: EmailFactBlock;
  sections?: EmailSection[];
  /** Exactly one primary action. Never two competing buttons. */
  cta?: EmailCta;
  /** How to reach a human about this message. */
  helpText?: string;
  /** Repeated in the help block so support can match the message to a record. */
  reference?: string;
  /** Why the reader is receiving this. Required by the standard. */
  footerReason: string;
  /** Present only on reminders/digests/marketing — transactional mail is exempt. */
  unsubscribeUrl?: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

/* ------------------------------------------------------------------ */
/* Escaping and URL safety                                             */
/* ------------------------------------------------------------------ */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const SAFE_URL_SCHEMES = ['https:', 'http:', 'mailto:', 'tel:'];

/**
 * Return an absolute, safe URL or `null`.
 *
 * A relative path is resolved against the brand's own origin, and a plain
 * `http:` origin is upgraded to `https:` so a link in an email is never
 * downgraded in transit. Anything carrying another scheme (`javascript:`,
 * `data:`) is dropped — the caller omits the control rather than rendering it,
 * because a dead-but-visible button is worse than no button.
 */
export function safeUrl(raw: string | undefined | null, origin?: string): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  // `cid:` references an inline attachment on this very message, not the web.
  if (value.startsWith('cid:')) return /^cid:[A-Za-z0-9._-]+$/.test(value) ? value : null;

  let parsed: URL;
  try {
    parsed = value.includes(':') ? new URL(value) : new URL(value, normalizeOrigin(origin));
  } catch {
    return null;
  }
  if (!SAFE_URL_SCHEMES.includes(parsed.protocol)) return null;
  if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
    parsed.protocol = 'https:';
  }
  return parsed.toString();
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function normalizeOrigin(website: string | undefined): string {
  const value = String(website ?? '').trim() || 'https://egypt-excursionsonline.com';
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return 'https://egypt-excursionsonline.com';
  }
}

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/**
 * The EEO email palette. Hex only — `oklch()`/`lab()` are not understood by any
 * mail client — and contrast of every text pair is asserted in the test suite.
 *
 * These are the SHIPPED EEO tokens, not a Tailwind scale: the same five values
 * live in the backend's own brand module, so a customer who books in the app
 * and a customer who books on the web receive emails that look like one
 * company. Do not re-derive them from Tailwind classes.
 *
 *   ink #0a2540 · muted #5b6b7f · border #e6ebf1 · page #f6f9fc · primary #dc2626
 *
 * The one deliberate departure is the positive status green: the shipped
 * #0cbd6b was 2.47:1 and unreadable, so it is #047857 (5.48:1) here and in the
 * backend.
 */
const LIGHT = {
  pageBg: '#f6f9fc',
  cardBg: '#ffffff',
  panelBg: '#f6f9fc',
  text: '#0a2540',
  muted: '#5b6b7f',
  // Footer and eyebrow share the muted token rather than inventing a sixth
  // value; at 13px it still clears 4.5:1 on every surface it appears on.
  faint: '#5b6b7f',
  border: '#e6ebf1',
  rule: '#e6ebf1',
} as const;

/**
 * Dark mode has no shipped precedent — the old templates had none at all — so
 * it is built from the same navy the ink token comes from, not from a
 * different colour family.
 */
const DARK = {
  pageBg: '#061320',
  cardBg: '#0e2132',
  panelBg: '#162c40',
  text: '#eef4fa',
  muted: '#c3d0dd',
  faint: '#9aabbd',
  border: '#26405a',
  rule: '#34506c',
} as const;

/** Ink on the amber "action required" plate. Ratio asserted in the tests. */
const WARNING_TEXT = '#78350f';
const WARNING_BG = '#fef3c7';

/** The EEO brand red. The default when a tenant configures no colour. */
const LIGHT_PRIMARY = '#dc2626';

const TONE_FILL: Record<NonNullable<EmailSpec['statusTone']>, string> = {
  positive: '#047857',
  warning: '#b45309',
  negative: '#b91c1c',
  neutral: '#0a2540',
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MAX_WIDTH = 600;
/** Meets the 44px minimum tap target with room to spare. */
const BUTTON_HEIGHT = 48;

function normalizeHex(input: string | undefined, fallback: string): string {
  const value = String(input ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function relativeLuminance(hex: string): number {
  const value = normalizeHex(hex, '#000000').slice(1);
  const channel = (pair: string) => {
    const srgb = parseInt(pair, 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(value.slice(0, 2))
    + 0.7152 * channel(value.slice(2, 4))
    + 0.0722 * channel(value.slice(4, 6));
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a >= b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The label colour that actually reads on `background`.
 *
 * A brand may configure any accent; a light accent with white button text
 * would fail the 4.5:1 requirement, so the button flips to near-black instead
 * of shipping unreadable text.
 */
export function readableOn(background: string): string {
  return contrastRatio('#ffffff', background) >= 4.5 ? '#ffffff' : LIGHT.text;
}

/**
 * Darken a brand accent until white text clears 4.5:1 against it.
 * Brands configure a colour for the web, where large text often passes at
 * 3:1; a button label here is body-sized and must clear the text threshold.
 */
function buttonFill(primary: string): string {
  let hex = normalizeHex(primary, '#dc2626');
  for (let step = 0; step < 24 && contrastRatio('#ffffff', hex) < 4.5; step += 1) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    hex = `#${[r, g, b]
      .map((c) => Math.max(0, Math.round(c * 0.9)).toString(16).padStart(2, '0'))
      .join('')}`;
  }
  return hex;
}

/* ------------------------------------------------------------------ */
/* Bidi helpers                                                        */
/* ------------------------------------------------------------------ */

const isRtl = (dir: EmailDirection) => dir === 'rtl';
const startAlign = (dir: EmailDirection) => (isRtl(dir) ? 'right' : 'left');
const endAlign = (dir: EmailDirection) => (isRtl(dir) ? 'left' : 'right');

/** Keep a reference, amount, e-mail or URL upright inside an RTL paragraph. */
function ltrIsolate(escaped: string): string {
  return `<span dir="ltr" style="unicode-bidi:isolate;">${escaped}</span>`;
}

function value(row: { value: string; ltr?: boolean }): string {
  const escaped = escapeHtml(row.value);
  return row.ltr ? ltrIsolate(escaped) : escaped;
}

/* ------------------------------------------------------------------ */
/* HTML rendering                                                      */
/* ------------------------------------------------------------------ */

/**
 * The standard caps the preview line at 90 characters. Enforcing it here rather
 * than in each template means no content template can ship a preheader that a
 * mail client would cut mid-word anyway — we choose the cut, at a word boundary.
 */
export function clampPreheader(value: string, limit = 90): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).replace(/[\s.,;:\u2014-]+$/, '')}\u2026`;
}

function head(spec: EmailSpec): string {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(spec.headline)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; width:100% !important; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { color:${normalizeHex(spec.brand.primaryColor, LIGHT_PRIMARY)}; }
  /* Outlook resets — no border-radius dependence, no meaning in background images. */
  .mso-fix { mso-line-height-rule:exactly; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  @media only screen and (max-width:640px) {
    .container { width:100% !important; max-width:100% !important; }
    .gutter { padding-left:24px !important; padding-right:24px !important; }
    .stack { display:block !important; width:100% !important; max-width:100% !important; }
    .stack-end { text-align:${startAlign(spec.dir ?? 'ltr')} !important; padding-top:4px !important; }
    .btn { width:100% !important; }
    .thumb { display:none !important; }
  }
  @media (prefers-color-scheme: dark) {
    body, .page { background-color:${DARK.pageBg} !important; }
    .card { background-color:${DARK.cardBg} !important; border-color:${DARK.border} !important; }
    .panel { background-color:${DARK.panelBg} !important; border-color:${DARK.border} !important; }
    .t-strong, .t-strong a { color:${DARK.text} !important; }
    .t-muted { color:${DARK.muted} !important; }
    .t-faint { color:${DARK.faint} !important; }
    .rule { border-color:${DARK.rule} !important; background-color:${DARK.rule} !important; }
    .logo-plate { background-color:#ffffff !important; }
  }
</style>
</head>`;
}

function brandHeader(spec: EmailSpec, dir: EmailDirection): string {
  const { brand } = spec;
  const logo = safeUrl(brand.companyLogo, brand.website);
  // A logo built for a light page disappears on a dark one, so it always sits
  // on its own white plate rather than relying on the client to invert it.
  const logoCell = logo
    // The plate is sized to the logo (160px + 24px of padding) so it hugs the
    // mark instead of stretching across the header as a white slab.
    ? `<td width="184" style="width:184px;" align="${startAlign(dir)}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="logo-plate" style="background-color:#ffffff;border-radius:6px;padding:8px 12px;">
              <img src="${escapeHtml(logo)}" width="160" alt="${escapeHtml(brand.companyName)}" style="display:block;width:160px;max-width:160px;height:auto;">
            </td>
          </tr></table>
        </td>`
    : `<td align="${startAlign(dir)}" style="font-family:${FONT};font-size:20px;line-height:28px;font-weight:700;color:#ffffff;">${escapeHtml(brand.companyName)}</td>`;

  const tone = TONE_FILL[spec.statusTone ?? 'neutral'];
  const pill = spec.statusLabel
    ? `<td align="${endAlign(dir)}" style="padding-${startAlign(dir)}:12px;">
          <span style="display:inline-block;background-color:#ffffff;color:${escapeHtml(tone)};font-family:${FONT};font-size:13px;line-height:18px;font-weight:700;padding:6px 12px;border-radius:4px;">${escapeHtml(spec.statusLabel)}</span>
        </td>`
    : '';

  return `<tr>
    <td class="gutter" style="background-color:${escapeHtml(normalizeHex(brand.primaryColor, LIGHT_PRIMARY))};padding:24px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">
        <tr>${logoCell}${pill}</tr>
      </table>
    </td>
  </tr>`;
}

function factBlock(facts: EmailFactBlock, dir: EmailDirection): string {
  const eyebrow = facts.eyebrow
    ? `<tr><td align="${startAlign(dir)}" style="font-family:${FONT};font-size:13px;line-height:18px;letter-spacing:0.06em;text-transform:uppercase;color:${LIGHT.faint};padding-bottom:6px;" class="t-faint">${ltrIsolate(escapeHtml(facts.eyebrow))}</td></tr>`
    : '';
  const title = facts.title
    ? `<tr><td align="${startAlign(dir)}" style="font-family:${FONT};font-size:20px;line-height:28px;font-weight:700;color:${LIGHT.text};" class="t-strong">${escapeHtml(facts.title)}</td></tr>`
    : '';
  const subtitle = facts.subtitle
    ? `<tr><td align="${startAlign(dir)}" style="font-family:${FONT};font-size:16px;line-height:24px;color:${LIGHT.muted};padding-top:4px;" class="t-muted">${escapeHtml(facts.subtitle)}</td></tr>`
    : '';
  const rows = facts.rows.map((row) => `
        <tr>
          <td class="stack t-muted" align="${startAlign(dir)}" width="40%" style="font-family:${FONT};font-size:16px;line-height:24px;color:${LIGHT.muted};padding:8px 0;">${escapeHtml(row.label)}</td>
          <td class="stack stack-end t-strong" align="${endAlign(dir)}" style="font-family:${FONT};font-size:16px;line-height:24px;font-weight:600;color:${LIGHT.text};padding:8px 0;">${value(row)}</td>
        </tr>`).join('');

  return `<tr>
    <td class="gutter" style="padding:0 32px 8px 32px;">
      <table role="presentation" class="panel mso-fix" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="background-color:${LIGHT.panelBg};border:1px solid ${LIGHT.border};border-radius:8px;">
        <tr><td style="padding:20px 20px 16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">
            ${eyebrow}${title}${subtitle}
          </table>
          ${facts.rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="padding-top:8px;">${rows}</table>` : ''}
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function tableSection(section: EmailTableSection, dir: EmailDirection): string {
  const heading = section.title ? sectionHeading(section.title, dir) : '';
  const rows = section.rows.map((row) => `
      <tr>
        <td class="stack t-muted" align="${startAlign(dir)}" width="45%" style="font-family:${FONT};font-size:16px;line-height:24px;color:${LIGHT.muted};padding:7px 0;">${escapeHtml(row.label)}</td>
        <td class="stack stack-end t-strong" align="${endAlign(dir)}" style="font-family:${FONT};font-size:16px;line-height:24px;color:${LIGHT.text};${row.strong ? 'font-weight:600;' : ''}padding:7px 0;">${value(row)}</td>
      </tr>`).join('');
  const total = section.total ? `
      <tr><td colspan="2" style="padding:6px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="rule" style="height:1px;line-height:1px;font-size:0;background-color:${LIGHT.rule};border-top:1px solid ${LIGHT.rule};">&nbsp;</td></tr></table></td></tr>
      <tr>
        <td class="stack t-strong" align="${startAlign(dir)}" style="font-family:${FONT};font-size:17px;line-height:26px;font-weight:700;color:${LIGHT.text};padding:7px 0;">${escapeHtml(section.total.label)}</td>
        <td class="stack stack-end t-strong" align="${endAlign(dir)}" style="font-family:${FONT};font-size:17px;line-height:26px;font-weight:700;color:${LIGHT.text};padding:7px 0;">${value(section.total)}</td>
      </tr>` : '';

  return `<tr><td class="gutter" style="padding:8px 32px;">
    ${heading}
    <table role="presentation" class="mso-fix" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">${rows}${total}</table>
  </td></tr>`;
}

function sectionHeading(title: string, dir: EmailDirection): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>
      <td align="${startAlign(dir)}" style="font-family:${FONT};font-size:13px;line-height:18px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;color:${LIGHT.faint};padding-bottom:6px;" class="t-faint">${escapeHtml(title)}</td>
    </tr></table>`;
}

function noteSection(section: EmailNoteSection, dir: EmailDirection): string {
  const warning = section.tone === 'warning';
  const bg = warning ? WARNING_BG : LIGHT.panelBg;
  const border = warning ? '#f59e0b' : LIGHT.border;
  const title = section.title
    // The warning plate keeps its amber colours in both schemes, so its title
    // takes the plate's own dark-amber ink and no dark-mode class.
    ? `<tr><td align="${startAlign(dir)}" class="${warning ? '' : 't-strong'}" style="font-family:${FONT};font-size:16px;line-height:24px;font-weight:700;color:${warning ? WARNING_TEXT : LIGHT.text};padding-bottom:6px;">${escapeHtml(section.title)}</td></tr>`
    : '';
  const body = section.body.map((paragraph) => `
      <tr><td align="${startAlign(dir)}" style="font-family:${FONT};font-size:16px;line-height:24px;color:${warning ? WARNING_TEXT : LIGHT.muted};padding:3px 0;" class="${warning ? '' : 't-muted'}">${escapeHtml(paragraph)}</td></tr>`).join('');

  // A warning keeps its amber plate in dark mode on purpose: the dark override
  // classes are omitted so "action required" never loses its urgency.
  return `<tr><td class="gutter" style="padding:8px 32px;">
    <table role="presentation" class="${warning ? 'mso-fix' : 'panel mso-fix'}" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="background-color:${bg};border:1px solid ${border};border-radius:8px;">
      <tr><td style="padding:16px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">${title}${body}</table>
      </td></tr>
    </table>
  </td></tr>`;
}

function listSection(section: EmailListSection, dir: EmailDirection): string {
  const heading = section.title ? sectionHeading(section.title, dir) : '';
  const items = section.items.map((item) => `
      <tr>
        <td width="20" valign="top" align="${startAlign(dir)}" style="font-family:${FONT};font-size:16px;line-height:24px;color:${LIGHT.muted};padding:4px 0;" class="t-muted">&bull;</td>
        <td align="${startAlign(dir)}" style="font-family:${FONT};font-size:16px;line-height:24px;color:${LIGHT.text};padding:4px 0;" class="t-strong">${escapeHtml(item)}</td>
      </tr>`).join('');
  return `<tr><td class="gutter" style="padding:8px 32px;">
    ${heading}
    <table role="presentation" class="mso-fix" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">${items}</table>
  </td></tr>`;
}

function itemsSection(section: EmailItemsSection, dir: EmailDirection, brand: EmailBrand): string {
  const heading = section.title ? sectionHeading(section.title, dir) : '';
  const rows = section.items.map((item) => {
    const image = safeUrl(item.image, brand.website);
    // Decorative: the title and meta below carry the whole meaning, so the
    // thumbnail is alt="" and hidden entirely on a phone.
    const thumb = image
      ? `<td class="thumb" width="56" valign="top" style="padding-${endAlign(dir)}:12px;"><img src="${escapeHtml(image)}" width="56" height="56" alt="" role="presentation" style="display:block;width:56px;height:56px;border-radius:6px;object-fit:cover;"></td>`
      : '';
    const amount = item.amount
      ? `<td class="stack stack-end t-strong" align="${endAlign(dir)}" valign="top" style="font-family:${FONT};font-size:16px;line-height:24px;font-weight:600;color:${LIGHT.text};">${ltrIsolate(escapeHtml(item.amount))}</td>`
      : '';
    const meta = item.meta
      ? `<div style="font-family:${FONT};font-size:14px;line-height:22px;color:${LIGHT.muted};padding-top:2px;" class="t-muted">${escapeHtml(item.meta)}</div>`
      : '';
    return `<tr><td style="padding:10px 0;border-bottom:1px solid ${LIGHT.border};" class="rule">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>
          ${thumb}
          <td class="stack t-strong" align="${startAlign(dir)}" valign="top" style="font-family:${FONT};font-size:16px;line-height:24px;font-weight:600;color:${LIGHT.text};">${escapeHtml(item.title)}${meta}</td>
          ${amount}
        </tr></table>
      </td></tr>`;
  }).join('');

  return `<tr><td class="gutter" style="padding:8px 32px;">
    ${heading}
    <table role="presentation" class="mso-fix" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">${rows}</table>
  </td></tr>`;
}

function imageSection(section: EmailImageSection, dir: EmailDirection, brand: EmailBrand): string {
  const src = safeUrl(section.src, brand.website);
  const heading = section.title ? sectionHeading(section.title, dir) : '';
  const width = section.width ?? 200;
  // Images are decoration: when `src` is unusable or blocked, the caption still
  // carries the fact, so the message is complete with images off.
  const picture = src
    ? (() => {
      const tag = `<img src="${escapeHtml(src)}" width="${width}" alt="${escapeHtml(section.alt)}"${section.alt ? '' : ' role="presentation"'} style="display:block;width:${width}px;max-width:100%;height:auto;border-radius:8px;">`;
      const href = safeUrl(section.href, brand.website);
      return href ? `<a href="${escapeHtml(href)}" style="text-decoration:none;">${tag}</a>` : tag;
    })()
    : '';
  const caption = section.caption
    ? `<div style="font-family:${FONT};font-size:14px;line-height:22px;color:${LIGHT.muted};padding-top:8px;" class="t-muted">${escapeHtml(section.caption)}</div>`
    : '';
  return `<tr><td class="gutter" align="${startAlign(dir)}" style="padding:8px 32px;">
    ${heading}${picture}${caption}
  </td></tr>`;
}

/**
 * One bulletproof button, >= 44px tall, plus the same URL as selectable text
 * underneath for the clients that strip buttons entirely.
 */
function ctaBlock(cta: EmailCta, dir: EmailDirection, brand: EmailBrand): string {
  const href = safeUrl(cta.url, brand.website);
  if (!href) return '';
  const fill = buttonFill(brand.primaryColor);
  const label = readableOn(fill);
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(cta.label);

  return `<tr><td class="gutter" align="${startAlign(dir)}" style="padding:20px 32px 8px 32px;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:${BUTTON_HEIGHT}px;v-text-anchor:middle;width:280px;" arcsize="12%" stroke="f" fillcolor="${fill}">
      <w:anchorlock/>
      <center style="color:${label};font-family:${FONT};font-size:16px;font-weight:700;">${safeLabel}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-- -->
    <table role="presentation" class="btn mso-fix" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>
      <td align="center" style="background-color:${fill};border-radius:6px;">
        <a href="${safeHref}" style="display:block;min-height:${BUTTON_HEIGHT}px;line-height:${BUTTON_HEIGHT}px;padding:0 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${label};text-decoration:none;">${safeLabel}</a>
      </td>
    </tr></table>
    <!--<![endif]-->
    <div style="font-family:${FONT};font-size:14px;line-height:22px;color:${LIGHT.muted};padding-top:12px;" class="t-muted">
      Button not working? Copy this link:<br>${ltrIsolate(`<a href="${safeHref}" style="color:${LIGHT.muted};">${safeHref}</a>`)}
    </div>
  </td></tr>`;
}

function helpBlock(spec: EmailSpec, dir: EmailDirection): string {
  const { brand } = spec;
  const mail = safeUrl(`mailto:${brand.supportEmail}`);
  const lines: string[] = [];
  if (spec.helpText) lines.push(escapeHtml(spec.helpText));
  const contacts: string[] = [];
  if (mail) contacts.push(ltrIsolate(`<a href="${escapeHtml(mail)}" style="color:${LIGHT.text};font-weight:600;" class="t-strong">${escapeHtml(brand.supportEmail)}</a>`));
  if (brand.contactPhone) contacts.push(ltrIsolate(escapeHtml(brand.contactPhone)));
  if (contacts.length) lines.push(`Contact us: ${contacts.join(' &middot; ')}`);
  if (spec.reference) lines.push(`Your reference: ${ltrIsolate(escapeHtml(spec.reference))}`);
  if (!lines.length) return '';

  return `<tr><td class="gutter" style="padding:16px 32px 8px 32px;">
    <table role="presentation" class="panel mso-fix" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="background-color:${LIGHT.panelBg};border:1px solid ${LIGHT.border};border-radius:8px;">
      <tr><td align="${startAlign(dir)}" style="padding:16px 18px;font-family:${FONT};font-size:15px;line-height:24px;color:${LIGHT.muted};" class="t-muted">
        ${lines.join('<br>')}
      </td></tr>
    </table>
  </td></tr>`;
}

function footer(spec: EmailSpec, dir: EmailDirection): string {
  const { brand } = spec;
  const parts = [
    escapeHtml(`© ${new Date().getFullYear()} ${brand.companyName}. All rights reserved.`),
  ];
  if (brand.postalAddress) parts.push(escapeHtml(brand.postalAddress));
  parts.push(escapeHtml(spec.footerReason));
  const unsubscribe = safeUrl(spec.unsubscribeUrl, brand.website);
  if (unsubscribe) {
    parts.push(`<a href="${escapeHtml(unsubscribe)}" style="color:${LIGHT.faint};text-decoration:underline;" class="t-faint">Unsubscribe from these emails</a>`);
  }

  return `<tr><td class="gutter t-faint" align="${startAlign(dir)}" style="padding:8px 32px 28px 32px;font-family:${FONT};font-size:13px;line-height:20px;color:${LIGHT.faint};">
    ${parts.join('<br>')}
  </td></tr>`;
}

function renderSection(section: EmailSection, dir: EmailDirection, brand: EmailBrand): string {
  switch (section.kind) {
    case 'table': return tableSection(section, dir);
    case 'note': return noteSection(section, dir);
    case 'list': return listSection(section, dir);
    case 'items': return itemsSection(section, dir, brand);
    case 'image': return imageSection(section, dir, brand);
  }
}

export function renderHtml(spec: EmailSpec): string {
  const dir: EmailDirection = spec.dir ?? 'ltr';
  const lang = spec.lang ?? (isRtl(dir) ? 'ar' : 'en');
  const sections = (spec.sections ?? []).map((section) => renderSection(section, dir, spec.brand)).join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" dir="${dir}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
${head(spec)}
<body class="page" dir="${dir}" style="margin:0;padding:0;background-color:${LIGHT.pageBg};color:${LIGHT.text};">
<div style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(clampPreheader(spec.preheader))}</div>
<div style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;&#8203;&#847;&nbsp;</div>
<table role="presentation" class="page mso-fix" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${LIGHT.pageBg};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" class="container card mso-fix" width="${MAX_WIDTH}" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:${MAX_WIDTH}px;max-width:${MAX_WIDTH}px;background-color:${LIGHT.cardBg};border:1px solid ${LIGHT.border};border-radius:12px;overflow:hidden;">
      ${brandHeader(spec, dir)}
      <tr><td class="gutter" align="${startAlign(dir)}" style="padding:28px 32px 4px 32px;">
        <h1 style="margin:0;font-family:${FONT};font-size:26px;line-height:34px;font-weight:700;color:${LIGHT.text};" class="t-strong">${escapeHtml(spec.headline)}</h1>
      </td></tr>
      <tr><td class="gutter t-muted" align="${startAlign(dir)}" style="padding:10px 32px 16px 32px;font-family:${FONT};font-size:16px;line-height:26px;color:${LIGHT.muted};">${escapeHtml(spec.summary)}</td></tr>
      ${spec.facts ? factBlock(spec.facts, dir) : ''}
      ${sections}
      ${spec.cta ? ctaBlock(spec.cta, dir, spec.brand) : ''}
      ${helpBlock(spec, dir)}
      <tr><td class="gutter" style="padding:8px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="rule" style="height:1px;line-height:1px;font-size:0;background-color:${LIGHT.border};">&nbsp;</td></tr></table></td></tr>
      ${footer(spec, dir)}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Plain-text rendering                                                */
/* ------------------------------------------------------------------ */

/**
 * A real alternative, not a stripped HTML dump: the same facts, the same
 * reference and the same URL, in the order a person reads them.
 */
export function renderText(spec: EmailSpec): string {
  const out: string[] = [];
  const push = (line = '') => out.push(line);

  push(spec.brand.companyName.toUpperCase());
  push();
  push(spec.headline);
  push('='.repeat(Math.min(spec.headline.length, 60)));
  push();
  push(spec.summary);

  if (spec.facts) {
    push();
    if (spec.facts.eyebrow) push(spec.facts.eyebrow);
    if (spec.facts.title) push(spec.facts.title);
    if (spec.facts.subtitle) push(spec.facts.subtitle);
    for (const row of spec.facts.rows) push(`${row.label}: ${row.value}`);
  }

  for (const section of spec.sections ?? []) {
    push();
    switch (section.kind) {
      case 'table':
        if (section.title) push(`-- ${section.title} --`);
        for (const row of section.rows) push(`${row.label}: ${row.value}`);
        if (section.total) push(`${section.total.label}: ${section.total.value}`);
        break;
      case 'note':
        if (section.title) push(`-- ${section.title} --`);
        for (const paragraph of section.body) push(paragraph);
        break;
      case 'list':
        if (section.title) push(`-- ${section.title} --`);
        for (const item of section.items) push(`* ${item}`);
        break;
      case 'items':
        if (section.title) push(`-- ${section.title} --`);
        for (const item of section.items) {
          push(`* ${item.title}${item.amount ? ` — ${item.amount}` : ''}`);
          if (item.meta) push(`  ${item.meta}`);
        }
        break;
      case 'image': {
        if (section.title) push(`-- ${section.title} --`);
        if (section.caption) push(section.caption);
        // A `cid:` attachment cannot be opened from a text part; the caption
        // and the CTA below already carry the same information.
        const href = safeUrl(section.href, spec.brand.website);
        if (href && !href.startsWith('cid:')) push(href);
        break;
      }
    }
  }

  const ctaHref = spec.cta ? safeUrl(spec.cta.url, spec.brand.website) : null;
  if (spec.cta && ctaHref) {
    push();
    push(`${spec.cta.label}: ${ctaHref}`);
  }

  push();
  if (spec.helpText) push(spec.helpText);
  const contacts = [spec.brand.supportEmail, spec.brand.contactPhone].filter(Boolean);
  if (contacts.length) push(`Contact us: ${contacts.join(' | ')}`);
  if (spec.reference) push(`Your reference: ${spec.reference}`);

  push();
  push('---');
  push(`© ${new Date().getFullYear()} ${spec.brand.companyName}. All rights reserved.`);
  if (spec.brand.postalAddress) push(spec.brand.postalAddress);
  push(spec.footerReason);
  const unsubscribe = safeUrl(spec.unsubscribeUrl, spec.brand.website);
  if (unsubscribe) push(`Unsubscribe: ${unsubscribe}`);

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function renderEmail(spec: EmailSpec): RenderedEmail {
  return { html: renderHtml(spec), text: renderText(spec) };
}
