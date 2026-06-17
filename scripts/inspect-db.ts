import path from 'path';
import dotenv from 'dotenv';

// Load env.local variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const { connectDB } = await import('../src/lib/db');
  const { User } = await import('../src/models/User');

  await connectDB();
  const users = await User.find({}).lean();

  console.log('\n=== Users ===');
  users.forEach((u: any) => {
    console.log(`ID: ${u._id}`);
    console.log(`  - name: ${u.firstName} ${u.lastName}`);
    console.log(`  - email: ${u.email}`);
    console.log(`  - role: ${u.role}`);
    console.log('-------------------------------------------');
  });

  process.exit(0);
}

run().catch(console.error);
