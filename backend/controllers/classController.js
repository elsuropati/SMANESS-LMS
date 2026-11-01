const db = require('../database/db');
const { fail, notFound } = require('../utils/http');

// Memastikan siswa ada dan berada di kelas milik pengguna.
function ownStudent(req) {
  const student = db.findStudent(req.params.studentId);
  if (!student) throw notFound('Siswa tidak ditemukan.');
  db.assertClassAccess(req.user, student.class_id);
  return student;
}

class ClassController {
  getClasses(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getClasses(req.user) });
    } catch (err) { return fail(res, err, 'Gagal mengambil daftar kelas.'); }
  }

  createClass(req, res) {
    try {
      const { name, subject, academic_year, description } = req.body || {};
      const created = db.createClass(req.user, { name, subject, academic_year, description });
      return res.status(201).json({ success: true, message: 'Kelas berhasil dibuat.', data: created });
    } catch (err) { return fail(res, err, 'Gagal membuat kelas.'); }
  }

  getStudents(req, res) {
    try {
      db.assertClassAccess(req.user, req.params.classId);
      return res.status(200).json({ success: true, data: db.getStudentsByClass(req.params.classId) });
    } catch (err) { return fail(res, err, 'Gagal mengambil daftar siswa.'); }
  }

  createStudent(req, res) {
    try {
      db.assertClassAccess(req.user, req.params.classId);
      const { name, nis, email } = req.body || {};
      const student = db.createStudent({ class_id: req.params.classId, name, nis, email });
      return res.status(201).json({ success: true, message: 'Siswa berhasil ditambahkan.', data: student });
    } catch (err) { return fail(res, err, 'Gagal menambahkan siswa.'); }
  }

  importStudents(req, res) {
    try {
      db.assertClassAccess(req.user, req.params.classId);
      const { students } = req.body || {};
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ success: false, message: 'Data siswa tidak valid atau kosong.' });
      }
      if (students.length > 500) {
        return res.status(400).json({ success: false, message: 'Maksimal 500 siswa per impor.' });
      }
      const { imported, skipped } = db.importStudents(students, req.params.classId);
      const note = skipped.length ? ` ${skipped.length} baris dilewati (NIS/email sudah terdaftar atau data tidak lengkap).` : '';
      return res.status(200).json({
        success: true,
        message: `Berhasil mengimpor ${imported.length} siswa ke kelas.${note}`,
        data: imported,
        skipped
      });
    } catch (err) { return fail(res, err, 'Gagal mengimpor siswa.'); }
  }

  toggleStudentStatus(req, res) {
    try {
      const student = ownStudent(req);
      const updated = db.updateStudentStatus(student.id, (req.body || {}).status);
      return res.status(200).json({ success: true, message: 'Status siswa diperbarui.', data: updated });
    } catch (err) { return fail(res, err, 'Gagal memperbarui status siswa.'); }
  }

  resetStudentPassword(req, res) {
    try {
      const student = ownStudent(req);
      db.resetStudentPassword(student.id);
      return res.status(200).json({ success: true, message: 'Kata sandi siswa berhasil direset ke kata sandi bawaan sekolah.' });
    } catch (err) { return fail(res, err, 'Gagal mereset kata sandi.'); }
  }

  deleteStudent(req, res) {
    try {
      const student = ownStudent(req);
      db.deleteStudent(student.id);
      return res.status(200).json({ success: true, message: 'Data siswa berhasil dihapus.' });
    } catch (err) { return fail(res, err, 'Gagal menghapus data siswa.'); }
  }

  deleteClass(req, res) {
    try {
      db.assertClassAccess(req.user, req.params.classId);
      db.deleteClass(req.params.classId);
      return res.status(200).json({ success: true, message: 'Kelas beserta siswa, tugas, dan nilainya berhasil dihapus.' });
    } catch (err) { return fail(res, err, 'Gagal menghapus kelas.'); }
  }
}

module.exports = new ClassController();
