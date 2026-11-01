const db = require('../database/db');
const { fail } = require('../utils/http');

class ReportController {
  getClassAnalytics(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getClassAnalytics(req.user) });
    } catch (err) { return fail(res, err, 'Gagal memuat analisis kelas.'); }
  }
}

module.exports = new ReportController();
