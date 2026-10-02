const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', submissionController.getSubmissions);
router.post('/save-draft', requireRole('student'), submissionController.saveStudentDraft);
router.post('/submit', requireRole('student'), submissionController.submitAssignment);

module.exports = router;
