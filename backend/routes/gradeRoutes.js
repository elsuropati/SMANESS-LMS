const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/:submissionId', requireRole('teacher'), gradeController.submitGrade);
router.get('/student-results', requireRole('student'), gradeController.getStudentResults);

module.exports = router;
