const db = require('../database/db');

class ReportController {
  getClassAnalytics(req, res) {
    try {
      const analytics = db.getClassAnalytics(req.user.id);
      return res.status(200).json({ success: true, data: analytics });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat analisis kelas.' });
    }
  }
}

module.exports = new ReportController();
