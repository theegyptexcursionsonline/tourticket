import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeRichHtml } from '../../lib/security/sanitizeHtml';

test('removes executable and form content while preserving editorial HTML', () => {
  const value = sanitizeRichHtml(`
    <h2 class="title">Tour details</h2>
    <script>alert(document.cookie)</script>
    <p onclick="steal()" style="background:url(javascript:evil)">Welcome <strong>aboard</strong>.</p>
    <form action="https://attacker.example"><input name="password"></form>
  `);

  assert.match(value, /<h2 class="title">Tour details<\/h2>/);
  assert.match(value, /<strong>aboard<\/strong>/);
  assert.doesNotMatch(value, /script|onclick|style=|form|input|attacker/i);
});

test('rejects unsafe URL schemes and unapproved iframe hosts', () => {
  const value = sanitizeRichHtml(`
    <a href="javascript:alert(1)">bad</a>
    <img src="data:text/html;base64,evil" onerror="alert(1)">
    <iframe src="https://attacker.example/embed"></iframe>
    <iframe src="https://www.youtube-nocookie.com/embed/abc" allowfullscreen></iframe>
  `);

  assert.match(value, /<a>bad<\/a>/);
  assert.doesNotMatch(value, /data:text\/html|attacker\.example/);
  assert.match(value, /https:\/\/www\.youtube-nocookie\.com\/embed\/abc/);
});

test('protects links that open a new browsing context', () => {
  assert.equal(
    sanitizeRichHtml('<a href="https://example.com" target="_blank">go</a>'),
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">go</a>',
  );
});
