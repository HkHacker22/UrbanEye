/**
 * videoAnalysisService.js
 * Wraps Google Cloud Video Intelligence API with custom anomaly detection rules.
 */

const path = require('path');
const fs = require('fs');

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const WEAPON_LABELS = ['gun', 'rifle', 'weapon', 'firearm', 'pistol', 'knife',
  'blade', 'sword', 'explosive', 'bomb', 'grenade', 'shotgun', 'handgun'];

const VEHICLE_LABELS = ['car', 'vehicle', 'truck', 'motorcycle', 'bus', 'van',
  'automobile', 'bike', 'bicycle', 'suv', 'pickup'];

const PLATE_LABELS = ['license plate', 'number plate', 'vehicle registration plate',
  'plate', 'registration'];

const WEAPON_CONFIDENCE_THRESHOLD = 0.5;
const VEHICLE_DURATION_THRESHOLD = 3; // seconds — vehicle must be tracked for at least this long
const LOITERING_THRESHOLD = 30;       // seconds — person loitering threshold
const PLATE_OVERLAP_THRESHOLD = 0.05; // minimum IoU overlap to count plate-vehicle association

// ------------------------------------------------------------------
// Duration proto → seconds
// ------------------------------------------------------------------
const toSeconds = (duration) => {
  if (!duration) return 0;
  const secs = Number(duration.seconds || 0);
  const nanos = Number(duration.nanos || 0);
  return secs + nanos / 1e9;
};

// ------------------------------------------------------------------
// Bounding box intersection ratio (plate area within vehicle bbox)
// ------------------------------------------------------------------
const bboxOverlapRatio = (vehicle, plate) => {
  const left   = Math.max(vehicle.left,   plate.left);
  const right  = Math.min(vehicle.right,  plate.right);
  const top    = Math.max(vehicle.top,    plate.top);
  const bottom = Math.min(vehicle.bottom, plate.bottom);

  if (right <= left || bottom <= top) return 0;

  const overlapArea = (right - left) * (bottom - top);
  const plateArea   = (plate.right - plate.left) * (plate.bottom - plate.top);
  return plateArea > 0 ? overlapArea / plateArea : 0;
};

// ------------------------------------------------------------------
// Normalize raw API objectAnnotations → flat objects array
// ------------------------------------------------------------------
const normalizeAnnotations = (objectAnnotations = []) => {
  return objectAnnotations.map((obj, idx) => {
    const label      = (obj.entity?.description || 'unknown').toLowerCase();
    const confidence = obj.confidence || 0;
    const startTime  = toSeconds(obj.segment?.startTimeOffset);
    const endTime    = toSeconds(obj.segment?.endTimeOffset);
    const duration   = endTime - startTime;

    const frames = (obj.frames || []).map(frame => ({
      timestamp: toSeconds(frame.timeOffset),
      bbox: {
        left:   frame.normalizedBoundingBox?.left   ?? 0,
        top:    frame.normalizedBoundingBox?.top    ?? 0,
        right:  frame.normalizedBoundingBox?.right  ?? 1,
        bottom: frame.normalizedBoundingBox?.bottom ?? 1,
      },
    }));

    return { id: idx, label, confidence, startTime, endTime, duration, frames };
  });
};

// ------------------------------------------------------------------
// Rule 1: Weapon Detection
// ------------------------------------------------------------------
const detectWeapons = (objects) => {
  const alerts = [];
  objects.forEach(obj => {
    const isWeapon = WEAPON_LABELS.some(w => obj.label.includes(w));
    if (isWeapon && obj.confidence >= WEAPON_CONFIDENCE_THRESHOLD) {
      alerts.push({
        type: 'WEAPON_DETECTED',
        label: obj.label,
        timestamp: obj.startTime,
        confidence: obj.confidence,
        message: `ALERT: WEAPON_DETECTED at ${obj.startTime.toFixed(1)}s — "${obj.label}" (conf: ${(obj.confidence * 100).toFixed(0)}%)`,
      });
    }
  });
  return alerts;
};

// ------------------------------------------------------------------
// Rule 2: Vehicle Without License Plate
// ------------------------------------------------------------------
const detectVehiclesWithoutPlates = (objects) => {
  const alerts = [];

  const vehicles = objects.filter(obj =>
    VEHICLE_LABELS.some(v => obj.label.includes(v)) && obj.duration >= VEHICLE_DURATION_THRESHOLD
  );
  const plates = objects.filter(obj =>
    PLATE_LABELS.some(p => obj.label.includes(p))
  );

  vehicles.forEach(vehicle => {
    // Check if any plate overlaps this vehicle in at least one matching frame
    const hasPlate = plates.some(plate => {
      return plate.frames.some(plateFrame => {
        // Find the vehicle frame closest in time
        const vehicleFrame = vehicle.frames.reduce((closest, vf) => {
          return Math.abs(vf.timestamp - plateFrame.timestamp) <
            Math.abs(closest.timestamp - plateFrame.timestamp) ? vf : closest;
        }, vehicle.frames[0]);

        if (!vehicleFrame) return false;
        if (Math.abs(vehicleFrame.timestamp - plateFrame.timestamp) > 1.0) return false;

        return bboxOverlapRatio(vehicleFrame.bbox, plateFrame.bbox) >= PLATE_OVERLAP_THRESHOLD;
      });
    });

    if (!hasPlate) {
      alerts.push({
        type: 'NO_LICENSE_PLATE',
        label: vehicle.label,
        timestamp: vehicle.startTime,
        confidence: vehicle.confidence,
        message: `ALERT: NO_LICENSE_PLATE at ${vehicle.startTime.toFixed(1)}s — "${vehicle.label}" tracked for ${vehicle.duration.toFixed(1)}s`,
      });
    }
  });

  return alerts;
};

// ------------------------------------------------------------------
// Rule 3: Person Loitering
// ------------------------------------------------------------------
const detectLoitering = (objects) => {
  const alerts = [];
  objects.forEach(obj => {
    if (obj.label.includes('person') && obj.duration >= LOITERING_THRESHOLD) {
      alerts.push({
        type: 'PERSON_LOITERING',
        label: obj.label,
        timestamp: obj.startTime,
        confidence: obj.confidence,
        message: `ALERT: PERSON_LOITERING at ${obj.startTime.toFixed(1)}s — person visible for ${obj.duration.toFixed(1)}s`,
      });
    }
  });
  return alerts;
};

// ------------------------------------------------------------------
// Apply all rules
// ------------------------------------------------------------------
const applyAnomalyRules = (objects) => {
  const weapon    = detectWeapons(objects);
  const noPlate   = detectVehiclesWithoutPlates(objects);
  const loitering = detectLoitering(objects);

  const all = [...weapon, ...noPlate, ...loitering]
    .sort((a, b) => a.timestamp - b.timestamp);

  // Print alerts to console (server log)
  if (all.length > 0) {
    console.log('\n🚨 Anomaly Detection Results:');
    all.forEach(a => console.log(' ', a.message));
    console.log();
  } else {
    console.log('\n✅ No anomalies detected.\n');
  }

  return all;
};

// ------------------------------------------------------------------
// Upload local file to GCS
// ------------------------------------------------------------------
const uploadToGCS = async (fileBuffer, originalname, bucketName) => {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const destName = `video-${Date.now()}-${originalname}`;

  const file = bucket.file(destName);
  await file.save(fileBuffer, {
    resumable: false,
    contentType: 'video/mp4',
  });
  return `gs://${bucketName}/${destName}`;
};

// ------------------------------------------------------------------
// Main: Analyze video via GCS URI
// ------------------------------------------------------------------
const analyzeVideo = async (gcsUri) => {
  const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
  const client = new VideoIntelligenceServiceClient();

  console.log(`\n🎬 Starting Video Intelligence analysis on: ${gcsUri}`);

  const [operation] = await client.annotateVideo({
    inputUri: gcsUri,
    features: ['OBJECT_TRACKING'],
  });

  console.log('⏳ Waiting for analysis to complete (this may take a few minutes)...');
  const [result] = await operation.promise();

  const annotationResults = result.annotationResults?.[0];
  const rawObjects = annotationResults?.objectAnnotations || [];

  console.log(`📦 Raw objects detected: ${rawObjects.length}`);

  const objects = normalizeAnnotations(rawObjects);
  const alerts = applyAnomalyRules(objects);

  return { objects, alerts };
};

// ------------------------------------------------------------------
// Full pipeline: local file → GCS → analyze
// ------------------------------------------------------------------
const processLocalFile = async (fileBuffer, originalname, bucketName) => {
  const gcsUri = await uploadToGCS(fileBuffer, originalname, bucketName);
  console.log(`☁️  Uploaded to GCS: ${gcsUri}`);

  const result = await analyzeVideo(gcsUri);

  return { gcsUri, ...result };
};

module.exports = { analyzeVideo, processLocalFile, uploadToGCS, applyAnomalyRules, normalizeAnnotations };
