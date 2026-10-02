const db = require('../database/db');

class DashboardController {
  getTeacherDashboard(req, res) {
    try {
      const stats = db.getTeacherStats(req.user.id);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      console.error('Teacher dashboard error:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memuat ringkasan dashboard guru.'
      });
    }
  }

  getStudentDashboard(req, res) {
    try {
      const stats = db.getStudentStats(req.user.id);
      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      console.error('Student dashboard error:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal memuat ringkasan dashboard siswa.'
      });
    }
  }
}

module.exports = new DashboardController();
