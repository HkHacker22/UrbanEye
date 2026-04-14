const VideoAnomaly = require('../models/VideoAnomaly');
const { processLocalFile, analyzeVideo: analyzeVideoFromGCS } = require('../services/videoAnalysisService');

const GCP_BUCKET = process.env.GCP_BUCKET_NAME;
const GCP_CREDS  = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// POST /api/video/analyze
// Accepts multipart video file upload, starts async analysis
exports.analyzeVideo = async (req, res) => {
  try {
    const file = req.file;
    const gcsUri = req.body?.gcsUri; // optional: pass GCS URI directly

    if (!file && !gcsUri) {
      return res.status(400).json({ error: 'Provide a video file upload or a gcsUri.' });
    }

    // Check GCP is configured (fail fast with helpful error)
    if (!GCP_CREDS || !GCP_BUCKET) {
      // Clean up uploaded file if any
      if (file) require('fs').unlink(file.path, () => {});
      return res.status(503).json({
        error: 'Google Cloud is not configured.',
        details: 'Set GOOGLE_APPLICATION_CREDENTIALS and GCP_BUCKET_NAME in your .env file and restart the server.',
      });
    }

    const filename = file?.originalname || (gcsUri?.split('/').pop()) || 'video';

    // Build location if coordinates were submitted
    let locationField;
    const lat = parseFloat(req.body?.lat);
    const lng = parseFloat(req.body?.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      locationField = { type: 'Point', coordinates: [lng, lat] };
    }

    // Create record immediately so client can poll
    const record = await VideoAnomaly.create({
      filename,
      title: req.body?.title || '',
      description: req.body?.description || '',
      ...(locationField && { location: locationField }),
      status: 'analyzing',
      reporterUid: req.body?.reporterUid || null,
      reporterName: req.body?.reporterName || 'Anonymous',
    });

    // Return immediately — analysis runs in background
    res.status(202).json({ id: record._id, status: 'analyzing', message: 'Analysis started. Poll /api/video/results/:id for status.' });

    // === Background Analysis ===
    (async () => {
      try {
        let result;
        if (file) {
          result = await processLocalFile(file.path, GCP_BUCKET);
        } else {
          const { objects, alerts } = await analyzeVideoFromGCS(gcsUri);
          result = { gcsUri, objects, alerts };
        }

        await VideoAnomaly.findByIdAndUpdate(record._id, {
          gcsUri: result.gcsUri || gcsUri,
          objects: result.objects.map(o => ({
            label: o.label,
            confidence: o.confidence,
            startTime: o.startTime,
            endTime: o.endTime,
            duration: o.duration,
          })),
          alerts: result.alerts,
          status: 'complete',
        });

        console.log(`✅ Analysis complete for record ${record._id} — ${result.alerts.length} alert(s)`);
      } catch (err) {
        console.error(`❌ Analysis failed for record ${record._id}:`, err.message);
        await VideoAnomaly.findByIdAndUpdate(record._id, {
          status: 'failed',
          errorMessage: err.message,
        });
      }
    })();

  } catch (err) {
    console.error('Video controller error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/video/results
// All analyses, newest first (admin view)
exports.getAllResults = async (req, res) => {
  try {
    const results = await VideoAnomaly.find()
      .sort({ createdAt: -1 })
      .select('-objects'); // omit heavy objects array for list view
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/video/results/:id
// Single result (for polling)
exports.getResult = async (req, res) => {
  try {
    const result = await VideoAnomaly.findById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Analysis not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/video/results/:id
exports.deleteResult = async (req, res) => {
  try {
    await VideoAnomaly.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
