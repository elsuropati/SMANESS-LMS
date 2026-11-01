const db = require('../database/db');
const { fail } = require('../utils/http');

class DashboardController {
  getTeacherDashboard(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getTeacherStats(req.user) });
    } catch (err) { return fail(res, err, 'Gagal memuat ringkasan dashboard guru.'); }
  }

  getStudentDashboard(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getStudentStats(req.user.id) });
    } catch (err) { return fail(res, err, 'Gagal memuat ringkasan dashboard siswa.'); }
  }
}

module.exports = new DashboardController();
