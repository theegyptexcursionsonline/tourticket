import sanitize from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
  'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'div',
  'figure', 'figcaption', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr',
  'th', 'td', 'caption', 'iframe',
];

/**
 * Sanitizes rich text that originated in MongoDB before it reaches an HTML
 * rendering sink. The allowlist deliberately excludes scripts, forms, inline
 * event handlers, SVG/MathML, embedded objects and inline CSS.
 *
 * This module is safe to use from both server and client components.
 */
export function sanitizeRichHtml(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';

  return sanitize(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ['class', 'id', 'title', 'dir', 'lang'],
      a: ['href', 'target', 'rel', 'aria-label'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
      iframe: ['https'],
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'youtube.com',
      'www.youtube-nocookie.com',
      'player.vimeo.com',
    ],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: attribs.target === '_blank'
          ? { ...attribs, rel: 'noopener noreferrer' }
          : attribs,
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: { ...attribs, loading: attribs.loading || 'lazy' },
      }),
    },
    disallowedTagsMode: 'discard',
  });
}
