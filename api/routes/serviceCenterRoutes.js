const express = require('express');
const router = express.Router();
const serviceCenterController = require('../controllers/serviceCenterController');

router.post('/', serviceCenterController.createCenter);
router.get('/', serviceCenterController.getAllCenters);

module.exports = router;
