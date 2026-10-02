const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/test', requireRole('teacher'), aiController.testConnection);
router.post('/models', requireRole('teacher'), aiController.listModels);
router.post('/generate-lkpd', requireRole('teacher'), aiController.generateLkpd);
router.post('/evaluate', requireRole('teacher'), aiController.evaluateSubmission);
router.post('/chat', requireRole('teacher'), aiController.chat);
router.get('/config', requireRole('teacher'), aiController.getConfig);
router.post('/config', requireRole('teacher'), aiController.saveConfig);

module.exports = router;
