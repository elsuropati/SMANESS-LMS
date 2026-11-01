const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/export-excel', requireRole('teacher'), gradeController.exportGradesExcel);
router.get('/student-results', requireRole('student'), gradeController.getStudentResults);
router.post('/:submissionId', requireRole('teacher'), gradeController.submitGrade);

module.exports = router;
