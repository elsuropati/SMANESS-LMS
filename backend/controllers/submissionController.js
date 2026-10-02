const db = require('../database/db');

class SubmissionController {
  getSubmissions(req, res) {
    try {
      const { assignment_id, class_id } = req.query;
      const submissions = db.getSubmissions({ assignment_id, class_id });
      return res.status(200).json({ success: true, data: submissions });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat pengumpulan tugas.' });
    }
  }

  saveStudentDraft(req, res) {
    try {
      const { assignment_id, answers } = req.body;
      if (!assignment_id) {
        return res.status(400).json({ success: false, message: 'ID tugas wajib disertakan.' });
      }

      const sub = db.saveStudentSubmission({
        assignment_id,
        student_id: req.user.id,
        status: 'draft',
        answers
      });

      return res.status(200).json({ success: true, message: 'Progres tersimpan otomatis.', data: sub });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan progres.' });
    }
  }

  submitAssignment(req, res) {
    try {
      const { assignment_id, answers } = req.body;
      if (!assignment_id) {
        return res.status(400).json({ success: false, message: 'ID tugas wajib disertakan.' });
      }

      const sub = db.saveStudentSubmission({
        assignment_id,
        student_id: req.user.id,
        status: 'submitted',
        answers
      });

      return res.status(200).json({ success: true, message: 'LKPD berhasil dikumpulkan ke guru!', data: sub });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengumpulkan LKPD.' });
    }
  }
}

module.exports = new SubmissionController();
