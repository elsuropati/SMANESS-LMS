const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/teacher', authenticateToken, requireRole('teacher'), dashboardController.getTeacherDashboard);
router.get('/student', authenticateToken, requireRole('student'), dashboardController.getStudentDashboard);

module.exports = router;
