const db = require('../database/db');

class ClassController {
  getClasses(req, res) {
    try {
      const classes = db.getClasses(req.user.id);
      return res.status(200).json({ success: true, data: classes });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar kelas.' });
    }
  }

  createClass(req, res) {
    try {
      const { name, subject, academic_year, description } = req.body;
      if (!name || !subject) {
        return res.status(400).json({ success: false, message: 'Nama kelas dan mata pelajaran wajib diisi.' });
      }

      const newClass = db.createClass({
        teacher_id: req.user.id,
        name,
        subject,
        academic_year: academic_year || '2026/2027',
        description: description || ''
      });

      return res.status(201).json({ success: true, message: 'Kelas berhasil dibuat.', data: newClass });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal membuat kelas.' });
    }
  }

  getStudents(req, res) {
    try {
      const { classId } = req.params;
      const students = db.getStudentsByClass(classId);
      return res.status(200).json({ success: true, data: students });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar siswa.' });
    }
  }

  createStudent(req, res) {
    try {
      const { classId } = req.params;
      const { name, nis, email } = req.body;

      if (!name || !nis) {
        return res.status(400).json({ success: false, message: 'Nama siswa dan NIS wajib diisi.' });
      }

      const student = db.createStudent({
        class_id: classId,
        name,
        nis,
        email
      });

      return res.status(201).json({ success: true, message: 'Siswa berhasil ditambahkan.', data: student });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menambahkan siswa.' });
    }
  }

  importStudents(req, res) {
    try {
      const { classId } = req.params;
      const { students } = req.body;

      if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ success: false, message: 'Data siswa tidak valid atau kosong.' });
      }

      const imported = db.importStudents(students, classId);
      return res.status(200).json({
        success: true,
        message: `Berhasil mengimpor ${imported.length} siswa ke kelas.`,
        data: imported
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengimpor siswa.' });
    }
  }

  toggleStudentStatus(req, res) {
    try {
      const { studentId } = req.params;
      const { status } = req.body;
      const updated = db.updateStudent(studentId, { status });
      return res.status(200).json({ success: true, message: 'Status siswa diperbarui.', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memperbarui status siswa.' });
    }
  }

  resetStudentPassword(req, res) {
    try {
      const { studentId } = req.params;
      const success = db.resetStudentPassword(studentId);
      if (success) {
        return res.status(200).json({ success: true, message: 'Kata sandi siswa berhasil direset ke bawaan (password123).' });
      }
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mereset kata sandi.' });
    }
  }
}

module.exports = new ClassController();
