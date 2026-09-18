// lib/email/templateEngine.ts
//
// Subjects only. Email BODIES are built by `lib/email/templates/*` against the
// shared layout in `lib/email/layout.ts`; there is no longer a directory of
// Handlebars HTML files to read from disk at runtime.
import Handlebars from 'handlebars';

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('or', function(...args) {
  // Remove options object (last argument)
  const values = args.slice(0, -1);
  return values.some(value => !!value);
});

Handlebars.registerHelper('gt', function(a, b) {
  return Number(a) > Number(b);
});

export class TemplateEngine {
  static replaceVariables(template: string, data: object): string {
    // Use Handlebars to compile and render the template
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }

  static generateSubject(template: string, data: object): string {
    // Subjects are plain text, so decode entities that Handlebars escapes.
    const rendered = this.replaceVariables(template, data);
    return rendered
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'");
  }
}
