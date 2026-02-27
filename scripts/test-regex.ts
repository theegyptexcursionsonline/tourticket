// Test regex matching
const test1 = `{{#if this.addOns}}content here{{/if}}`;
const test2 = `
  {{#if this.addOns}}
  <div>content</div>
  {{/if}}
`;

const regex = /{{#if\s+this\.(\w+)}}([\s\S]*?){{\/if}}/g;

console.log('Test 1:', test1);
console.log('Regex:', regex);
console.log('');

const regexResult1 = test1.replace(regex, (m, prop, content) => {
  console.log('MATCHED!');
  console.log('  Full match:', JSON.stringify(m));
  console.log('  Property:', prop);
  console.log('  Content:', JSON.stringify(content));
  return '[REPLACED]';
});

console.log('Result 1:', regexResult1);
console.log('');

console.log('Test 2:', test2);
const regexResult2 = test2.replace(regex, (m, prop, content) => {
  console.log('MATCHED!');
  console.log('  Full match:', JSON.stringify(m));
  console.log('  Property:', prop);
  console.log('  Content:', JSON.stringify(content));
  return '[REPLACED]';
});

console.log('Result 2:', regexResult2);
