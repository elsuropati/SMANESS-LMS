const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const classRoutes = require('./routes/classRoutes');
const lkpdRoutes = require('./routes/lkpdRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const followupRoutes = require('./routes/followupRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sync with Cloud Database (if configured via env)
const db = require('./database/db');

// Pull dari cloud hanya 1x saat cold start (memoryData masih kosong)
// Setelah itu, data tersimpan di memory dan push ke cloud tiap ada perubahan
let cloudInitialized = false;
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && db.hasCloud() && !cloudInitialized) {
    try {
      await db.pullFromCloud();
      cloudInitialized = true;
    } catch (e) {
      console.error('Cloud pull error:', e.message);
    }
  }

  // Intercept res.json: setelah tiap write, push perubahan ke cloud
  if (req.path.startsWith('/api') && db.hasCloud()) {
    const originalJson = res.json.bind(res);
    res.json = async function (data) {
      if (db.isDirty() && db.hasCloud()) {
        try {
          await db.pushToCloud();
        } catch (e) {
          console.error('Cloud push error:', e.message);
        }
      }
      return originalJson(data);
    };
  }
  next();
});

// Static frontend
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/lkpd', lkpdRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check & System info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AI CLASSROOM',
    version: '1.0.1',
    time: new Date().toISOString()
  });
});

app.get('/api/system/info', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AI CLASSROOM',
    version: '1.0.1',
    nodeEnv: config.nodeEnv,
    showDemoAccounts: config.showDemoAccounts,
    cloudDb: db.getCloudProviderName(),
    isCloudConnected: db.hasCloud()
  });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`=========================================`);
    console.log(`🚀 AI CLASSROOM Server is running!`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`⚙️  Environment: ${config.nodeEnv}`);
    console.log(`🤖 Mock AI: ${config.mockAi}`);
    console.log(`⚡ Show Demo Buttons: ${config.showDemoAccounts}`);
    console.log(`=========================================`);
  });
}

module.exports = app;
