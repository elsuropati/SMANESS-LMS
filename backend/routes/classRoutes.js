const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireRole(['teacher', 'admin']));

router.get('/', classController.getClasses);
router.post('/', requireRole('teacher'), classController.createClass);

// Rute /students/... HARUS di atas /:classId agar tidak bentrok
router.patch('/students/:studentId/status', classController.toggleStudentStatus);
router.post('/students/:studentId/reset-password', classController.resetStudentPassword);
router.delete('/students/:studentId', classController.deleteStudent);

router.get('/:classId/students', classController.getStudents);
router.post('/:classId/students', classController.createStudent);
router.post('/:classId/students/import', classController.importStudents);
router.delete('/:classId', classController.deleteClass);

module.exports = router;
