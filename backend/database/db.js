const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cloudAdapter = require('./cloudAdapter');

const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
const DB_PATH = isServerless 
  ? path.join('/tmp', 'classroom_data.json') 
  : path.join(__dirname, 'data.json');

// Default initial dataset
const INITIAL_DATA = {
  users: [
    {
      id: 'usr-admin-1',
      name: 'Administrator Sekolah',
      email: 'admin@aiclassroom.sch.id',
      password_hash: '$2a$10$l3LWVM9g6bSD.29uqLDpD.RpRCZPDlIdd8CYMMfvvNOWM9q/62j2.', // password123
      role: 'admin',
      nip_or_nis: '197901012005011001',
      subject: 'Administrator',
      avatar: 'AD',
      status: 'active',
      created_at: '2026-09-01T07:00:00Z'
    },
    {
      id: 'usr-teacher-1',
      name: 'Budi Santoso, S.Pd.',
      email: 'guru@aiclassroom.sch.id',
      password_hash: '$2a$10$l3LWVM9g6bSD.29uqLDpD.RpRCZPDlIdd8CYMMfvvNOWM9q/62j2.', // password123
      role: 'teacher',
      nip_or_nis: '198507122010011005',
      subject: 'Kimia',
      avatar: 'BS',
      created_at: '2026-09-01T08:00:00Z'
    },
    {
      id: 'usr-student-1',
      name: 'Ahmad Fauzi',
      email: 'siswa@aiclassroom.sch.id',
      password_hash: '$2a$10$l3LWVM9g6bSD.29uqLDpD.RpRCZPDlIdd8CYMMfvvNOWM9q/62j2.', // password123
      role: 'student',
      nip_or_nis: '10241',
      class_id: 'cls-x1',
      avatar: 'AF',
      created_at: '2026-09-02T08:00:00Z'
    },
    {
      id: 'usr-student-2',
      name: 'Siti Nurhaliza',
      email: 'siti@aiclassroom.sch.id',
      password_hash: '$2a$10$l3LWVM9g6bSD.29uqLDpD.RpRCZPDlIdd8CYMMfvvNOWM9q/62j2.', // password123
      role: 'student',
      nip_or_nis: '10242',
      class_id: 'cls-x1',
      avatar: 'SN',
      created_at: '2026-09-02T08:00:00Z'
    }
  ],
  classes: [
    {
      id: 'cls-x1',
      teacher_id: 'usr-teacher-1',
      name: 'X-1',
      subject: 'Kimia',
      academic_year: '2026/2027',
      description: 'Kelas Kimia Dasar & Terapan Fase E SMA',
      status: 'active',
      student_count: 2,
      created_at: '2026-09-01T08:30:00Z'
    }
  ],
  students: [
    {
      id: 'std-1',
      user_id: 'usr-student-1',
      class_id: 'cls-x1',
      nis: '10241',
      name: 'Ahmad Fauzi',
      email: 'siswa@aiclassroom.sch.id',
      status: 'active',
      progress: 65,
      created_at: '2026-09-02T08:00:00Z'
    },
    {
      id: 'std-2',
      user_id: 'usr-student-2',
      class_id: 'cls-x1',
      nis: '10242',
      name: 'Siti Nurhaliza',
      email: 'siti@aiclassroom.sch.id',
      status: 'active',
      progress: 95,
      created_at: '2026-09-02T08:00:00Z'
    }
  ],
  lkpd: [
    {
      id: 'lkpd-1',
      teacher_id: 'usr-teacher-1',
      title: 'Prinsip Kimia Hijau dalam Kehidupan Sehari-hari',
      subject: 'Kimia',
      grade: 'X',
      status: 'published',
      objectives: [
        'Mengidentifikasi 12 prinsip kimia hijau dalam kehidupan sehari-hari',
        'Menganalisis dampak reaksi kimia konvensional terhadap lingkungan',
        'Merancang solusi alternatif sintesis ramah lingkungan'
      ],
      trigger_questions: 'Mengapa industri modern kini beralih dari pelarut organik ke pelarut air?',
      instructions: 'Ikuti 6 langkah pengerjaan berurutan. Simpan kemajuan Anda secara berkala.',
      material_text: 'Kimia Hijau (Green Chemistry) adalah pendekatan kimia yang bertujuan merancang produk dan proses yang meminimalkan penggunaan serta pembentukan zat-zat berbahaya.',
      material_links: [
        { title: 'Modul Kimia Hijau Kemendikbud', url: 'https://repositori.kemdikbud.go.id', type: 'PDF' },
        { title: 'Simulasi Reaksi Ramah Lingkungan', url: 'https://phet.colorado.edu', type: 'Lab Maya' }
      ],
      activities: [
        {
          id: 'act-1',
          title: 'Aktivitas 1: Eksplorasi Pelarut Ramah Lingkungan',
          instructions: 'Bandingkan dampak penggunaan pelarut air vs pelarut benzena pada proses sintesis.'
        },
        {
          id: 'act-2',
          title: 'Aktivitas 2: Analisis Atom Economy',
          instructions: 'Hitung persentase efisiensi atom dari pembentukan aspirin.'
        }
      ],
      questions: [
        {
          id: 'q-1',
          type: 'mc',
          prompt: 'Prinsip ke-5 kimia hijau menekankan pada penggunaan:',
          options: ['Pelarut dan kondisi reaksi yang lebih aman', 'Pestisida sintetis', 'Suhu dan tekanan ekstrem', 'Katalis berbasis logam berat'],
          answer_key: 0
        },
        {
          id: 'q-2',
          type: 'essay',
          prompt: 'Jelaskan mengapa pencegahan limbah jauh lebih utama dibanding penanganan limbah setelah terbentuk!',
          rubric: 'Menjelaskan aspek ekonomi, keselamatan ekosistem, dan entropi energi.'
        }
      ],
      reflection_prompts: [
        'Bagian materi mana yang paling relevan dengan aktivitas harian Anda?',
        'Tantangan apa yang Anda hadapi saat mengerjakan LKPD ini?'
      ],
      created_at: '2026-09-10T10:00:00Z'
    }
  ],
  assignments: [
    {
      id: 'asg-1',
      lkpd_id: 'lkpd-1',
      class_id: 'cls-x1',
      teacher_id: 'usr-teacher-1',
      title: 'LKPD 1: Eksplorasi Kimia Hijau',
      subject: 'Kimia',
      class_name: 'X-1',
      start_date: '2026-10-01T08:00:00Z',
      due_date: '2026-10-12T23:59:00Z',
      instructions: 'Kerjakan seluruh 6 tahapan navigasi LKPD secara bertahap. Pastikan refleksi diisi sebelum submit.',
      status: 'active',
      created_at: '2026-10-01T08:00:00Z'
    }
  ],
  submissions: [
    {
      id: 'sub-1',
      assignment_id: 'asg-1',
      student_id: 'usr-student-1',
      student_name: 'Ahmad Fauzi',
      student_nis: '10241',
      status: 'submitted', // Belum dinilai guru
      submitted_at: '2026-10-02T07:45:00Z',
      answers: {
        identity: { nama: 'Ahmad Fauzi', nis: '10241', kelas: 'X-1' },
        activity1: 'Analisis pelarut air: Pelarut air tidak beracun dan mudah diolah kembali, sedangkan benzena bersifat karsinogenik.',
        activity2: 'Atom economy reaksi sintesis ester mencapai 83.5%, menghasilkan limbah minimal.',
        q1: 0,
        q2: 'Pencegahan limbah lebih murah dan menghindari akumulasi racun di rantai makanan. Mengolah limbah yang terlanjur terbentuk membutuhkan energi dan biaya ekstra.',
        reflection: 'Saya memahami konsep pencegahan limbah namun masih ragu cara menghitung efisiensi atom reaksi kompleks.'
      },
      score: null,
      feedback: null,
      graded_at: null
    },
    {
      id: 'sub-2',
      assignment_id: 'asg-1',
      student_id: 'usr-student-2',
      student_name: 'Siti Nurhaliza',
      student_nis: '10242',
      status: 'graded',
      submitted_at: '2026-10-01T15:20:00Z',
      answers: {
        identity: { nama: 'Siti Nurhaliza', nis: '10242', kelas: 'X-1' },
        activity1: 'Desain degradasi bioplastik dengan katalis asam sitrat alami.',
        activity2: 'Perhitungan efisiensi atom 91.2%.',
        q1: 0,
        q2: 'Limbah yang dicegah tidak menimbulkan beban bagi biosfer dan tidak membutuhkan instalasi pengolahan air limbah (IPAL) berbiaya tinggi.',
        reflection: 'Pembelajaran sangat jelas dan aplikatif dalam kehidupan sehari-hari.'
      },
      score: 94,
      strengths: ['Analisis komprehensif', 'Perhitungan stoikiometri sangat akurat'],
      weaknesses: ['Penjelasan grafik dampak lingkungan dapat diperdalam'],
      feedback: 'Luar biasa! Analisis bioplastik sangat komprehensif disertai perhitungan stoikiometri yang tepat.',
      graded_at: '2026-10-01T18:00:00Z'
    }
  ],
  followups: [
    {
      id: 'flw-1',
      student_id: 'usr-student-1',
      student_name: 'Ahmad Fauzi',
      teacher_id: 'usr-teacher-1',
      subject: 'Kimia',
      topic: 'Konfigurasi Elektron & Reaksi Hijau',
      problem: 'Perhitungan efisiensi atom dan elektron valensi unsur transisi',
      recommendations: [
        'Buka materi penguatan: Modul 3 Sintesis Atom Hemat Energi',
        'Kerjakan latihan kalkulasi Atom Economy',
        'Selesaikan refleksi mandiri'
      ],
      progress: 35,
      status: 'active',
      created_at: '2026-10-01T19:00:00Z'
    }
  ],
  ai_configs: [
    {
      id: 'cfg-1',
      user_id: 'usr-teacher-1',
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      endpoint: 'https://generativelanguage.googleapis.com',
      is_active: true,
      status: 'connected',
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-09-01T08:00:00Z'
    }
  ],
  activities: [
    {
      id: 'act-1',
      user_id: 'usr-teacher-1',
      role: 'teacher',
      title: 'Tugas Baru Diterbitkan',
      description: 'Menugaskan "LKPD 1: Eksplorasi Kimia Hijau" untuk Kelas X-1',
      timestamp: '2026-10-01T08:00:00Z',
      icon: 'clipboard-list'
    },
    {
      id: 'act-2',
      user_id: 'usr-teacher-1',
      role: 'teacher',
      title: 'Pengumpulan Tugas Baru',
      description: 'Ahmad Fauzi (X-1) telah mengumpulkan LKPD 1',
      timestamp: '2026-10-02T07:45:00Z',
      icon: 'check-circle'
    },
    {
      id: 'act-3',
      user_id: 'usr-teacher-1',
      role: 'teacher',
      title: 'Penilaian Selesai',
      description: 'Nilai 94 diberikan untuk Siti Nurhaliza (X-1)',
      timestamp: '2026-10-01T18:00:00Z',
      icon: 'award'
    }
  ]
};

class Database {
  constructor() {
    this.memoryData = null;
    this.init();
  }

  hasCloud() {
    return cloudAdapter.isConfigured();
  }

  isDirty() {
    return cloudAdapter.isDirty;
  }

  getCloudProviderName() {
    return cloudAdapter.getProviderName();
  }

  async pullFromCloud() {
    if (cloudAdapter.isConfigured()) {
      const data = await cloudAdapter.pull(INITIAL_DATA);
      if (data) {
        this.memoryData = this.cleanupData(data);
        try {
          fs.writeFileSync(DB_PATH, JSON.stringify(this.memoryData, null, 2), 'utf8');
        } catch (e) {}
      }
    }
  }

  async pushToCloud() {
    if (cloudAdapter.isConfigured() && this.memoryData) {
      await cloudAdapter.push(this.memoryData);
    }
  }

  init() {
    if (isServerless) {
      // Di Netlify: jika /tmp kosong, seed dari data.json
      // Jika /tmp sudah ada, MERGE supaya users dari seed tidak hilang
      const seedFile = path.join(__dirname, 'data.json');
      if (!fs.existsSync(DB_PATH)) {
        if (fs.existsSync(seedFile)) {
          try {
            fs.copyFileSync(seedFile, DB_PATH);
            return;
          } catch (e) {}
        }
        this.write(INITIAL_DATA);
      } else {
        // /tmp ada: merge akun admin/guru dari seed agar tidak hilang saat cold start
        try {
          if (fs.existsSync(seedFile)) {
            const existing = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
            // Merge: tambahkan user dari seed yang belum ada di /tmp
            const existingIds = new Set((existing.users || []).map(u => u.id));
            const seedUsers = (seed.users || []).filter(u => !existingIds.has(u.id));
            if (seedUsers.length > 0) {
              existing.users = [...(existing.users || []), ...seedUsers];
              fs.writeFileSync(DB_PATH, JSON.stringify(existing, null, 2), 'utf8');
            }
          }
        } catch (e) {
          console.error('Merge seed error:', e);
        }
      }
    } else {
      // Lokal: gunakan data.json langsung (DB_PATH === data.json)
      if (!fs.existsSync(DB_PATH)) {
        this.write(INITIAL_DATA);
      }
    }
  }

  cleanupData(data) {
    if (!data) return data;
    const studentIds = new Set((data.students || []).map(s => s.id));
    const studentUserIds = new Set((data.students || []).map(s => s.user_id).filter(Boolean));
    // validStudentIds: semua ID yang bisa jadi student_id di submissions
    const validStudentIds = new Set([
      ...(data.users || []).filter(u => u.role === 'student').map(u => u.id),
      ...studentIds,
      ...studentUserIds
    ]);

    const classIds = new Set((data.classes || []).map(c => c.id));
    const lkpdIds = new Set((data.lkpd || []).map(l => l.id));

    // Bersihkan assignment yang kelasnya ATAU LKPD-nya sudah tidak ada
    data.assignments = (data.assignments || []).filter(a => {
      return classIds.has(a.class_id) && (!a.lkpd_id || lkpdIds.has(a.lkpd_id));
    });

    const assignIds = new Set(data.assignments.map(a => a.id));

    // Bersihkan submission yang tugasnya ATAU siswanya sudah dihapus
    data.submissions = (data.submissions || []).filter(s => {
      return assignIds.has(s.assignment_id) && validStudentIds.has(s.student_id);
    });

    // Bersihkan followup yang siswanya sudah dihapus
    data.followups = (data.followups || []).filter(f => {
      return validStudentIds.has(f.student_id);
    });

    // Update student_count di setiap kelas secara akurat
    for (const cls of (data.classes || [])) {
      cls.student_count = (data.students || []).filter(s => s.class_id === cls.id).length;
    }

    return data;
  }

  read() {
    if (this.memoryData) {
      return this.memoryData;
    }
    try {
      if (!fs.existsSync(DB_PATH)) {
        const seedFile = path.join(__dirname, 'data.json');
        if (isServerless && fs.existsSync(seedFile)) {
          try { fs.copyFileSync(seedFile, DB_PATH); } catch (e) {}
        } else {
          this.write(INITIAL_DATA);
          return INITIAL_DATA;
        }
      }
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      this.memoryData = parsed;
      return parsed;
    } catch (err) {
      console.error('Error reading database file:', err);
      return INITIAL_DATA;
    }
  }

  write(data) {
    try {
      const clean = this.cleanupData(data);
      this.memoryData = clean;
      cloudAdapter.isDirty = true;
      fs.writeFileSync(DB_PATH, JSON.stringify(clean, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing database file:', err);
      return false;
    }
  }

  // Users

  // Admin Methods
  getTeachers() {
    const data = this.read();
    return data.users.filter(u => u.role === 'teacher').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      nip: u.nip_or_nis,
      subject: u.subject || 'Umum',
      status: u.status || 'active',
      created_at: u.created_at
    }));
  }

  createTeacher(teacherData) {
    const data = this.read();
    const existing = data.users.find(u => u.email.toLowerCase() === teacherData.email.toLowerCase().trim());
    if (existing) {
      throw new Error('Email akun guru ini sudah terdaftar di sistem.');
    }

    const userId = 'usr-teacher-' + Date.now().toString(36);
    const newTeacher = {
      id: userId,
      name: teacherData.name.trim(),
      email: teacherData.email.toLowerCase().trim(),
      password_hash: bcrypt.hashSync(teacherData.password || 'password123', 10),
      role: 'teacher',
      nip_or_nis: teacherData.nip ? teacherData.nip.trim() : '-',
      subject: teacherData.subject ? teacherData.subject.trim() : 'Umum',
      avatar: teacherData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      status: 'active',
      created_at: new Date().toISOString()
    };

    data.users.push(newTeacher);
    this.write(data);
    return {
      id: newTeacher.id,
      name: newTeacher.name,
      email: newTeacher.email,
      nip: newTeacher.nip_or_nis,
      subject: newTeacher.subject,
      status: newTeacher.status
    };
  }

  toggleTeacherStatus(teacherId, status) {
    const data = this.read();
    const idx = data.users.findIndex(u => u.id === teacherId && u.role === 'teacher');
    if (idx !== -1) {
      data.users[idx].status = status;
      this.write(data);
      return data.users[idx];
    }
    return null;
  }

  resetTeacherPassword(teacherId) {
    const data = this.read();
    const idx = data.users.findIndex(u => u.id === teacherId && u.role === 'teacher');
    if (idx !== -1) {
      data.users[idx].password_hash = bcrypt.hashSync('password123', 10);
      this.write(data);
      return true;
    }
    return false;
  }

  getAdminStats() {
    const data = this.read();
    const teachers = data.users.filter(u => u.role === 'teacher');
    const students = data.users.filter(u => u.role === 'student');
    const classes = data.classes || [];
    const lkpd = data.lkpd || [];
    const assignments = data.assignments || [];

    return {
      totalTeachers: teachers.length,
      totalStudents: students.length,
      totalClasses: classes.length,
      totalLkpd: lkpd.length,
      totalAssignments: assignments.length,
      systemStatus: 'Online (Optimal)'
    };
  }
  findUserByEmail(email) {
    const data = this.read();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    const data = this.read();
    return data.users.find(u => u.id === id);
  }

  // Classes CRUD
  getClasses(teacherId) {
    const data = this.read();
    return (data.classes || []).filter(c => c.status === 'active');
  }

  getClassById(classId) {
    const data = this.read();
    return data.classes.find(c => c.id === classId);
  }

  createClass(classData) {
    const data = this.read();
    const newClass = {
      id: 'cls-' + Date.now().toString(36),
      status: 'active',
      student_count: 0,
      created_at: new Date().toISOString(),
      ...classData
    };
    data.classes.push(newClass);
    this.write(data);
    return newClass;
  }

  updateClass(classId, updateData) {
    const data = this.read();
    const idx = data.classes.findIndex(c => c.id === classId);
    if (idx !== -1) {
      data.classes[idx] = { ...data.classes[idx], ...updateData };
      this.write(data);
      return data.classes[idx];
    }
    return null;
  }

  // Students CRUD
  getStudentsByClass(classId) {
    const data = this.read();
    return data.students.filter(s => s.class_id === classId);
  }

  createStudent(studentData) {
    const data = this.read();
    const userId = 'usr-student-' + Date.now().toString(36);
    
    // Create User record for auth
    const newUser = {
      id: userId,
      name: studentData.name,
      email: studentData.email || `${studentData.nis}@aiclassroom.sch.id`,
      password_hash: bcrypt.hashSync('password123', 10), // default password
      role: 'student',
      nip_or_nis: studentData.nis,
      class_id: studentData.class_id,
      avatar: studentData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);

    // Create Student record
    const newStudent = {
      id: 'std-' + Date.now().toString(36),
      user_id: userId,
      class_id: studentData.class_id,
      nis: studentData.nis,
      name: studentData.name,
      email: newUser.email,
      status: 'active',
      progress: 0,
      created_at: new Date().toISOString()
    };
    data.students.push(newStudent);

    // Update class student count
    const cls = data.classes.find(c => c.id === studentData.class_id);
    if (cls) cls.student_count = (cls.student_count || 0) + 1;

    this.write(data);
    return newStudent;
  }

  importStudents(studentsList, classId) {
    const results = [];
    for (const item of studentsList) {
      if (item.name && item.nis) {
        const student = this.createStudent({
          name: item.name.trim(),
          nis: item.nis.trim(),
          email: item.email ? item.email.trim() : `${item.nis.trim()}@aiclassroom.sch.id`,
          class_id: classId
        });
        results.push(student);
      }
    }
    return results;
  }

  updateStudent(studentId, updateData) {
    const data = this.read();
    const idx = data.students.findIndex(s => s.id === studentId);
    if (idx !== -1) {
      data.students[idx] = { ...data.students[idx], ...updateData };
      // Also update user record if name or email changed
      const uIdx = data.users.findIndex(u => u.id === data.students[idx].user_id);
      if (uIdx !== -1) {
        if (updateData.name) data.users[uIdx].name = updateData.name;
        if (updateData.email) data.users[uIdx].email = updateData.email;
        if (updateData.status) data.users[uIdx].status = updateData.status;
      }
      this.write(data);
      return data.students[idx];
    }
    return null;
  }

  resetStudentPassword(studentId) {
    const data = this.read();
    const std = data.students.find(s => s.id === studentId);
    if (std) {
      const uIdx = data.users.findIndex(u => u.id === std.user_id);
      if (uIdx !== -1) {
        data.users[uIdx].password_hash = bcrypt.hashSync('password123', 10);
        this.write(data);
        return true;
      }
    }
    return false;
  }

  // LKPD CRUD
  getLkpdList(teacherId) {
    const data = this.read();
    return data.lkpd || [];
  }

  getLkpdById(id) {
    const data = this.read();
    return data.lkpd.find(l => l.id === id);
  }

  createLkpd(lkpdData) {
    const data = this.read();
    const newLkpd = {
      id: 'lkpd-' + Date.now().toString(36),
      status: 'draft',
      created_at: new Date().toISOString(),
      ...lkpdData
    };
    data.lkpd.push(newLkpd);
    this.write(data);
    return newLkpd;
  }

  updateLkpd(id, updateData) {
    const data = this.read();
    const idx = data.lkpd.findIndex(l => l.id === id);
    if (idx !== -1) {
      data.lkpd[idx] = { ...data.lkpd[idx], ...updateData, updated_at: new Date().toISOString() };
      this.write(data);
      return data.lkpd[idx];
    }
    return null;
  }

  duplicateLkpd(id, teacherId) {
    const lkpd = this.getLkpdById(id);
    if (lkpd) {
      const copy = {
        ...lkpd,
        teacher_id: teacherId || lkpd.teacher_id,
        title: `${lkpd.title} (Salinan)`,
        status: 'draft'
      };
      delete copy.id;
      return this.createLkpd(copy);
    }
    return null;
  }

  // Assignments CRUD
  getAssignments(teacherId) {
    const data = this.read();
    return (data.assignments || []).filter(a => a.status === 'active');
  }

  getAssignmentsForStudent(studentUserId) {
    const data = this.read();
    const user = data.users.find(u => u.id === studentUserId);
    if (!user || !user.class_id) return [];
    
    const assignments = data.assignments.filter(a => a.class_id === user.class_id && a.status === 'active');
    const studentSubmissions = data.submissions.filter(s => s.student_id === studentUserId);

    return assignments.map(a => {
      const sub = studentSubmissions.find(s => s.assignment_id === a.id);
      return {
        ...a,
        submissionStatus: sub ? sub.status : 'not_started',
        submissionId: sub ? sub.id : null,
        score: sub ? sub.score : null
      };
    });
  }

  createAssignment(assignmentData) {
    const data = this.read();
    const cls = data.classes.find(c => c.id === assignmentData.class_id);
    const newAssign = {
      id: 'asg-' + Date.now().toString(36),
      status: 'active',
      class_name: cls ? cls.name : 'Kelas',
      created_at: new Date().toISOString(),
      ...assignmentData
    };
    data.assignments.push(newAssign);
    
    // Add activity
    data.activities.unshift({
      id: 'act-' + Date.now().toString(36),
      user_id: assignmentData.teacher_id,
      role: 'teacher',
      title: 'Tugas Baru Diterbitkan',
      description: `Menugaskan "${newAssign.title}" untuk Kelas ${newAssign.class_name}`,
      timestamp: new Date().toISOString(),
      icon: 'clipboard-list'
    });

    this.write(data);
    return newAssign;
  }

  // Submissions CRUD
  getSubmissions(filter = {}) {
    const data = this.read();
    return (data.submissions || [])
      .filter(s => {
        const assign = (data.assignments || []).find(a => a.id === s.assignment_id);
        if (!assign) return false;
        if (filter.assignment_id && s.assignment_id !== filter.assignment_id) return false;
        if (filter.student_id && s.student_id !== filter.student_id) return false;
        if (filter.class_id && assign.class_id !== filter.class_id) return false;
        return true;
      })
      .map(s => {
        const assign = (data.assignments || []).find(a => a.id === s.assignment_id) || {};
        const studentUser = (data.users || []).find(u => u.id === s.student_id);
        const studentRecord = (data.students || []).find(st => st.id === s.student_id || st.user_id === s.student_id);
        const classId = assign.class_id || (studentUser ? studentUser.class_id : (studentRecord ? studentRecord.class_id : ''));
        const cls = (data.classes || []).find(c => c.id === classId);
        return {
          ...s,
          student_name: s.student_name || (studentUser ? studentUser.name : (studentRecord ? studentRecord.name : 'Siswa')),
          student_nis: s.student_nis || (studentUser ? studentUser.nip_or_nis : (studentRecord ? studentRecord.nis : '-')),
          assignment_title: assign.title || 'Tugas LKPD',
          class_id: classId,
          class_name: cls ? cls.name : (assign.class_name || 'Umum')
        };
      });
  }

  getSubmissionById(id) {
    const data = this.read();
    return data.submissions.find(s => s.id === id);
  }

  saveStudentSubmission(subData) {
    const data = this.read();
    let sub = data.submissions.find(s => s.assignment_id === subData.assignment_id && s.student_id === subData.student_id);
    
    if (sub) {
      sub.answers = { ...(sub.answers || {}), ...(subData.answers || {}) };
      if (subData.status) sub.status = subData.status;
      if (subData.status === 'submitted') {
        sub.submitted_at = new Date().toISOString();
        // Add activity
        data.activities.unshift({
          id: 'act-' + Date.now().toString(36),
          user_id: sub.student_id,
          role: 'student',
          title: 'Pengumpulan Tugas Baru',
          description: `${sub.student_name} telah mengumpulkan tugas.`,
          timestamp: new Date().toISOString(),
          icon: 'check-circle'
        });
      }
      this.write(data);
      return sub;
    } else {
      const user = data.users.find(u => u.id === subData.student_id);
      sub = {
        id: 'sub-' + Date.now().toString(36),
        assignment_id: subData.assignment_id,
        student_id: subData.student_id,
        student_name: user ? user.name : 'Siswa',
        student_nis: user ? user.nip_or_nis : '',
        status: subData.status || 'draft',
        answers: subData.answers || {},
        submitted_at: subData.status === 'submitted' ? new Date().toISOString() : null,
        score: null,
        feedback: null,
        graded_at: null,
        created_at: new Date().toISOString()
      };
      data.submissions.push(sub);
      this.write(data);
      return sub;
    }
  }

  // Grading
  submitGrade(submissionId, gradeData) {
    const data = this.read();
    const subIdx = data.submissions.findIndex(s => s.id === submissionId);
    if (subIdx !== -1) {
      data.submissions[subIdx].status = 'graded';
      data.submissions[subIdx].score = Number(gradeData.score);
      data.submissions[subIdx].feedback = gradeData.feedback || '';
      data.submissions[subIdx].strengths = gradeData.strengths || [];
      data.submissions[subIdx].weaknesses = gradeData.weaknesses || [];
      data.submissions[subIdx].misconceptions = gradeData.misconceptions || [];
      data.submissions[subIdx].graded_at = new Date().toISOString();

      data.activities.unshift({
        id: 'act-' + Date.now().toString(36),
        user_id: gradeData.teacher_id,
        role: 'teacher',
        title: 'Penilaian Selesai',
        description: `Nilai ${gradeData.score} diberikan untuk ${data.submissions[subIdx].student_name}`,
        timestamp: new Date().toISOString(),
        icon: 'award'
      });

      this.write(data);
      return data.submissions[subIdx];
    }
    return null;
  }

  // Follow-ups CRUD
  getFollowups(filter = {}) {
    const data = this.read();
    return data.followups.filter(f => {
      if (filter.teacher_id && f.teacher_id !== filter.teacher_id) return false;
      if (filter.student_id && f.student_id !== filter.student_id) return false;
      return true;
    });
  }

  createFollowup(flwData) {
    const data = this.read();
    const studentUser = data.users.find(u => u.id === flwData.student_id);
    const newFlw = {
      id: 'flw-' + Date.now().toString(36),
      student_name: studentUser ? studentUser.name : 'Siswa',
      status: 'active',
      progress: 0,
      created_at: new Date().toISOString(),
      ...flwData
    };
    data.followups.push(newFlw);
    this.write(data);
    return newFlw;
  }

  updateFollowupProgress(id, progress) {
    const data = this.read();
    const idx = data.followups.findIndex(f => f.id === id);
    if (idx !== -1) {
      data.followups[idx].progress = Math.min(100, Math.max(0, Number(progress)));
      if (data.followups[idx].progress >= 100) {
        data.followups[idx].status = 'completed';
      }
      this.write(data);
      return data.followups[idx];
    }
    return null;
  }

  // AI Configs
  getAiConfigs(userId) {
    const data = this.read();
    return data.ai_configs.filter(c => c.user_id === userId);
  }

  getActiveAiConfig(userId) {
    const data = this.read();
    return data.ai_configs.find(c => c.user_id === userId && c.is_active) || data.ai_configs[0] || null;
  }

  saveAiConfig(userId, configData) {
    const data = this.read();
    // set others to inactive if this is active
    if (configData.is_active) {
      data.ai_configs.forEach(c => {
        if (c.user_id === userId) c.is_active = false;
      });
    }

    let existing = data.ai_configs.find(c => c.user_id === userId && c.provider === configData.provider);
    if (existing) {
      existing.model = configData.model;
      existing.endpoint = configData.endpoint;
      if (configData.api_key) existing.api_key = configData.api_key;
      existing.is_active = configData.is_active !== undefined ? configData.is_active : true;
      existing.status = configData.status || 'connected';
      existing.updated_at = new Date().toISOString();
      this.write(data);
      return existing;
    } else {
      const newCfg = {
        id: 'cfg-' + Date.now().toString(36),
        user_id: userId,
        provider: configData.provider,
        model: configData.model,
        endpoint: configData.endpoint,
        api_key: configData.api_key || '',
        is_active: true,
        status: configData.status || 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.ai_configs.push(newCfg);
      this.write(data);
      return newCfg;
    }
  }

  // Analytics
  getClassAnalytics(teacherId) {
    const data = this.read();
    const classes = data.classes.filter(c => c.teacher_id === teacherId);
    const submissions = data.submissions;
    const graded = submissions.filter(s => s.score !== null);

    const avgScore = graded.length > 0 
      ? Math.round(graded.reduce((acc, s) => acc + s.score, 0) / graded.length) 
      : 0;

    const passingThreshold = 75;
    const passedCount = graded.filter(s => s.score >= passingThreshold).length;
    const masteryRate = graded.length > 0 ? Math.round((passedCount / graded.length) * 100) : 0;

    return {
      averageScore: avgScore,
      masteryRate: masteryRate,
      totalSubmissions: submissions.length,
      gradedCount: graded.length,
      remedialCount: graded.filter(s => s.score < passingThreshold).length,
      enrichmentCount: graded.filter(s => s.score >= 90).length,
      difficultTopics: [
        { topic: 'Perhitungan Atom Economy', difficulty: 'Tinggi', errorRate: '42%' },
        { topic: 'Penentuan Pelarut Hijau Non-B3', difficulty: 'Sedang', errorRate: '25%' },
        { topic: 'Identifikasi 12 Prinsip Kimia Hijau', difficulty: 'Rendah', errorRate: '12%' }
      ],
      aiSummary: 'Sebagian siswa masih mengalami kesulitan pada perhitungan matematis efisiensi atom stoikiometri, namun telah memahami dengan baik konsep kualitatif pencegahan limbah industri.'
    };
  }

  // Stats queries for Dashboard
  getTeacherStats(teacherId) {
    const data = this.read();
    const teacherClasses = data.classes.filter(c => c.teacher_id === teacherId && c.status === 'active');
    const classIds = teacherClasses.map(c => c.id);
    const students = data.students.filter(s => classIds.includes(s.class_id) && s.status === 'active');
    const lkpdList = data.lkpd.filter(l => l.teacher_id === teacherId);
    const assignments = data.assignments.filter(a => a.teacher_id === teacherId && a.status === 'active');
    const assignmentIds = assignments.map(a => a.id);
    const pendingSubmissions = data.submissions.filter(s => 
      assignmentIds.includes(s.assignment_id) && s.status === 'submitted'
    );
    const activeFollowups = data.followups.filter(f => f.teacher_id === teacherId && f.status === 'active');

    return {
      totalClasses: teacherClasses.length,
      totalStudents: students.length,
      totalLkpd: lkpdList.length,
      activeAssignments: assignments.length,
      ungradedSubmissions: pendingSubmissions.length,
      studentsNeedingFollowup: activeFollowups.length,
      classes: teacherClasses,
      recentActivities: data.activities.filter(a => a.user_id === teacherId || a.role === 'teacher').slice(0, 5)
    };
  }

  getStudentStats(studentUserId) {
    const data = this.read();
    const user = data.users.find(u => u.id === studentUserId);
    const classId = user ? user.class_id : null;
    const assignments = data.assignments.filter(a => a.class_id === classId && a.status === 'active');
    const studentSubmissions = data.submissions.filter(s => s.student_id === studentUserId);
    const submittedAssignIds = studentSubmissions.map(s => s.assignment_id);

    const completed = studentSubmissions.filter(s => s.status === 'graded' || s.status === 'submitted').length;
    const activeTasks = assignments.filter(a => !submittedAssignIds.includes(a.id)).length;
    
    const now = new Date();
    const overdueTasks = assignments.filter(a => {
      const isDone = submittedAssignIds.includes(a.id);
      return !isDone && new Date(a.due_date) < now;
    }).length;

    const gradedSubmissions = studentSubmissions.filter(s => s.score !== null);
    const latestGrade = gradedSubmissions.length > 0 ? gradedSubmissions[gradedSubmissions.length - 1] : null;
    const followups = data.followups.filter(f => f.student_id === studentUserId && f.status === 'active');

    return {
      activeTasks,
      completedTasks: completed,
      overdueTasks,
      latestGrade: latestGrade ? { score: latestGrade.score, feedback: latestGrade.feedback, gradedAt: latestGrade.graded_at } : null,
      activeFollowupsCount: followups.length,
      followups: followups,
      assignments: assignments.map(a => {
        const sub = studentSubmissions.find(s => s.assignment_id === a.id);
        return {
          ...a,
          submissionStatus: sub ? sub.status : 'not_started',
          score: sub ? sub.score : null
        };
      })
    };
  }

  // =============================================
  // DELETE METHODS
  // =============================================

  deleteTeacher(teacherId) {
    const data = this.read();
    const idx = data.users.findIndex(u => u.id === teacherId && u.role === 'teacher');
    if (idx === -1) return false;
    data.users.splice(idx, 1);
    this.write(data);
    return true;
  }

  deleteStudent(studentId) {
    const data = this.read();
    // studentId bisa berupa id dari data.students (std-xxx) ATAU id dari data.users (usr-xxx)
    // Cek di tabel students dulu
    const stdIdx = (data.students || []).findIndex(s => s.id === studentId || s.user_id === studentId);
    let userId = studentId;
    if (stdIdx !== -1) {
      userId = data.students[stdIdx].user_id || studentId;
      data.students.splice(stdIdx, 1);
    }
    // Hapus dari tabel users juga (coba dengan userId dan studentId asli)
    const userIdx = data.users.findIndex(u => (u.id === userId || u.id === studentId) && u.role === 'student');
    if (userIdx !== -1) {
      data.users.splice(userIdx, 1);
    }
    if (stdIdx === -1 && userIdx === -1) return false;

    // Bersihkan juga riwayat pengumpulan tugas dan tindak lanjut siswa ini
    data.submissions = (data.submissions || []).filter(s => s.student_id !== userId && s.student_id !== studentId);
    data.followups = (data.followups || []).filter(f => f.student_id !== userId && f.student_id !== studentId);

    this.write(data);
    return true;
  }

  deleteLkpd(lkpdId) {
    const data = this.read();
    const idx = data.lkpd.findIndex(l => l.id === lkpdId);
    if (idx === -1) return false;
    data.lkpd.splice(idx, 1);
    // Hapus juga assignment terkait
    data.assignments = (data.assignments || []).filter(a => a.lkpd_id !== lkpdId);
    this.write(data);
    return true;
  }

  deleteClass(classId) {
    const data = this.read();
    const idx = data.classes.findIndex(c => c.id === classId);
    if (idx === -1) return false;
    data.classes.splice(idx, 1);
    // Hapus juga siswa di kelas ini dari tabel students dan users
    const studentsInClass = (data.students || []).filter(s => s.class_id === classId);
    const studentUserIds = studentsInClass.map(s => s.user_id || s.id);
    data.students = (data.students || []).filter(s => s.class_id !== classId);
    data.users = (data.users || []).filter(u => !studentUserIds.includes(u.id));
    // Hapus juga assignment terkait kelas ini
    data.assignments = (data.assignments || []).filter(a => a.class_id !== classId);
    this.write(data);
    return true;
  }
}


module.exports = new Database();
