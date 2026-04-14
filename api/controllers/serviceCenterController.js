const ServiceCenter = require('../models/ServiceCenter');

exports.createCenter = async (req, res) => {
  try {
    const { name, type, contactInfo, location } = req.body;

    if (!name || !type || !location || !location.coordinates) {
      return res.status(400).json({ error: 'Missing mandatory payload variables for node placement.' });
    }

    const coords = location.coordinates.map(Number);
    if (coords.length < 2 || coords.some(n => isNaN(n) || !isFinite(n))) {
      return res.status(400).json({ error: 'Invalid coordinates. Latitude and longitude must be valid numbers.' });
    }
    // MongoDB 2dsphere requires longitude in [-180,180] and latitude in [-90,90]
    const [lng, lat] = coords;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: `Coordinates out of range: lng=${lng}, lat=${lat}` });
    }

    const center = new ServiceCenter({
      name,
      type,
      contactInfo: contactInfo || '',
      location: { type: 'Point', coordinates: [lng, lat] }
    });

    const savedCenter = await center.save();
    res.status(201).json(savedCenter);
  } catch (err) {
    console.error('Service center creation error:', err);
    res.status(500).json({ error: 'Failed mapping infrastructure element', details: err.message });
  }
};

exports.getAllCenters = async (req, res) => {
  try {
    const centers = await ServiceCenter.find().sort({ createdAt: -1 });
    res.status(200).json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
