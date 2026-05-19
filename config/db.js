const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

const connectToMongo = async (uri) => {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
};

module.exports = async function connectDb() {
  const envUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_goal_portal';
  try {
    await connectToMongo(envUri);
    console.log('MongoDB connected');
    return envUri;
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MEMORY_DB !== 'true') {
      throw error;
    }
    console.warn('MongoDB connection failed:', error.message);
    console.warn('Starting in-memory MongoDB fallback server.');
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await connectToMongo(memoryUri);
    console.log('Connected to in-memory MongoDB server');
    return memoryUri;
  }
};
