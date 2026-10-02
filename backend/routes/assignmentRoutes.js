const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', assignmentController.getAssignments);
router.get('/:id', assignmentController.getAssignmentDetails);
router.post('/', requireRole('teacher'), assignmentController.createAssignment);

module.exports = router;
