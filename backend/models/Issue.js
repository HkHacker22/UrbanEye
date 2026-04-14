const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'unclassified' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['Pending', 'In-Progress', 'Resolved', 'Rejected'], default: 'Pending' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [Longitude, Latitude]
  },
  assignedCenterName: { type: String },
  assignedCenterType: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporterUid: { type: String, default: null, index: true }, 
  reporterName: { type: String, default: 'Anonymous' },
  reporterPhoto: { type: String, default: '' },
  upvotes: { type: Number, default: 0 },
  imageUrl: { type: String },
  aiPending: { type: Boolean, default: false },
  comments: [{
    authorName: { type: String, required: true },
    authorUid: { type: String, required: true },
    photoURL: { type: String, default: '' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  isReadByAdmin: { type: Boolean, default: false }
}, { timestamps: true });

// Geospatial index for future distance-based querying features
IssueSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Issue', IssueSchema);
