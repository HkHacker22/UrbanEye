const mongoose = require('mongoose');

const KarmaLedgerEntrySchema = new mongoose.Schema({
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  issueId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID
  displayName: { type: String, default: '' },
  email: { type: String, required: true },
  photoURL: { type: String, default: '' },
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' },
  // Karma system
  karmaPoints: { type: Number, default: 0 },
  karmaTier: { type: String, default: 'Novice Reporter' },
  karmaLedger: { type: [KarmaLedgerEntrySchema], default: [] },
  lastNotificationsViewedAt: { type: Date, default: null },
  // Admin notification preferences
  notifyOnCritical: { type: Boolean, default: true },
  notifyOnNewReport: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
