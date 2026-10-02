const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../database/db');

class AuthController {
  login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email dan password wajib diisi.'
        });
      }

      const user = db.findUserByEmail(email.trim());
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password yang Anda masukkan salah.'
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password yang Anda masukkan salah.'
        });
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          email: user.email
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // Safe user object (do NOT return password_hash)
      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        nip_or_nis: user.nip_or_nis,
        subject: user.subject || null,
        class_id: user.class_id || null,
        avatar: user.avatar
      };

      // Set HTTP-Only Cookie as backup
      res.cookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

      return res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        data: {
          token,
          user: safeUser
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memproses login. Silakan coba kembali.'
      });
    }
  }

  getMe(req, res) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil data profil.'
      });
    }
  }

  logout(req, res) {
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Berhasil logout.'
    });
  }
}

module.exports = new AuthController();
