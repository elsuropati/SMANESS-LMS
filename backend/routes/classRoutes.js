const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Teacher-only class management
router.get('/', requireRole('teacher'), classController.getClasses);
router.post('/', requireRole('teacher'), classController.createClass);
router.delete('/:classId', requireRole('teacher'), classController.deleteClass);
router.get('/:classId/students', requireRole('teacher'), classController.getStudents);
router.post('/:classId/students', requireRole('teacher'), classController.createStudent);
router.post('/:classId/students/import', requireRole('teacher'), classController.importStudents);
router.patch('/students/:studentId/status', requireRole('teacher'), classController.toggleStudentStatus);
router.post('/students/:studentId/reset-password', requireRole('teacher'), classController.resetStudentPassword);
router.delete('/students/:studentId', requireRole('teacher'), classController.deleteStudent);

module.exports = router;

