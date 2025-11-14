// lib/email/templateEngine.ts
import fs from 'fs/promises';
import path from 'path';

export class TemplateEngine {
  private static templateCache = new Map<string, string>();
  private static templatesPath = path.join(process.cwd(), 'lib/email/templates');

  static async loadTemplate(templateName: string): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      const template = await fs.readFile(templatePath, 'utf-8');
      
      // Cache the template
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  static replaceVariables(template: string, data: Record<string, unknown> | any): string {
    let result = template;

    // Handle conditional sections {{#if variable}}...{{/if}} first
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
      const value = data[variable];
      // Check for truthy values (not null, not undefined, not empty string, not 0, not false)
      const isTruthy = value !== null &&
                       value !== undefined &&
                       value !== '' &&
                       value !== false &&
                       !(typeof value === 'number' && value === 0);
      return isTruthy ? content : '';
    });

    // Handle arrays {{#each array}}...{{/each}}
    result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (!Array.isArray(array) || array.length === 0) return '';

      return array.map(item => {
        let itemHtml = itemTemplate;
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemHtml = itemHtml.replace(regex, String(value ?? ''));
          });
        }
        return itemHtml;
      }).join('');
    });

    // Replace all {{variable}} with actual values
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      // Use nullish coalescing to handle null/undefined
      result = result.replace(regex, String(value ?? ''));
    });

    return result;
  }

  static generateSubject(template: string, data: Record<string, unknown> | any): string {
    return this.replaceVariables(template, data);
  }
}