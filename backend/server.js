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
const APP_VERSION = '1.1.0';

// Di belakang proxy (Render/Vercel/Netlify) agar req.ip & rate-limit memakai IP klien asli.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Header keamanan dasar.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});

// CORS: default hanya same-origin (frontend disajikan oleh server ini). Isi CORS_ORIGIN bila frontend di domain lain.
if (config.corsOrigin) {
  app.use(cors({ origin: config.corsOrigin.split(',').map(s => s.trim()), credentials: true }));
}
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

const db = require('./database/db');

// ---------------------------------------------------------------------------
// Sinkronisasi database cloud.
// Setiap request /api diproses SATU per SATU (antrian) supaya "pull -> ubah -> push" tidak saling
// menimpa antar-request (mis. guru menilai saat siswa menyimpan jawaban).
// ---------------------------------------------------------------------------
let queueTail = Promise.resolve();
function enqueue(req, res, next) {
  if (!db.hasCloud()) return next();
  let release;
  const gate = new Promise(r => { release = r; });
  const prev = queueTail;
  queueTail = prev.then(() => gate);
  let released = false;
  const done = () => { if (!released) { released = true; release(); } };
  res.on('finish', done);
  res.on('close', done);
  prev.then(() => next());
}

async function cloudSync(req, res, next) {
  if (!db.hasCloud()) return next();
  const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const stale = Date.now() - db.getLastPullTime() > 2500;
  try {
    if (isWrite || stale || !db.memoryData) await db.pullFromCloud();
  } catch (e) {
    console.error('Cloud pull error:', e.message);
    // Menulis di atas data basi bisa menimpa pekerjaan orang lain, jadi tolak. Membaca boleh pakai cache.
    if (isWrite || !db.memoryData) {
      return res.status(503).json({ success: false, message: 'Database sedang tidak dapat dihubungi. Coba lagi sebentar lagi.' });
    }
  }

  // Setelah handler menulis data, dorong ke cloud SEBELUM respons dikirim.
  const originalJson = res.json.bind(res);
  res.json = function (payload) {
    if (!db.isDirty()) return originalJson(payload);
    db.pushToCloud().then(
      () => originalJson(payload),
      (e) => {
        console.error('Cloud push error:', e.message);
        res.status(503);
        return originalJson({ success: false, message: 'Perubahan gagal disimpan ke database. Silakan ulangi.' });
      }
    );
    return res;
  };
  next();
}

app.use('/api', enqueue, cloudSync);

// Static frontend
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath, { index: 'index.html', maxAge: config.isProd ? '5m' : 0 }));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'AI CLASSROOM', version: APP_VERSION, time: new Date().toISOString() });
});

app.get('/api/system/info', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AI CLASSROOM',
    version: APP_VERSION,
    nodeEnv: config.nodeEnv,
    showDemoAccounts: config.showDemoAccounts,
    cloudDb: db.getCloudProviderName(),
    isCloudConnected: db.hasCloud(),
    persistent: db.isPersistent()
  });
});

// Single Page Application fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`=========================================`);
    console.log(`🚀 AI CLASSROOM Server is running!`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`⚙️  Environment: ${config.nodeEnv}`);
    console.log(`💾 Database: ${db.getCloudProviderName()}${db.isPersistent() ? '' : '  ⚠️ SEMENTARA — data hilang saat restart'}`);
    console.log(`🤖 Mock AI: ${config.mockAi}`);
    console.log(`=========================================`);
    if (config.isProd && !db.isPersistent()) {
      console.warn('⚠️  Produksi tanpa database persisten. Set MONGODB_URI atau UPSTASH_REDIS_REST_URL/TOKEN.');
    }
  });
}

module.exports = app;
