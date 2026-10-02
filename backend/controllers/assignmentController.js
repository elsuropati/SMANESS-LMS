const db = require('../database/db');

class AssignmentController {
  getAssignments(req, res) {
    try {
      if (req.user.role === 'teacher') {
        const list = db.getAssignments(req.user.id);
        return res.status(200).json({ success: true, data: list });
      } else {
        const list = db.getAssignmentsForStudent(req.user.id);
        return res.status(200).json({ success: true, data: list });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat tugas.' });
    }
  }

  createAssignment(req, res) {
    try {
      const { lkpd_id, class_id, title, due_date, instructions } = req.body;
      if (!lkpd_id || !class_id || !title || !due_date) {
        return res.status(400).json({ success: false, message: 'LKPD, Kelas, Judul, dan Batas Waktu wajib diisi.' });
      }

      const lkpd = db.getLkpdById(lkpd_id);
      const newAssign = db.createAssignment({
        lkpd_id,
        class_id,
        teacher_id: req.user.id,
        title,
        subject: lkpd ? lkpd.subject : 'Umum',
        start_date: new Date().toISOString(),
        due_date,
        instructions: instructions || 'Kerjakan tugas sesuai tahapan pada LKPD.'
      });

      return res.status(201).json({ success: true, message: 'Tugas berhasil diterbitkan ke kelas.', data: newAssign });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menerbitkan tugas.' });
    }
  }

  getAssignmentDetails(req, res) {
    try {
      const { id } = req.params;
      const data = db.read();
      const assignment = data.assignments.find(a => a.id === id);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan.' });
      }

      const lkpd = db.getLkpdById(assignment.lkpd_id);
      let submission = null;
      if (req.user.role === 'student') {
        submission = data.submissions.find(s => s.assignment_id === id && s.student_id === req.user.id);
      }

      return res.status(200).json({
        success: true,
        data: {
          assignment,
          lkpd,
          submission
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat detail tugas.' });
    }
  }
}

module.exports = new AssignmentController();
