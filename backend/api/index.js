require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Adjust GCP credentials path for serverless if it's a relative path
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    __dirname,
    '..',
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

// Routes - adjusted path to '../' because index.js is in 'api/'
const issueRoutes = require('../routes/issueRoutes');
const serviceCenterRoutes = require('../routes/serviceCenterRoutes');
const userRoutes = require('../routes/userRoutes');
const videoRoutes = require('../routes/videoRoutes');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: FRONTEND_URL,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection with state check to avoid multiple connections in serverless
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-civic-db';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  
  const censoredUri = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to MongoDB: ${censoredUri}`);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('SUCCESS: Connected to MongoDB database');
  } catch (err) {
    console.error('ERROR: MongoDB connection failure:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      // In local dev, we want to know immediately if DB is down
      throw new Error(`Database connection failed: ${err.message}`);
    }
  }
};

// Middleware to ensure DB connection (MUST be before routes)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Smart Civic Issue Platform API (Vercel Serverless)');
});

// Main Resource Routes
app.use('/api/issues', issueRoutes);
app.use('/api/service-centers', serviceCenterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/video', videoRoutes);

// Export the app for Vercel
module.exports = app;

// Local development support
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
