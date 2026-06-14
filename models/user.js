const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['employee', 'manager', 'admin'] },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
