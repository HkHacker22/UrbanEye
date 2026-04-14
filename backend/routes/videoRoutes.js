const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const videoController = require('../controllers/videoController');

// Multer: store video to disk temporarily before GCS upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

router.post('/analyze', upload.single('video'), videoController.analyzeVideo);
router.get('/results', videoController.getAllResults);
router.get('/results/:id', videoController.getResult);
router.delete('/results/:id', videoController.deleteResult);

module.exports = router;
