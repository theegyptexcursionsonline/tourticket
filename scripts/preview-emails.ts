/**
 * Render every transactional email with realistic sample data to
 * `readiness-proof/<date>/email-previews/` (gitignored) for visual review.
 *
 * This script CANNOT send: it imports the renderer only, never the transport.
 *
 *   pnpm tsx scripts/preview-emails.ts [--date 2026-09-18]
 *
 * Each template is written four ways — LTR at 600px and at 390px, plus a dark
 * and an RTL variant — so a reviewer can screenshot the matrix the standard
 * asks for without hand-editing anything.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderEmailTemplate } from '../lib/email/render';
import { renderEmail } from '../lib/email/layout';
import { defaultBrandData } from '../lib/email/render';
import { buildSpec } from '../lib/email/templates';
import { ALL_TYPES, SAMPLES } from '../lib/email/sampleData';
import type { EmailType } from '../lib/email/type';

type Variant = 'light' | 'dark' | 'mobile' | 'rtl';

const VARIANTS: Array<{ id: Variant; label: string; width: number; note: string }> = [
  { id: 'light', label: 'Light · 600px', width: 600, note: 'Desktop width, light scheme.' },
  { id: 'dark', label: 'Dark · 600px', width: 600, note: 'Forced dark preview of the prefers-color-scheme rules.' },
  { id: 'mobile', label: 'Light · 390px', width: 390, note: 'Phone width — single column, full-width button.' },
  { id: 'rtl', label: 'RTL (ar) · 600px', width: 600, note: 'Mirrored layout with Latin values LTR-isolated.' },
];

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/**
 * Force the dark palette for a screenshot.
 *
 * A headless screenshot cannot always be told to emulate `prefers-color-scheme`,
 * so the preview promotes the very same media-query block to an always-on rule.
 * The rules are not rewritten — only the condition around them — so what is
 * captured is exactly what a dark-mode client applies.
 */
function forceDark(html: string): string {
  const match = /@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n  \}/.exec(html);
  if (!match) return html;
  return html.replace('</style>', `${match[1]}\n</style>`);
}

function renderVariant(type: EmailType, variant: Variant): { html: string; text: string; subject: string } {
  if (variant !== 'rtl') {
    const rendered = renderEmailTemplate(type, SAMPLES[type].data);
    return variant === 'dark' ? { ...rendered, html: forceDark(rendered.html) } : rendered;
  }
  // RTL exercises the layout's mirroring with the same English content: the
  // product's Arabic copy is a separate piece of work, and inventing it here
  // would put words in the brand's mouth.
  const data = { ...defaultBrandData('https://egypt-excursionsonline.com'), ...SAMPLES[type].data };
  const spec = { ...buildSpec(type, data as never), dir: 'rtl' as const, lang: 'ar' };
  const { html, text } = renderEmail(spec);
  return { html, text, subject: renderEmailTemplate(type, SAMPLES[type].data).subject };
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function main() {
  const date = argValue('--date') || new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), 'readiness-proof', date, 'email-previews');
  await fs.mkdir(outDir, { recursive: true });

  const index: Array<{ type: EmailType; subject: string; files: Array<{ variant: Variant; file: string; width: number }> }> = [];

  for (const type of ALL_TYPES) {
    const entry = { type, subject: '', files: [] as Array<{ variant: Variant; file: string; width: number }> };
    for (const variant of VARIANTS) {
      const rendered = renderVariant(type, variant.id);
      entry.subject = rendered.subject;
      const file = `${type}.${variant.id}.html`;
      await fs.writeFile(path.join(outDir, file), rendered.html, 'utf8');
      entry.files.push({ variant: variant.id, file, width: variant.width });
    }
    // The plain-text alternative is part of the deliverable, so it is reviewable.
    await fs.writeFile(
      path.join(outDir, `${type}.txt`),
      `SUBJECT: ${entry.subject}\n\n${renderVariant(type, 'light').text}\n`,
      'utf8',
    );
    index.push(entry);
    console.log(`rendered ${type} (${VARIANTS.length} variants + text)`);
  }

  const rows = index.map((entry) => `
    <section>
      <h2>${escape(entry.type)}</h2>
      <p class="subject">Subject: ${escape(entry.subject)}</p>
      <ul>
        ${entry.files.map((file) => {
          const variant = VARIANTS.find((candidate) => candidate.id === file.variant)!;
          return `<li><a href="${file.file}" target="_blank" rel="noreferrer">${escape(variant.label)}</a> <span>${escape(variant.note)}</span></li>`;
        }).join('\n        ')}
        <li><a href="${entry.type}.txt" target="_blank" rel="noreferrer">Plain-text alternative</a> <span>The text part carrying the same facts.</span></li>
      </ul>
    </section>`).join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EEO email previews — ${escape(date)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         margin: 0; padding: 32px 24px; background: #f1f5f9; color: #0f172a; line-height: 1.5; }
  main { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .meta { color: #475569; margin: 0 0 28px; }
  section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 14px; }
  h2 { font-size: 18px; margin: 0 0 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .subject { color: #475569; margin: 0 0 10px; font-size: 14px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin: 3px 0; }
  a { color: #b91c1c; font-weight: 600; }
  li span { color: #64748b; font-size: 13px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0b1120; color: #f1f5f9; }
    section { background: #111827; border-color: #334155; }
    .meta, .subject { color: #cbd5e1; }
    li span { color: #94a3b8; }
    a { color: #fca5a5; }
  }
</style>
</head>
<body>
<main>
  <h1>EEO email previews</h1>
  <p class="meta">${index.length} templates rendered ${escape(date)} with sample data. Screenshot each at 600px and 390px, light and dark, plus the RTL capture.</p>
  ${rows}
</main>
</body>
</html>`;

  await fs.writeFile(path.join(outDir, 'index.html'), indexHtml, 'utf8');
  console.log(`\n${index.length} templates -> ${outDir}`);
  console.log(`open ${path.join(outDir, 'index.html')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
