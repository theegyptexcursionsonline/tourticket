// seed-database.js
import fs from 'fs';

async function seedDatabase() {
  try {
    // Read the sample data
    const sampleData = JSON.parse(fs.readFileSync('./sample-data.json', 'utf8'));
    
    // Call your seed API
    const response = await fetch('http://localhost:3000/api/admin/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Database seeded successfully!');
      console.log('📊 Report:', result.report);
    } else {
      console.error('❌ Seeding failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

seedDatabase();