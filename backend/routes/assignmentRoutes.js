const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', requireRole(['teacher', 'student', 'admin']), assignmentController.getAssignments);
router.get('/:id', requireRole(['teacher', 'student', 'admin']), assignmentController.getAssignmentDetails);
router.post('/', requireRole('teacher'), assignmentController.createAssignment);
router.put('/:id', requireRole('teacher'), assignmentController.updateAssignment);
router.delete('/:id', requireRole('teacher'), assignmentController.deleteAssignment);

module.exports = router;
