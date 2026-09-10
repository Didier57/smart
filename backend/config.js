require('dotenv').config();

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'smart-app-secret-change-me',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '12h',
  PORT: process.env.PORT || process.env.APP_PORT || 3001,
  ODBC_CONNECTION_STRING: process.env.ODBC_CONNECTION_STRING || '',
  DEFAULT_ADMIN_USER: process.env.DEFAULT_ADMIN_USER || 'admin',
  DEFAULT_ADMIN_PASS: process.env.DEFAULT_ADMIN_PASS || 'admin123',
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || ''
};
