const db = require('../database/db');
const { fail } = require('../utils/http');

class SubmissionController {
  getSubmissions(req, res) {
    try {
      const { assignment_id, class_id, status } = req.query;
      const list = req.user.role === 'student'
        ? db.getSubmissionsForStudent(req.user.id)
        : db.getSubmissionsForTeacher(req.user, { assignment_id, class_id, status });
      return res.status(200).json({ success: true, data: list });
    } catch (err) { return fail(res, err, 'Gagal memuat pengumpulan tugas.'); }
  }

  getSubmissionDetail(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getSubmissionDetail(req.user, req.params.id) });
    } catch (err) { return fail(res, err, 'Gagal memuat lembar jawaban.'); }
  }

  saveStudentDraft(req, res) {
    try {
      const { assignment_id, answers } = req.body || {};
      if (!assignment_id) return res.status(400).json({ success: false, message: 'ID tugas wajib disertakan.' });
      const sub = db.saveStudentSubmission(req.user, assignment_id, answers, false);
      return res.status(200).json({ success: true, message: 'Progres tersimpan.', data: { id: sub.id, status: sub.status, updated_at: sub.updated_at } });
    } catch (err) { return fail(res, err, 'Gagal menyimpan progres.'); }
  }

  submitAssignment(req, res) {
    try {
      const { assignment_id, answers } = req.body || {};
      if (!assignment_id) return res.status(400).json({ success: false, message: 'ID tugas wajib disertakan.' });
      const sub = db.saveStudentSubmission(req.user, assignment_id, answers, true);
      return res.status(200).json({
        success: true,
        message: sub.is_late ? 'LKPD dikumpulkan (terlambat dari batas waktu).' : 'LKPD berhasil dikumpulkan ke guru!',
        data: { id: sub.id, status: sub.status, submitted_at: sub.submitted_at, is_late: sub.is_late }
      });
    } catch (err) { return fail(res, err, 'Gagal mengumpulkan LKPD.'); }
  }

  returnSubmission(req, res) {
    try {
      const sub = db.returnSubmission(req.user, req.params.id, (req.body || {}).note);
      return res.status(200).json({ success: true, message: 'Tugas dikembalikan ke siswa untuk direvisi.', data: { id: sub.id, status: sub.status } });
    } catch (err) { return fail(res, err, 'Gagal mengembalikan tugas.'); }
  }
}

module.exports = new SubmissionController();
