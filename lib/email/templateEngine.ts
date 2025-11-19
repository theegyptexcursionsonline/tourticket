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

    // Handle conditional sections {{#if variable}}...{{/if}} and {{#if this.variable}}...{{/if}}
    result = result.replace(/{{#if\s+(this\.)?(\w+)}}([\s\S]*?){{\/if}}/g, (match, thisPrefix, variable, content) => {
      const value = data[variable];
      // Check for truthy values (not null, not undefined, not empty string, not 0, not false)
      const isTruthy = value !== null &&
                       value !== undefined &&
                       value !== '' &&
                       value !== false &&
                       !(typeof value === 'number' && value === 0) &&
                       !(Array.isArray(value) && value.length === 0);
      return isTruthy ? content : '';
    });

    // Handle arrays {{#each array}}...{{/each}} and {{#each this.array}}...{{/each}}
    result = result.replace(/{{#each\s+(this\.)?(\w+)}}([\s\S]*?){{\/each}}/g, (match, thisPrefix, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (!Array.isArray(array) || array.length === 0) return '';

      return array.map(item => {
        let itemHtml = itemTemplate;

        if (typeof item === 'object' && item !== null) {
          // First handle nested conditionals {{#if this.property}}...{{/if}}
          itemHtml = itemHtml.replace(/{{#if\s+this\.(\w+)}}([\s\S]*?){{\/if}}/g, (m, prop, content) => {
            const val = item[prop];
            const isTruthy = val !== null &&
                           val !== undefined &&
                           val !== '' &&
                           val !== false &&
                           !(typeof val === 'number' && val === 0) &&
                           !(Array.isArray(val) && val.length === 0);
            return isTruthy ? content : '';
          });

          // Handle nested {{#each this.array}}...{{/each}}
          itemHtml = itemHtml.replace(/{{#each\s+this\.(\w+)}}([\s\S]*?){{\/each}}/g, (m, nestedArrayName, nestedItemTemplate) => {
            const nestedArray = item[nestedArrayName];
            if (!Array.isArray(nestedArray) || nestedArray.length === 0) return '';

            return nestedArray.map(nestedItem => {
              // For string arrays, replace {{this}} with the string value
              if (typeof nestedItem === 'string') {
                return nestedItemTemplate.replace(/{{this}}/g, nestedItem);
              }
              return nestedItemTemplate;
            }).join('');
          });

          // Replace {{this.property}} and {{property}} with values
          Object.entries(item).forEach(([key, value]) => {
            const thisRegex = new RegExp(`{{this\\.${key}}}`, 'g');
            const plainRegex = new RegExp(`{{${key}}}`, 'g');
            const stringValue = String(value ?? '');
            itemHtml = itemHtml.replace(thisRegex, stringValue);
            itemHtml = itemHtml.replace(plainRegex, stringValue);
          });
        } else {
          // For primitive values in arrays, replace {{this}}
          itemHtml = itemHtml.replace(/{{this}}/g, String(item ?? ''));
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