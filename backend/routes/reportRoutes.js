const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.get('/class-analytics', requireRole('teacher'), reportController.getClassAnalytics);

module.exports = router;
