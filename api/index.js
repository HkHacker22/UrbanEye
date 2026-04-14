require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');

// Adjust GCP credentials path for serverless if it's a relative path
if (process.env.GCP_SERVICE_ACCOUNT_JSON) {
  const tempKeyPath = path.join(os.tmpdir(), 'gcp-key.json');
  try {
    fs.writeFileSync(tempKeyPath, process.env.GCP_SERVICE_ACCOUNT_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempKeyPath;
    console.log('✅ Created temporary GCP key from environment variable');
  } catch (err) {
    console.error('❌ Failed to create temporary GCP key:', err.message);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  // Paths are now relative to the api/ folder
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    __dirname,
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

// Routes - using local paths within the api/ directory
const issueRoutes = require('./routes/issueRoutes');
const serviceCenterRoutes = require('./routes/serviceCenterRoutes');
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin or explicit FRONTEND_URL
    if (!origin || origin.includes('vercel.app') || origin === FRONTEND_URL || FRONTEND_URL === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
      throw new Error(`Database connection failed: ${err.message}`);
    }
  }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Smart Civic Issue Platform API (Root /api Entry)');
});

// Main Resource Routes
app.use('/api/issues', issueRoutes);
app.use('/api/service-centers', serviceCenterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/video', videoRoutes);

module.exports = app;

// Local development support
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
