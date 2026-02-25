const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const uri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bible-app';

console.log('Testing MongoDB connection...');
console.log('URI:', uri.replace(/:([^:@]+)@/, ':****@')); // Mask password

mongoose.connect(uri)
    .then(() => {
        console.log('✅ Successfully connected to MongoDB!');
        console.log('Database name:', mongoose.connection.name);
        console.log('Host:', mongoose.connection.host);
        console.log('Port:', mongoose.connection.port);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed:', err);
        process.exit(1);
    });
