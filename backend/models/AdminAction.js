const mongoose = require('mongoose');

const AdminActionSchema = new mongoose.Schema({
  adminUid: { type: String, required: true },
  adminName: { type: String, default: 'Admin' },
  action: { type: String, required: true }, // e.g. 'STATUS_CHANGE', 'AUTHORITY_REGISTERED', 'ISSUE_DELETED'
  targetId: { type: String, default: null },
  targetType: { type: String, default: null }, // 'issue' | 'authority'
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // extra details
}, { timestamps: true });

module.exports = mongoose.model('AdminAction', AdminActionSchema);
