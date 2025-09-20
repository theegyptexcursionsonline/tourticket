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

  static replaceVariables(template: string, data: Record<string, any>): string {
    let result = template;
    
    // Replace all {{variable}} with actual values
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    // Handle conditional sections {{#if variable}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    // Handle arrays {{#each array}}...{{/each}}
    result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, itemTemplate) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemHtml = itemTemplate;
        Object.entries(item).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemHtml = itemHtml.replace(regex, String(value || ''));
        });
        return itemHtml;
      }).join('');
    });

    return result;
  }

  static generateSubject(template: string, data: Record<string, any>): string {
    return this.replaceVariables(template, data);
  }
}