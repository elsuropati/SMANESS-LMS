const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../database/db');
const { fail } = require('../utils/http');

class AuthController {
  login(req, res) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
      }

      const user = db.findUserByEmail(String(email).trim());
      const valid = user && bcrypt.compareSync(String(password), user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Email atau password yang Anda masukkan salah.' });
      }
      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan. Hubungi administrator atau guru Anda.' });
      }

      const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

      res.cookie('token', token, {
        httpOnly: true,
        secure: config.isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

      return res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        data: { token, user: db.publicUser(user) }
      });
    } catch (err) {
      return fail(res, err, 'Gagal memproses login. Silakan coba kembali.');
    }
  }

  getMe(req, res) {
    return res.status(200).json({ success: true, data: { user: req.user } });
  }

  changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body || {};
      db.changePassword(req.user.id, current_password, new_password);
      return res.status(200).json({ success: true, message: 'Kata sandi berhasil diubah.' });
    } catch (err) {
      return fail(res, err, 'Gagal mengubah kata sandi.');
    }
  }

  logout(req, res) {
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: 'Berhasil logout.' });
  }
}

module.exports = new AuthController();
