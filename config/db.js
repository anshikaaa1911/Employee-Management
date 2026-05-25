const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

let memoryServer;

const connectToMongo = async (uri) => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 5000
  });
};

const shouldAllowMemoryDb = () => process.env.ALLOW_MEMORY_DB === 'true';

module.exports = async function connectDb() {
  const envUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_goal_portal';
  try {
    await connectToMongo(envUri);
    console.log('MongoDB connected');
    return { uri: envUri, mode: 'configured' };
  } catch (error) {
    if (!shouldAllowMemoryDb()) {
      console.error('MongoDB connection failed:', error.message);
      console.error('Start MongoDB locally, set MONGO_URI to a reachable MongoDB server, or set ALLOW_MEMORY_DB=true for demo mode.');
      throw error;
    }
    console.warn('MongoDB connection failed:', error.message);
    console.warn('Starting in-memory MongoDB fallback server.');
    try {
      memoryServer = await MongoMemoryServer.create();
      const memoryUri = memoryServer.getUri();
      await connectToMongo(memoryUri);
      console.log('Connected to in-memory MongoDB server');
      return { uri: memoryUri, mode: 'memory' };
    } catch (memoryError) {
      console.error('In-memory MongoDB fallback failed:', memoryError.message);
      console.error('Start MongoDB locally or set MONGO_URI to a MongoDB Atlas connection string.');
      throw memoryError;
    }
  }
};

module.exports.stopMemoryServer = async function stopMemoryServer() {
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};
