import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  safeMarkdownRehypePlugins,
  safeMarkdownUrlTransform,
} from '@/lib/markdown/safeMarkdown';

const maliciousMarkdown = `
<img src="https://example.com/image.jpg" onerror="alert('xss')" style="background:url(javascript:alert(1))">
<iframe src="https://evil.example"></iframe>
<script>alert('xss')</script>
<a href="javascript:alert(1)" onclick="alert(2)">unsafe raw link</a>
[unsafe markdown link](javascript:alert(3))
[safe link](https://example.com/tour)
`;

const output = renderToStaticMarkup(
  React.createElement(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      rehypePlugins: safeMarkdownRehypePlugins,
      urlTransform: safeMarkdownUrlTransform,
    },
    maliciousMarkdown,
  ),
);

const markdownLinkOutput = renderToStaticMarkup(
  React.createElement(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      rehypePlugins: safeMarkdownRehypePlugins,
      urlTransform: safeMarkdownUrlTransform,
    },
    '[unsafe markdown link](javascript:alert(3))\n\n[safe link](https://example.com/tour)',
  ),
);

assert.doesNotMatch(output, /<iframe/i);
assert.doesNotMatch(output, /<script/i);
assert.doesNotMatch(output, /\sonerror=/i);
assert.doesNotMatch(output, /\sonclick=/i);
assert.doesNotMatch(output, /\sstyle=/i);
assert.doesNotMatch(output, /(?:href|src)="javascript:/i);
assert.doesNotMatch(markdownLinkOutput, /href="javascript:/i);
assert.match(markdownLinkOutput, /href="https:\/\/example\.com\/tour"/i);
assert.match(output, /src="https:\/\/example\.com\/image\.jpg"/i);

console.log('Markdown security verification passed:', {
  unsafeElementsRemoved: true,
  eventHandlersRemoved: true,
  unsafeSchemesRemoved: true,
  safeHttpsPreserved: true,
});
