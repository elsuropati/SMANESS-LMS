const db = require('../database/db');
const { fail } = require('../utils/http');

// Mencegah CSV/Excel injection: sel yang diawali = + - @ diperlakukan sebagai teks.
function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

class GradeController {
  submitGrade(req, res) {
    try {
      const { score, feedback, strengths, weaknesses, misconceptions } = req.body || {};
      const updated = db.submitGrade(req.user, req.params.submissionId, { score, feedback, strengths, weaknesses, misconceptions });
      return res.status(200).json({
        success: true,
        message: 'Penilaian dan umpan balik berhasil disimpan!',
        data: { id: updated.id, status: updated.status, score: updated.score }
      });
    } catch (err) { return fail(res, err, 'Gagal menyimpan penilaian.'); }
  }

  getStudentResults(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getStudentResults(req.user.id) });
    } catch (err) { return fail(res, err, 'Gagal memuat hasil belajar.'); }
  }

  exportGradesExcel(req, res) {
    try {
      const { class_id } = req.query;
      let selectedClass = null;
      if (class_id) selectedClass = db.assertClassAccess(req.user, class_id);

      const submissions = db.getSubmissionsForTeacher(req.user, { class_id: class_id || undefined });
      const kkm = db.PASSING_SCORE;

      const rows = [];
      rows.push([`AI CLASSROOM — REKAPITULASI NILAI SISWA`]);
      rows.push(['Guru Pengampu:', req.user.name]);
      rows.push(['Mata Pelajaran:', req.user.subject || '-']);
      rows.push(['Filter Kelas:', selectedClass ? `${selectedClass.name} (${selectedClass.subject || ''})` : 'Semua Kelas']);
      rows.push(['Tanggal Unduh:', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })]);
      rows.push([]);
      rows.push(['No', 'NIS', 'Nama Siswa', 'Kelas', 'Judul LKPD / Tugas', 'Waktu Pengumpulan', 'Terlambat', 'Nilai (0-100)', 'Status Ketuntasan', 'Catatan Umpan Balik Guru']);

      let no = 1;
      for (const sub of submissions) {
        const graded = sub.status === 'graded' && sub.score !== null;
        rows.push([
          no++,
          sub.student_nis || '-',
          sub.student_name || 'Siswa',
          sub.class_name || '-',
          sub.assignment_title || 'Tugas LKPD',
          sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-',
          sub.is_late ? 'Ya' : 'Tidak',
          graded ? sub.score : 'Belum Dinilai',
          graded ? (sub.score >= kkm ? `TUNTAS (KKM ${kkm})` : 'REMEDIAL') : 'Belum Dinilai',
          sub.feedback || ''
        ]);
      }
      if (submissions.length === 0) rows.push(['', '', 'Belum ada data pengumpulan untuk filter ini']);

      const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
      const prefix = selectedClass ? `Kelas_${selectedClass.name.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Semua_Kelas';
      const fileName = `Rekap_Nilai_${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(csv);
    } catch (err) { return fail(res, err, 'Gagal mengekspor data nilai.'); }
  }
}

module.exports = new GradeController();
