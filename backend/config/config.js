require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const DEV_SECRET = 'ai_classroom_jwt_secret_dev_2026';

const jwtSecret = process.env.JWT_SECRET || DEV_SECRET;
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_SECRET || process.env.JWT_SECRET.length < 16)) {
  // Secret bawaan diketahui publik: siapa pun bisa memalsukan token admin. Jangan pernah jalan di production seperti itu.
  throw new Error('[CONFIG] JWT_SECRET wajib diisi (minimal 16 karakter, acak) saat NODE_ENV=production.');
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv,
  isProd,
  jwtSecret,
  jwtExpiresIn: '7d',
  mockAi: process.env.MOCK_AI === 'true',
  showDemoAccounts: process.env.SHOW_DEMO_ACCOUNTS === 'true',
  defaultPassword: process.env.DEFAULT_PASSWORD || 'password123',
  studentEmailDomain: process.env.STUDENT_EMAIL_DOMAIN || 'aiclassroom.sch.id',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@aiclassroom.sch.id').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  corsOrigin: process.env.CORS_ORIGIN || '',
  passingScore: Number(process.env.PASSING_SCORE) || 75
};
