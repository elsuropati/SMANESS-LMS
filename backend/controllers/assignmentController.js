const db = require('../database/db');
const { fail } = require('../utils/http');
const { stripAnswerKey } = require('../utils/lkpd');

class AssignmentController {
  getAssignments(req, res) {
    try {
      const list = req.user.role === 'student'
        ? db.getAssignmentsForStudent(req.user.id)
        : db.getAssignmentsForTeacher(req.user);
      return res.status(200).json({ success: true, data: list });
    } catch (err) { return fail(res, err, 'Gagal memuat tugas.'); }
  }

  createAssignment(req, res) {
    try {
      const { lkpd_id, class_id, title, due_date, instructions } = req.body || {};
      const created = db.createAssignment(req.user, { lkpd_id, class_id, title, due_date, instructions });
      return res.status(201).json({ success: true, message: 'Tugas berhasil diterbitkan ke kelas.', data: created });
    } catch (err) { return fail(res, err, 'Gagal menerbitkan tugas.'); }
  }

  updateAssignment(req, res) {
    try {
      const updated = db.updateAssignment(req.user, req.params.id, req.body || {});
      return res.status(200).json({ success: true, message: 'Tugas berhasil diperbarui.', data: updated });
    } catch (err) { return fail(res, err, 'Gagal memperbarui tugas.'); }
  }

  deleteAssignment(req, res) {
    try {
      db.deleteAssignment(req.user, req.params.id);
      return res.status(200).json({ success: true, message: 'Tugas dan seluruh pengumpulannya berhasil dihapus.' });
    } catch (err) { return fail(res, err, 'Gagal menghapus tugas.'); }
  }

  // Detail tugas + LKPD. Siswa mendapat LKPD tanpa kunci jawaban serta lembar jawabannya sendiri.
  getAssignmentDetails(req, res) {
    try {
      const assignment = db.assertAssignmentAccess(req.user, req.params.id);
      const lkpd = db.getLkpdById(assignment.lkpd_id);
      if (!lkpd) return res.status(404).json({ success: false, message: 'LKPD untuk tugas ini sudah dihapus.' });

      if (req.user.role !== 'student') {
        return res.status(200).json({ success: true, data: { assignment, lkpd, submission: null } });
      }

      const data = db.read();
      const sub = data.submissions.find(s => s.assignment_id === assignment.id && s.student_id === req.user.id) || null;
      const classInfo = data.classes.find(c => c.id === assignment.class_id);
      const done = sub && (sub.status === 'submitted' || sub.status === 'graded');
      return res.status(200).json({
        success: true,
        data: {
          assignment: { ...assignment, class_name: classInfo ? classInfo.name : assignment.class_name, is_overdue: !done && new Date(assignment.due_date) < new Date() },
          lkpd: stripAnswerKey(lkpd),
          submission: sub ? {
            id: sub.id,
            status: sub.status,
            answers: sub.answers || {},
            score: sub.status === 'graded' ? sub.score : null,
            feedback: sub.status === 'graded' ? sub.feedback : null,
            submitted_at: sub.submitted_at,
            graded_at: sub.graded_at,
            revision_note: sub.revision_note || null
          } : null
        }
      });
    } catch (err) { return fail(res, err, 'Gagal memuat detail tugas.'); }
  }
}

module.exports = new AssignmentController();
