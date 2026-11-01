const db = require('../database/db');
const { fail } = require('../utils/http');

class AdminController {
  getStats(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getAdminStats() });
    } catch (err) { return fail(res, err, 'Gagal memuat statistik admin.'); }
  }

  getTeachers(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getTeachers() });
    } catch (err) { return fail(res, err, 'Gagal mengambil daftar guru.'); }
  }

  createTeacher(req, res) {
    try {
      const { name, email, nip, subject, password } = req.body || {};
      const created = db.createTeacher({ name, email, nip, subject, password });
      return res.status(201).json({
        success: true,
        message: `Akun Guru "${created.name}" berhasil dibuat.`,
        data: created
      });
    } catch (err) { return fail(res, err, 'Gagal membuat akun guru.'); }
  }

  toggleTeacherStatus(req, res) {
    try {
      const { status } = req.body || {};
      const updated = db.toggleTeacherStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ success: false, message: 'Akun guru tidak ditemukan.' });
      return res.status(200).json({
        success: true,
        message: `Status akun guru diperbarui menjadi ${status === 'active' ? 'Aktif' : 'Nonaktif'}.`,
        data: { id: updated.id, status: updated.status }
      });
    } catch (err) { return fail(res, err, 'Gagal memperbarui status akun guru.'); }
  }

  resetTeacherPassword(req, res) {
    try {
      if (!db.resetTeacherPassword(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Akun guru tidak ditemukan.' });
      }
      return res.status(200).json({ success: true, message: 'Kata sandi guru berhasil direset ke kata sandi bawaan sekolah.' });
    } catch (err) { return fail(res, err, 'Gagal mereset kata sandi.'); }
  }

  deleteTeacher(req, res) {
    try {
      if (!db.deleteTeacher(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Akun guru tidak ditemukan.' });
      }
      return res.status(200).json({ success: true, message: 'Akun guru beserta kelas, LKPD, dan tugasnya berhasil dihapus.' });
    } catch (err) { return fail(res, err, 'Gagal menghapus akun guru.'); }
  }
}

module.exports = new AdminController();
