const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../database/db');

function authenticateToken(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Token autentikasi tidak ditemukan.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak ditemukan atau sesi telah kadaluwarsa.'
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      nip_or_nis: user.nip_or_nis,
      class_id: user.class_id || null,
      subject: user.subject || null,
      avatar: user.avatar
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid atau telah kadaluwarsa. Silakan login kembali.'
    });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Harap login terlebih dahulu.'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Fitur ini khusus untuk peran: ${roles.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
