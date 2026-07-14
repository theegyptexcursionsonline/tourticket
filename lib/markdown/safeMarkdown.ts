import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import type { Options as ReactMarkdownOptions } from 'react-markdown';

/**
 * Raw HTML is still parsed for legacy CMS formatting, but every resulting HAST
 * node passes through this allow-list before React can render it. In
 * particular, scripts, iframes, event-handler attributes, style attributes and
 * unsafe URL schemes are not allowed.
 */
export const safeMarkdownSchema: Options = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames || []).filter(
    (tagName) => !['iframe', 'object', 'embed', 'script', 'style', 'form'].includes(tagName),
  ),
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https'],
  },
};

export const safeMarkdownRehypePlugins: NonNullable<ReactMarkdownOptions['rehypePlugins']> = [
  rehypeRaw,
  [rehypeSanitize, safeMarkdownSchema],
];

const EXPLICIT_SAFE_SCHEME = /^(?:https?:|mailto:|tel:)/i;
const ANY_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Defence in depth for Markdown links and images. ReactMarkdown invokes this
 * after parsing entities, so obfuscated javascript/data/vbscript URLs fail
 * closed as well as their plain-text equivalents.
 */
export function safeMarkdownUrlTransform(url: string): string {
  const normalized = url.trim().replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '');

  if (!normalized) return '';
  if (normalized.startsWith('#') || normalized.startsWith('/') || normalized.startsWith('?')) {
    return url;
  }
  if (!ANY_SCHEME.test(normalized) || EXPLICIT_SAFE_SCHEME.test(normalized)) {
    return url;
  }

  return '';
}
