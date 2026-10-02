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

  exportGradesExcel(req, res) {
    try {
      const data = db.read();
      const teacherClasses = data.classes.filter(c => c.teacher_id === req.user.id);
      const teacherClassIds = teacherClasses.map(c => c.id);
      
      const teacherAssignments = data.assignments.filter(a => a.teacher_id === req.user.id);
      const teacherAssignIds = teacherAssignments.map(a => a.id);

      const submissions = data.submissions.filter(s => teacherAssignIds.includes(s.assignment_id));

      // Build CSV with UTF-8 BOM so Microsoft Excel opens it cleanly
      const BOM = '\uFEFF';
      let csvContent = BOM;
      
      // Header Informasi Sekolah
      csvContent += `"AI CLASSROOM — REKAPITULASI NILAI SISWA"\n`;
      csvContent += `"Guru Pengampu:","${req.user.name}"\n`;
      csvContent += `"Mata Pelajaran:","${req.user.subject || 'Kimia'}"\n`;
      csvContent += `"Tanggal Unduh:","${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"\n\n`;

      // Header Kolom Tabel
      csvContent += `"No","NIS","Nama Siswa","Kelas","Judul LKPD / Tugas","Waktu Pengumpulan","Nilai (0-100)","Status Ketuntasan","Catatan Umpan Balik Guru"\n`;

      let no = 1;
      for (const sub of submissions) {
        const assign = teacherAssignments.find(a => a.id === sub.assignment_id);
        const userStd = data.users.find(u => u.id === sub.student_id);
        const cls = userStd && userStd.class_id ? teacherClasses.find(c => c.id === userStd.class_id) : null;
        
        const className = cls ? cls.name : (assign ? assign.class_name : 'X-1');
        const nis = sub.student_nis || (userStd ? userStd.nip_or_nis : '-');
        const studentName = sub.student_name || (userStd ? userStd.name : 'Siswa');
        const assignTitle = assign ? assign.title : 'Tugas LKPD';
        const submitTime = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('id-ID') : 'Belum Submit';
        const score = sub.score !== null ? sub.score : 'Belum Dinilai';
        
        let status = 'Belum Dinilai';
        if (sub.score !== null) {
          status = sub.score >= 75 ? 'TUNTAS (KKM 75)' : 'REMEDIAL';
        }

        const feedback = (sub.feedback || '').replace(/"/g, '""');

        csvContent += `"${no}","${nis}","${studentName}","${className}","${assignTitle}","${submitTime}","${score}","${status}","${feedback}"\n`;
        no++;
      }

      // If no submissions
      if (submissions.length === 0) {
        csvContent += `"1","-","Belum ada data nilai pengumpulan","-","-","-","-","-","-"\n`;
      }

      const fileName = `Rekap_Nilai_Siswa_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error('Export error:', err);
      return res.status(500).json({ success: false, message: 'Gagal mengekspor data nilai ke Excel/CSV.' });
    }
  }
}

module.exports = new GradeController();
