import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes - using local paths within the api/ directory
import issueRoutes from './routes/issueRoutes.js';
import serviceCenterRoutes from './routes/serviceCenterRoutes.js';
import userRoutes from './routes/userRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

const app = express();

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
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    __dirname,
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: (origin, callback) => {
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

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.get('/', (req, res) => {
  res.send('Smart Civic Issue Platform API (Root /api Entry)');
});

// Main Resource Routes - Corrected for Vercel
app.use('/issues', issueRoutes);
app.use('/service-centers', serviceCenterRoutes);
app.use('/users', userRoutes);
app.use('/video', videoRoutes);

export default app;
