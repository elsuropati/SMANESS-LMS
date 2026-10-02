const db = require('../database/db');

class GradeController {
  submitGrade(req, res) {
    try {
      const { submissionId } = req.params;
      const { score, feedback, strengths, weaknesses, misconceptions } = req.body;

      if (score === undefined || score === null) {
        return res.status(400).json({ success: false, message: 'Nilai wajib diisi.' });
      }

      const updated = db.submitGrade(submissionId, {
        teacher_id: req.user.id,
        score,
        feedback: feedback || '',
        strengths: strengths || [],
        weaknesses: weaknesses || [],
        misconceptions: misconceptions || []
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Data pengumpulan tidak ditemukan.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Penilaian dan umpan balik berhasil disimpan!',
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan penilaian.' });
    }
  }

  getStudentResults(req, res) {
    try {
      const data = db.read();
      const studentSubs = data.submissions.filter(s => s.student_id === req.user.id && s.score !== null);
      const results = studentSubs.map(s => {
        const assign = data.assignments.find(a => a.id === s.assignment_id);
        return {
          ...s,
          assignmentTitle: assign ? assign.title : 'Tugas LKPD',
          subject: assign ? assign.subject : 'Kimia'
        };
      });

      return res.status(200).json({ success: true, data: results });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat hasil belajar.' });
    }
  }
}

module.exports = new GradeController();
