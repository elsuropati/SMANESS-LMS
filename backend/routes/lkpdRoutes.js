const express = require('express');
const router = express.Router();
const lkpdController = require('../controllers/lkpdController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Teacher CRUD
router.get('/', requireRole('teacher'), lkpdController.getLkpdList);
router.get('/:id', lkpdController.getLkpdById); // Can be viewed by student when doing assignment
router.post('/', requireRole('teacher'), lkpdController.createLkpd);
router.put('/:id', requireRole('teacher'), lkpdController.updateLkpd);
router.post('/:id/duplicate', requireRole('teacher'), lkpdController.duplicateLkpd);
router.delete('/:id', requireRole('teacher'), lkpdController.deleteLkpd);

module.exports = router;

