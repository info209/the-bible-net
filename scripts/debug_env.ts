import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
console.log('File exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
console.log('Dotenv result:', result.error ? result.error.message : 'Success');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');
if (!process.env.MONGODB_URI) {
    // Try reading file content to debug format (safely)
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    console.log('File has', lines.length, 'lines');
    lines.forEach(l => {
        if (l.startsWith('MONGODB_URI')) {
            console.log('Found MONGODB_URI line:', l.substring(0, 15) + '...');
        }
    });
}
