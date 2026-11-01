const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', requireRole(['teacher', 'student', 'admin']), submissionController.getSubmissions);
router.post('/save-draft', requireRole('student'), submissionController.saveStudentDraft);
router.post('/submit', requireRole('student'), submissionController.submitAssignment);
router.get('/:id', requireRole(['teacher', 'student', 'admin']), submissionController.getSubmissionDetail);
router.post('/:id/return', requireRole('teacher'), submissionController.returnSubmission);

module.exports = router;
