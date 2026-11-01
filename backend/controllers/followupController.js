const db = require('../database/db');
const { fail } = require('../utils/http');

class FollowupController {
  getFollowups(req, res) {
    try {
      const list = req.user.role === 'student'
        ? db.getFollowupsForStudent(req.user.id)
        : db.getFollowupsForTeacher(req.user);
      return res.status(200).json({ success: true, data: list });
    } catch (err) { return fail(res, err, 'Gagal memuat tindak lanjut.'); }
  }

  createFollowup(req, res) {
    try {
      const { student_id, assignment_id, subject, topic, problem, recommendations } = req.body || {};
      const created = db.createFollowup(req.user, { student_id, assignment_id, subject, topic, problem, recommendations });
      return res.status(201).json({ success: true, message: 'Tindak lanjut berhasil diterbitkan ke dashboard siswa.', data: created });
    } catch (err) { return fail(res, err, 'Gagal membuat tindak lanjut.'); }
  }

  updateProgress(req, res) {
    try {
      const updated = db.updateFollowupProgress(req.user, req.params.id, (req.body || {}).progress);
      return res.status(200).json({ success: true, message: 'Kemajuan tindak lanjut berhasil diperbarui.', data: updated });
    } catch (err) { return fail(res, err, 'Gagal memperbarui progres.'); }
  }
}

module.exports = new FollowupController();
