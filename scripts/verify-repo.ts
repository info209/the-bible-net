import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const mongoose = require('mongoose');
const { SavedItemRepository } = require('../src/repositories/savedItemRepository');
const { SavedItem } = require('../src/models/SavedItem');

async function verifyRepo() {
    try {
        const { connectDB } = require('../src/lib/db');
        await connectDB();

        const userId = '6638f8f8f8f8f8f8f8f8f8f8'; // Mock ID
        const type = 'highlight';
        const refId = 'Gen_1_1_KJV';
        
        console.log('1. Creating highlight (Yellow)...');
        await SavedItemRepository.saveItem(userId, type, refId, { color: 'yellow', verse: 1 });
        
        let item = await SavedItem.findOne({ userId, type, refId });
        console.log('Result color:', item.metadata.color);
        if (item.metadata.color !== 'yellow') throw new Error('Failed to save yellow');

        console.log('2. Updating highlight (Green)...');
        await SavedItemRepository.saveItem(userId, type, refId, { color: 'green', verse: 1 });
        
        item = await SavedItem.findOne({ userId, type, refId });
        console.log('Result color:', item.metadata.color);
        if (item.metadata.color !== 'green') throw new Error('Failed to update to green');

        console.log('3. Deleting highlight...');
        const deleted = await SavedItemRepository.unsaveItem(userId, item._id.toString());
        console.log('Deleted successfully:', deleted);
        
        item = await SavedItem.findOne({ userId, type, refId });
        console.log('Item exists after delete:', !!item);
        if (item) throw new Error('Failed to delete');

        console.log('✅ Repository verification passed!');
    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

verifyRepo();
