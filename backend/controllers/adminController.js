const db = require('../database/db');

class AdminController {
  getStats(req, res) {
    try {
      const stats = db.getAdminStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat statistik admin.' });
    }
  }

  getTeachers(req, res) {
    try {
      const teachers = db.getTeachers();
      return res.status(200).json({ success: true, data: teachers });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar guru.' });
    }
  }

  createTeacher(req, res) {
    try {
      const { name, email, nip, subject, password } = req.body;
      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Nama lengkap dan email guru wajib diisi.' });
      }

      const created = db.createTeacher({
        name,
        email,
        nip,
        subject,
        password: password || 'password123'
      });

      return res.status(201).json({
        success: true,
        message: `Akun Guru "${created.name}" berhasil dibuat dengan kata sandi bawaan "password123".`,
        data: created
      });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Gagal membuat akun guru.' });
    }
  }

  toggleTeacherStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = db.toggleTeacherStatus(id, status);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Akun guru tidak ditemukan.' });
      }

      return res.status(200).json({
        success: true,
        message: `Status akun guru diperbarui menjadi ${status === 'active' ? 'Aktif' : 'Nonaktif'}.`,
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memperbarui status akun guru.' });
    }
  }

  resetTeacherPassword(req, res) {
    try {
      const { id } = req.params;
      const success = db.resetTeacherPassword(id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Akun guru tidak ditemukan.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Kata sandi guru berhasil direset kembali ke "password123".'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mereset kata sandi.' });
    }
  }

  deleteTeacher(req, res) {
    try {
      const { id } = req.params;
      const deleted = db.deleteTeacher(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Akun guru tidak ditemukan.' });
      }
      return res.status(200).json({ success: true, message: 'Akun guru berhasil dihapus.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menghapus akun guru.' });
    }
  }
}


module.exports = new AdminController();
