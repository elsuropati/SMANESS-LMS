const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/teachers', adminController.getTeachers);
router.post('/teachers', adminController.createTeacher);
router.patch('/teachers/:id/status', adminController.toggleTeacherStatus);
router.post('/teachers/:id/reset-password', adminController.resetTeacherPassword);

module.exports = router;
