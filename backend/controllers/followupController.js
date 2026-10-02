const db = require('../database/db');

class FollowupController {
  getFollowups(req, res) {
    try {
      if (req.user.role === 'teacher') {
        const list = db.getFollowups({ teacher_id: req.user.id });
        return res.status(200).json({ success: true, data: list });
      } else {
        const list = db.getFollowups({ student_id: req.user.id });
        return res.status(200).json({ success: true, data: list });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat tindak lanjut.' });
    }
  }

  createFollowup(req, res) {
    try {
      const { student_id, assignment_id, subject, topic, problem, recommendations } = req.body;
      if (!student_id || !topic) {
        return res.status(400).json({ success: false, message: 'Siswa dan topik penguatan wajib diisi.' });
      }

      const created = db.createFollowup({
        teacher_id: req.user.id,
        student_id,
        assignment_id: assignment_id || null,
        subject: subject || 'Kimia',
        topic,
        problem: problem || 'Perlu pendalaman materi',
        recommendations: recommendations || [
          'Buka materi penguatan',
          'Kerjakan latihan evaluasi',
          'Selesaikan refleksi mandiri'
        ]
      });

      return res.status(201).json({
        success: true,
        message: 'Tindak lanjut berhasil diterbitkan ke dashboard siswa.',
        data: created
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal membuat tindak lanjut.' });
    }
  }

  updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { progress } = req.body;

      const updated = db.updateFollowupProgress(id, progress);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Tindak lanjut tidak ditemukan.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Kemajuan tindak lanjut berhasil diperbarui.',
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memperbarui progres.' });
    }
  }
}

module.exports = new FollowupController();
