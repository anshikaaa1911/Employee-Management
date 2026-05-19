const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
