import mongoose from 'mongoose';
import dns from 'dns';

// Fix for querySrv ECONNREFUSED on some networks (e.g., Windows or certain ISPs)
// This forces Node.js to use public DNS servers for resolving MongoDB Atlas SRV records
if (process.env.NODE_ENV !== 'test') {
  try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  } catch (e) {
    console.warn('Failed to set custom DNS servers:', e);
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// Debug log for MONGODB_URI (masked for security)
if (process.env.NODE_ENV !== 'test') {
  console.log(`📡 Database URI: ${MONGODB_URI.substring(0, 15)}...`);
}

interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using a singleton pattern
 * This function can be called multiple times but will only create one connection
 */
export async function connectDB(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('----------------------------------------');
      console.log(`✅ [${new Date().toISOString()}] MongoDB connected successfully`);
      console.log('----------------------------------------');
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('----------------------------------------');
    console.error(`❌ [${new Date().toISOString()}] MongoDB connection failed:`, e);
    console.error('----------------------------------------');
    throw e;
  }

  return cached.conn;
}

/**
 * Initialize database connection at app startup
 * Call this once when the application starts
 */
export async function initializeDB(): Promise<void> {
  try {
    const conn = await connectDB();
    console.log(`🚀 [${new Date().toISOString()}] Database initialized by instrumentation`);

    // Force creation of collections for all registered models
    const models = mongoose.models;
    for (const [name, model] of Object.entries(models)) {
      try {
        // This creates the collection if it doesn't exist
        await model.createCollection();
        // Also ensure indexes are built
        await model.syncIndexes();
        console.log(`   - Verified collection: ${name}`);
      } catch (err: any) {
        // Ignore if already exists or specific error
        if (err.codeName !== 'NamespaceExists') {
          console.warn(`   ⚠️ Error verifying collection ${name}:`, err.message);
        }
      }
    }

    // Check if Bible data exists (Seed check)
    // We need to dynamically import the model to avoid top-level side effects if possible,
    // or just rely on mongoose.models if they are loaded.
    // Since we import models in API routes, they might not be loaded yet in instrumentation context?
    // Actually, we should import them here to be sure.
    // However, importing models might trigger connection logic if not careful.
    // Let's defer this check or use a raw query.

    // Check 'bibleversions' collection directly
    const versionsCount = await conn.collection('bibleversions').countDocuments();

    if (versionsCount === 0) {
      console.log('\n\n');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                   ⚠️  DATABASE IS EMPTY  ⚠️                   ║');
      console.log('║                                                              ║');
      console.log('║  The database has been initialized but contains no data.     ║');
      console.log('║                                                              ║');
      console.log('║  👉  Run:  npx tsx scripts/import_bible.ts                   ║');
      console.log('║                                                              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('\n');
    }

  } catch (error) {
    console.error(`💥 [${new Date().toISOString()}] Failed to initialize database:`, error);
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isDBConnected(): boolean {
  return cached.conn !== null && cached.conn.readyState === 1;
}

export default connectDB;
