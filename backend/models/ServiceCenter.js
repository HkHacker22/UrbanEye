const mongoose = require('mongoose');

const ServiceCenterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Police', 'Medical', 'Fire', 'Infrastructure'], required: true },
  contactInfo: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [Longitude, Latitude]
  }
}, { timestamps: true });

// Geospatial index for fast $geoNear tracking integration
ServiceCenterSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceCenter', ServiceCenterSchema);
