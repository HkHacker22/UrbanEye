const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/sync', userController.syncUser);
router.get('/me/:uid', userController.getMyProfile);
router.get('/admin/:uid', userController.getAdminProfile);
router.patch('/:uid/notifications', userController.updateNotifications);
router.get('/notifications/:uid', userController.getNotifications);
router.post('/notifications/:uid/seen', userController.markNotificationsRead);

module.exports = router;
