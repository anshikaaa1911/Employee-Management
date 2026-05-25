const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/user');
const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');
const connectDb = require('./db');

dotenv.config();

async function seed() {
  const connection = await connectDb();
  console.log(`Seeding database in ${connection.mode} mode.`);

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
  await mongoose.disconnect();
  await connectDb.stopMemoryServer();
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
