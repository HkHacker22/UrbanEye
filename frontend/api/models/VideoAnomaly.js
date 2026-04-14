const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type: { type: String }, // WEAPON_DETECTED, NO_LICENSE_PLATE, PERSON_LOITERING
  label: { type: String },
  timestamp: { type: Number },
  confidence: { type: Number },
  message: { type: String },
}, { _id: false });

const DetectedObjectSchema = new mongoose.Schema({
  label: { type: String },
  confidence: { type: Number },
  startTime: { type: Number },
  endTime: { type: Number },
  duration: { type: Number },
}, { _id: false });

const VideoAnomalySchema = new mongoose.Schema({
  filename: { type: String, required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [] } // [lng, lat]
  },
  gcsUri: { type: String, default: null },
  status: { type: String, enum: ['pending', 'analyzing', 'complete', 'failed'], default: 'pending' },
  reporterUid: { type: String, default: null },
  reporterName: { type: String, default: 'Anonymous' },
  errorMessage: { type: String, default: null },
  objects: { type: [DetectedObjectSchema], default: [] },
  alerts: { type: [AlertSchema], default: [] },
}, { timestamps: true });

VideoAnomalySchema.index({ location: '2dsphere' });


module.exports = mongoose.model('VideoAnomaly', VideoAnomalySchema);
