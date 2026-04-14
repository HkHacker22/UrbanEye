const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');

router.post('/', issueController.createIssue);
router.get('/stats', issueController.getIssueStats);
router.get('/search', issueController.searchIssues);
router.get('/', issueController.getIssues);
router.get('/unread-count', issueController.getUnreadCount);
router.patch('/:id/read', issueController.markIssueAsRead);
router.get('/:id', issueController.getIssueById);
router.patch('/:id/status', issueController.updateIssueStatus);
router.patch('/:id/priority', issueController.updateIssuePriority);
router.patch('/:id/reassign', issueController.reassignIssue);
router.post('/:id/upvote', issueController.upvoteIssue);
router.post('/:id/comments', issueController.addComment);
router.delete('/:id', issueController.deleteIssue);

module.exports = router;
