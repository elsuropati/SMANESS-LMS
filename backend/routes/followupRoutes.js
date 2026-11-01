const express = require('express');
const router = express.Router();
const followupController = require('../controllers/followupController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', followupController.getFollowups);
router.post('/', requireRole('teacher'), followupController.createFollowup);
router.patch('/:id/progress', requireRole('student'), followupController.updateProgress);

module.exports = router;
