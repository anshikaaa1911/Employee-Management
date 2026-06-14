const mongoose = require('mongoose');

const teamActivitySchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeamActivity', teamActivitySchema);
