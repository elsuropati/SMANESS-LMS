const express = require('express');
const router = express.Router();
const lkpdController = require('../controllers/lkpdController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
// Siswa membuka LKPD lewat GET /api/assignments/:id (tanpa kunci jawaban), bukan dari sini.
router.use(requireRole('teacher'));

router.get('/', lkpdController.getLkpdList);
router.get('/:id', lkpdController.getLkpdById);
router.post('/', lkpdController.createLkpd);
router.put('/:id', lkpdController.updateLkpd);
router.post('/:id/duplicate', lkpdController.duplicateLkpd);
router.delete('/:id', lkpdController.deleteLkpd);

module.exports = router;
