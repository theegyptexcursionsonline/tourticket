// Create a script to set up indexes: scripts/setup-indexes.js
const mongoose = require('mongoose');
require('dotenv').config();

async function setupIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const db = mongoose.connection.db;
        const toursCollection = db.collection('tours');
        
        // Drop existing text index if it exists
        try {
            await toursCollection.dropIndex('tour_text_index');
            console.log('Dropped existing text index');
        } catch (error) {
            console.log('No existing text index to drop');
        }
        
        // Create new text index
        await toursCollection.createIndex({
            title: 'text',
            description: 'text',
            location: 'text',
            tags: 'text',
            highlights: 'text'
        }, {
            weights: {
                title: 10,
                location: 8,
                tags: 6,
                highlights: 4,
                description: 2
            },
            name: 'tour_text_index'
        });
        
        console.log('Created text search index successfully');
        
        // Create other performance indexes
        await toursCollection.createIndex({ category: 1 });
        await toursCollection.createIndex({ destination: 1 });
        await toursCollection.createIndex({ rating: -1 });
        await toursCollection.createIndex({ discountPrice: 1 });
        await toursCollection.createIndex({ bookings: -1 });
        
        console.log('Created all indexes successfully');
        
    } catch (error) {
        console.error('Error setting up indexes:', error);
    } finally {
        await mongoose.disconnect();
    }
}

setupIndexes();