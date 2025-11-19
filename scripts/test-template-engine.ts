import { TemplateEngine } from '../lib/email/templateEngine';

// Test template with nested structures
const testTemplate = `
<h1>Tours</h1>
{{#each tours}}
<div class="tour">
  <h2>{{this.title}}</h2>
  <p>Date: {{this.date}}</p>
  <p>Adults: {{this.adults}}</p>
  <p>Children: {{this.children}}</p>

  {{#if this.addOns}}
  <div class="addons">
    <strong>Add-ons:</strong>
    <ul>
      {{#each this.addOns}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>
  {{/if}}

  <p>Price: {{this.price}}</p>
</div>
{{/each}}
`;

const testData = {
  tours: [
    {
      title: 'Half-Day Pyramids Tour',
      date: 'Tue, Nov 19, 2025',
      adults: 2,
      children: 0,
      addOns: ['Hotel Pickup', 'Entrance Tickets', 'Water'],
      price: '$1.08'
    },
    {
      title: 'Museum Visit',
      date: 'Tue, Nov 19, 2025',
      adults: 2,
      children: 0,
      addOns: ['Audio Guide', 'Fast Track'],
      price: '$1.08'
    }
  ]
};

console.log('🧪 Testing Template Engine...\n');
console.log('Input data:', JSON.stringify(testData, null, 2));
console.log('\n---\n');

const result = TemplateEngine.replaceVariables(testTemplate, testData);

console.log('Result:');
console.log(result);
console.log('\n---\n');

// Check for any remaining template variables
const remainingVars = result.match(/{{[^}]+}}/g);
if (remainingVars) {
  console.error('❌ Found unreplaced template variables:');
  remainingVars.forEach(v => console.error('  -', v));
  process.exit(1);
} else {
  console.log('✅ All template variables replaced successfully!');
}
