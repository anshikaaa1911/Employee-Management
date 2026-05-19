const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');

const ensureSeedData = async () => {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('Demo users already exist.');
    return;
  }

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

  await AuditLog.create({
    userId: admin._id,
    action: 'Seeded demo data',
    oldValue: null,
    newValue: { admin: admin.email, manager: manager.email, employee: employee.email }
  });

  console.log('Demo seed data created.');
};

module.exports = ensureSeedData;
