const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/user');
const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');

dotenv.config();

const connectToMongo = async (uri) => {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
};

const getMongoUri = async () => {
  const envUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_goal_portal';
  try {
    await connectToMongo(envUri);
    console.log('Connected to MongoDB at', envUri);
    return envUri;
  } catch (error) {
    console.warn('MongoDB connection failed:', error.message);
    console.warn('Falling back to in-memory MongoDB for seeding.');
    const memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await connectToMongo(memoryUri);
    console.log('Connected to in-memory MongoDB server');
    return memoryUri;
  }
};

async function seed() {
  await getMongoUri();

  await User.deleteMany({});
  await Goal.deleteMany({});
  await AuditLog.deleteMany({});

  const password = await bcrypt.hash('123456', 10);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password,
    role: 'admin',
    department: 'Leadership'
  });

  const manager = await User.create({
    name: 'Manager User',
    email: 'manager@test.com',
    password,
    role: 'manager',
    department: 'Sales'
  });

  const employee = await User.create({
    name: 'Employee User',
    email: 'employee@test.com',
    password,
    role: 'employee',
    managerId: manager._id,
    department: 'Sales'
  });

  await Goal.create({
    employeeId: employee._id,
    title: 'Improve customer follow up',
    description: 'Call clients weekly and update CRM entries.',
    thrustArea: 'Customer Service',
    uomType: 'Max',
    target: 20,
    achievement: 5,
    weightage: 20,
    status: 'On Track',
    approvalStatus: 'Pending',
    isLocked: false,
    isShared: false,
    phase: 'goal-setting'
  });

  console.log('Seed data created');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
