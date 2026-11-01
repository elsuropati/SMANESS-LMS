const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Konfigurasi & uji koneksi boleh untuk guru dan admin; fitur pedagogis khusus guru.
router.post('/test', requireRole(['teacher', 'admin']), aiController.testConnection);
router.post('/models', requireRole(['teacher', 'admin']), aiController.listModels);
router.get('/config', requireRole(['teacher', 'admin']), aiController.getConfig);
router.post('/config', requireRole(['teacher', 'admin']), aiController.saveConfig);
router.post('/generate-lkpd', requireRole('teacher'), aiController.generateLkpd);
router.post('/evaluate', requireRole('teacher'), aiController.evaluateSubmission);
router.post('/chat', requireRole('teacher'), aiController.chat);

module.exports = router;
