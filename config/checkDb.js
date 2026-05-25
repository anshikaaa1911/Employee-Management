const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDb = require('./db');

dotenv.config();

async function checkDb() {
  const connection = await connectDb();
  const ping = await mongoose.connection.db.admin().ping();

  console.log(`Database mode: ${connection.mode}`);
  console.log(`Database name: ${mongoose.connection.name}`);
  console.log(`Ping ok: ${ping.ok === 1}`);

  await mongoose.disconnect();
  await connectDb.stopMemoryServer();
}

checkDb().catch(async (error) => {
  console.error('Database check failed:', error.message);
  try {
    await mongoose.disconnect();
    await connectDb.stopMemoryServer();
  } catch (_) {
    // Ignore cleanup errors while reporting the original failure.
  }
  process.exit(1);
});
