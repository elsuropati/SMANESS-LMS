require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'ai_classroom_jwt_secret_dev_2026',
  jwtExpiresIn: '7d',
  mockAi: process.env.MOCK_AI === 'true',
  showDemoAccounts: false,
  showDemoAccounts: process.env.SHOW_DEMO_ACCOUNTS === 'true' || (process.env.SHOW_DEMO_ACCOUNTS !== 'false' && process.env.NODE_ENV !== 'production')
};
