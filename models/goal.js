const mongoose = require('mongoose');
const { calculateProgress } = require('../utils/goalUtils');

const goalSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  thrustArea: { type: String, trim: true },
  uomType: { type: String, enum: ['Min', 'Max', 'Zero'], required: true },
  target: { type: Number, default: 0 },
  achievement: { type: Number, default: 0 },
  weightage: { type: Number, default: 0 },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  category: { type: String, enum: ['Productivity', 'Learning', 'Teamwork', 'Innovation'], default: 'Productivity' },
  dueDate: { type: Date },
  progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['Not Started', 'On Track', 'In Progress', 'Under Review', 'Completed', 'Overdue'], default: 'Not Started' },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  managerComment: { type: String, trim: true, default: '' },
  isLocked: { type: Boolean, default: false },
  isShared: { type: Boolean, default: false },
  phase: { type: String, default: 'goal-setting' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

goalSchema.methods.getProgress = function () {
  return calculateProgress(this);
};

goalSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Goal', goalSchema);
