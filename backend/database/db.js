const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const cloudAdapter = require('./cloudAdapter');
const { bad, forbidden, notFound, conflict } = require('../utils/http');
const lkpdUtil = require('../utils/lkpd');

const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
const DB_PATH = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : (isServerless ? path.join('/tmp', 'classroom_data.json') : path.join(__dirname, 'data.json'));

const SCHEMA_VERSION = 3;
const PASSING_SCORE = config.passingScore;
const MAX_ACTIVITIES = 300;

// Hash bcrypt untuk "password123" (hanya dipakai jika ADMIN_PASSWORD tidak diisi).
const DEFAULT_ADMIN_HASH = '$2a$10$RK16DaFtnsIRZGHYvG2iVO46cDntnSf3I.PExDbhKKl/eiC8U6zGW';

const uid = (prefix) => `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
const nowIso = () => new Date().toISOString();
const initials = (name) => String(name || '?').trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
const normEmail = (e) => String(e || '').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildInitialData() {
  return {
    db_version: 2,
    schema_version: SCHEMA_VERSION,
    users: [
      {
        id: 'usr-admin-1',
        name: 'Administrator Sekolah',
        email: config.adminEmail,
        password_hash: config.adminPassword ? bcrypt.hashSync(config.adminPassword, 10) : DEFAULT_ADMIN_HASH,
        role: 'admin',
        nip_or_nis: '-',
        subject: 'Administrator',
        avatar: 'AD',
        status: 'active',
        created_at: nowIso()
      }
    ],
    classes: [],
    students: [],
    lkpd: [],
    assignments: [],
    submissions: [],
    followups: [],
    activities: [
      {
        id: 'act-init-1',
        user_id: 'usr-admin-1',
        role: 'admin',
        title: 'Sistem Diinisialisasi',
        description: 'LMS Sekolah siap digunakan. Silakan tambahkan akun guru di menu Kelola Akun Guru.',
        timestamp: nowIso(),
        icon: 'check-circle'
      }
    ],
    ai_configs: []
  };
}

class Database {
  constructor() {
    this.memoryData = null;
    this.init();
  }

  // ---------------------------------------------------------------- cloud
  hasCloud() { return cloudAdapter.isConfigured(); }
  isDirty() { return cloudAdapter.isDirty; }
  getCloudProviderName() { return cloudAdapter.getProviderName(); }
  getLastPullTime() { return cloudAdapter.lastPull || 0; }
  // Data bertahan antar restart/deploy hanya bila memakai database cloud atau disk lokal persisten.
  isPersistent() { return this.hasCloud() || !isServerless; }

  async pullFromCloud() {
    if (!cloudAdapter.isConfigured()) return;
    const data = await cloudAdapter.pull(buildInitialData);
    if (!data) throw new Error('Database cloud tidak dapat dihubungi.');
    this.memoryData = this.cleanupData(this.ensureShape(data));
  }

  async pushToCloud() {
    if (cloudAdapter.isConfigured() && this.memoryData) {
      const ok = await cloudAdapter.push(this.memoryData);
      if (!ok) throw new Error('Gagal menyimpan data ke database cloud.');
    }
  }

  // ---------------------------------------------------------------- storage
  init() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        this.memoryData = this.cleanupData(this.ensureShape(parsed));
      } else {
        this.memoryData = buildInitialData();
        this.persistFile();
      }
    } catch (err) {
      console.error('Error reading database file, memulai dari data kosong:', err.message);
      this.memoryData = buildInitialData();
    }
  }

  persistFile() {
    try {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      const tmp = `${DB_PATH}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.memoryData, null, 2), 'utf8');
      fs.renameSync(tmp, DB_PATH);
      return true;
    } catch (err) {
      console.error('Error writing database file:', err.message);
      return false;
    }
  }

  read() {
    if (!this.memoryData) this.init();
    return this.memoryData;
  }

  write(data) {
    this.memoryData = this.cleanupData(data || this.memoryData);
    cloudAdapter.isDirty = true;
    this.persistFile();
    return true;
  }

  // Memastikan semua tabel ada & memigrasi data format lama (idempotent).
  ensureShape(data) {
    for (const k of ['users', 'classes', 'students', 'lkpd', 'assignments', 'submissions', 'followups', 'activities', 'ai_configs']) {
      if (!Array.isArray(data[k])) data[k] = [];
    }
    data.db_version = 2;

    // Sinkronkan class_id user siswa dengan tabel students.
    for (const s of data.students) {
      const u = data.users.find(x => x.id === s.user_id);
      if (u && u.role === 'student') {
        if (s.class_id) u.class_id = s.class_id;
        if (!u.status) u.status = s.status || 'active';
      }
    }

    // Migrasi LKPD lama: builder lama menyimpan semua aktivitas/soal sebagai satu blok teks.
    for (const l of data.lkpd) {
      if (Array.isArray(l.activities) && l.activities.length === 1 && l.activities[0].title === 'Aktivitas Utama' && /\n/.test(l.activities[0].instructions || '')) {
        l.activities = lkpdUtil.normalizeActivities(lkpdUtil.toLines(l.activities[0].instructions).map(t => {
          const m = t.match(/^([^:]{1,80}):\s+(.+)$/);
          return m ? { title: m[1], instructions: m[2] } : { title: '', instructions: t };
        }));
      }
      if (Array.isArray(l.questions) && l.questions.length === 1 && /\n/.test(l.questions[0].prompt || '') && l.questions[0].type !== 'multiple_choice') {
        l.questions = lkpdUtil.normalizeQuestions(lkpdUtil.toLines(l.questions[0].prompt));
      }
      if (Array.isArray(l.reflection_prompts)) l.reflection_prompts = lkpdUtil.normalizeReflections(l.reflection_prompts);
      if (!l.status) l.status = 'draft';
    }
    data.schema_version = SCHEMA_VERSION;
    return data;
  }

  // Membuang data yatim (tugas tanpa kelas, jawaban tanpa tugas, dst) dan menghitung ulang jumlah siswa.
  cleanupData(data) {
    if (!data) return data;
    const classIds = new Set(data.classes.map(c => c.id));
    const lkpdIds = new Set(data.lkpd.map(l => l.id));

    data.students = data.students.filter(s => classIds.has(s.class_id));
    const studentUserIds = new Set(data.students.map(s => s.user_id).filter(Boolean));
    // Akun siswa yang tidak punya record students (kelas dihapus) ikut dibuang.
    data.users = data.users.filter(u => u.role !== 'student' || studentUserIds.has(u.id) || classIds.has(u.class_id));

    data.assignments = data.assignments.filter(a => classIds.has(a.class_id) && (!a.lkpd_id || lkpdIds.has(a.lkpd_id)));
    const assignIds = new Set(data.assignments.map(a => a.id));
    const liveUserIds = new Set(data.users.map(u => u.id));
    data.submissions = data.submissions.filter(s => assignIds.has(s.assignment_id) && liveUserIds.has(s.student_id));
    data.followups = data.followups.filter(f => liveUserIds.has(f.student_id));

    for (const cls of data.classes) {
      cls.student_count = data.students.filter(s => s.class_id === cls.id).length;
    }
    if (data.activities.length > MAX_ACTIVITIES) data.activities.length = MAX_ACTIVITIES;
    return data;
  }

  logActivity(data, entry) {
    data.activities.unshift({ id: uid('act'), timestamp: nowIso(), ...entry });
    if (data.activities.length > MAX_ACTIVITIES) data.activities.length = MAX_ACTIVITIES;
  }

  // ---------------------------------------------------------------- users / auth
  findUserByEmail(email) {
    const e = normEmail(email);
    return this.read().users.find(u => normEmail(u.email) === e);
  }

  findUserById(id) {
    return this.read().users.find(u => u.id === id);
  }

  publicUser(user) {
    if (!user) return null;
    const cls = user.class_id ? this.read().classes.find(c => c.id === user.class_id) : null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      nip_or_nis: user.nip_or_nis,
      subject: user.subject || null,
      class_id: user.class_id || null,
      class_name: cls ? cls.name : null,
      avatar: user.avatar
    };
  }

  changePassword(userId, currentPassword, newPassword) {
    const data = this.read();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw notFound('Akun tidak ditemukan.');
    if (!bcrypt.compareSync(String(currentPassword || ''), user.password_hash)) {
      throw bad('Kata sandi saat ini salah.');
    }
    if (String(newPassword || '').length < 8) throw bad('Kata sandi baru minimal 8 karakter.');
    if (newPassword === currentPassword) throw bad('Kata sandi baru harus berbeda dari yang lama.');
    user.password_hash = bcrypt.hashSync(String(newPassword), 10);
    user.must_change_password = false;
    this.write(data);
    return true;
  }

  // ---------------------------------------------------------------- admin: teachers
  getTeachers() {
    return this.read().users.filter(u => u.role === 'teacher').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      nip: u.nip_or_nis,
      subject: u.subject || 'Umum',
      status: u.status || 'active',
      created_at: u.created_at
    }));
  }

  createTeacher(t) {
    const data = this.read();
    const name = String(t.name || '').trim();
    const email = normEmail(t.email);
    if (!name) throw bad('Nama guru wajib diisi.');
    if (!EMAIL_RE.test(email)) throw bad('Format email tidak valid.');
    if (data.users.some(u => normEmail(u.email) === email)) throw conflict('Email akun guru ini sudah terdaftar di sistem.');
    const password = String(t.password || config.defaultPassword);
    if (password.length < 8) throw bad('Kata sandi minimal 8 karakter.');

    const teacher = {
      id: uid('usr-teacher'),
      name,
      email,
      password_hash: bcrypt.hashSync(password, 10),
      role: 'teacher',
      nip_or_nis: t.nip ? String(t.nip).trim() : '-',
      subject: t.subject ? String(t.subject).trim() : 'Umum',
      avatar: initials(name),
      status: 'active',
      created_at: nowIso()
    };
    data.users.push(teacher);
    this.write(data);
    return { id: teacher.id, name: teacher.name, email: teacher.email, nip: teacher.nip_or_nis, subject: teacher.subject, status: teacher.status };
  }

  toggleTeacherStatus(teacherId, status) {
    if (!['active', 'inactive'].includes(status)) throw bad('Status tidak valid.');
    const data = this.read();
    const u = data.users.find(x => x.id === teacherId && x.role === 'teacher');
    if (!u) return null;
    u.status = status;
    this.write(data);
    return u;
  }

  resetTeacherPassword(teacherId) {
    const data = this.read();
    const u = data.users.find(x => x.id === teacherId && x.role === 'teacher');
    if (!u) return false;
    u.password_hash = bcrypt.hashSync(config.defaultPassword, 10);
    this.write(data);
    return true;
  }

  // Menghapus guru beserta seluruh kelas, siswa, LKPD, tugas, dan pengumpulan miliknya.
  deleteTeacher(teacherId) {
    const data = this.read();
    const idx = data.users.findIndex(u => u.id === teacherId && u.role === 'teacher');
    if (idx === -1) return false;
    data.users.splice(idx, 1);
    const classIds = new Set(data.classes.filter(c => c.teacher_id === teacherId).map(c => c.id));
    data.classes = data.classes.filter(c => !classIds.has(c.id));
    data.lkpd = data.lkpd.filter(l => l.teacher_id !== teacherId);
    data.assignments = data.assignments.filter(a => a.teacher_id !== teacherId);
    data.followups = data.followups.filter(f => f.teacher_id !== teacherId);
    data.ai_configs = data.ai_configs.filter(c => c.user_id !== teacherId);
    this.write(data); // cleanupData membuang siswa, akun siswa & pengumpulan yang yatim
    return true;
  }

  getAdminStats() {
    const data = this.read();
    return {
      totalTeachers: data.users.filter(u => u.role === 'teacher').length,
      totalStudents: data.users.filter(u => u.role === 'student').length,
      totalClasses: data.classes.length,
      totalLkpd: data.lkpd.length,
      totalAssignments: data.assignments.length,
      totalSubmissions: data.submissions.filter(s => s.status !== 'draft').length,
      storage: this.getCloudProviderName(),
      persistent: this.isPersistent(),
      systemStatus: this.isPersistent() ? 'Online (Optimal)' : 'Online — PERINGATAN: penyimpanan sementara'
    };
  }

  // ---------------------------------------------------------------- classes
  assertClassAccess(user, classId) {
    const cls = this.read().classes.find(c => c.id === classId);
    if (!cls) throw notFound('Kelas tidak ditemukan.');
    if (user.role !== 'admin' && cls.teacher_id !== user.id) throw forbidden('Kelas ini bukan milik Anda.');
    return cls;
  }

  getClasses(user) {
    const data = this.read();
    return data.classes
      .filter(c => c.status !== 'archived' && (user.role === 'admin' || c.teacher_id === user.id))
      .map(c => {
        const t = data.users.find(u => u.id === c.teacher_id);
        return { ...c, teacher_name: t ? t.name : '-' };
      });
  }

  getClassById(classId) {
    return this.read().classes.find(c => c.id === classId);
  }

  createClass(user, c) {
    const data = this.read();
    const name = String(c.name || '').trim();
    const subject = String(c.subject || '').trim();
    if (!name || !subject) throw bad('Nama kelas dan mata pelajaran wajib diisi.');
    if (data.classes.some(x => x.teacher_id === user.id && x.name.toLowerCase() === name.toLowerCase() && x.subject.toLowerCase() === subject.toLowerCase())) {
      throw conflict(`Kelas ${name} untuk ${subject} sudah ada.`);
    }
    const cls = {
      id: uid('cls'),
      teacher_id: user.id,
      name,
      subject,
      academic_year: String(c.academic_year || '2026/2027').trim(),
      description: String(c.description || '').trim(),
      status: 'active',
      student_count: 0,
      created_at: nowIso()
    };
    data.classes.push(cls);
    this.write(data);
    return cls;
  }

  deleteClass(classId) {
    const data = this.read();
    const idx = data.classes.findIndex(c => c.id === classId);
    if (idx === -1) return false;
    data.classes.splice(idx, 1);
    this.write(data); // siswa, tugas, & pengumpulan terkait dibersihkan oleh cleanupData
    return true;
  }

  // ---------------------------------------------------------------- students
  // Persentase tugas kelas yang sudah dikumpulkan siswa.
  studentProgress(data, studentUserId, classId) {
    const assigns = data.assignments.filter(a => a.class_id === classId && a.status === 'active');
    if (assigns.length === 0) return 0;
    const done = assigns.filter(a => data.submissions.some(s => s.assignment_id === a.id && s.student_id === studentUserId && (s.status === 'submitted' || s.status === 'graded'))).length;
    return Math.round((done / assigns.length) * 100);
  }

  getStudentsByClass(classId) {
    const data = this.read();
    return data.students
      .filter(s => s.class_id === classId)
      .map(s => ({ ...s, progress: this.studentProgress(data, s.user_id, s.class_id) }));
  }

  // Mengembalikan record siswa dari id std-xxx ATAU id akun (usr-xxx).
  findStudent(studentId) {
    return this.read().students.find(s => s.id === studentId || s.user_id === studentId) || null;
  }

  _createStudentRecord(data, { name, nis, email, class_id }) {
    const cleanName = String(name || '').trim();
    const cleanNis = String(nis || '').trim();
    if (!cleanName || !cleanNis) throw bad('Nama siswa dan NIS wajib diisi.');
    if (data.students.some(s => String(s.nis) === cleanNis)) throw conflict(`NIS ${cleanNis} sudah terdaftar.`);
    const mail = normEmail(email) || `${cleanNis}@${config.studentEmailDomain}`;
    if (!EMAIL_RE.test(mail)) throw bad(`Format email tidak valid: ${mail}`);
    if (data.users.some(u => normEmail(u.email) === mail)) throw conflict(`Email ${mail} sudah terdaftar.`);

    const userId = uid('usr-student');
    const user = {
      id: userId,
      name: cleanName,
      email: mail,
      password_hash: bcrypt.hashSync(config.defaultPassword, 10),
      role: 'student',
      nip_or_nis: cleanNis,
      class_id,
      avatar: initials(cleanName),
      status: 'active',
      created_at: nowIso()
    };
    const student = {
      id: uid('std'),
      user_id: userId,
      class_id,
      nis: cleanNis,
      name: cleanName,
      email: mail,
      status: 'active',
      progress: 0,
      created_at: nowIso()
    };
    data.users.push(user);
    data.students.push(student);
    return student;
  }

  createStudent(s) {
    const data = this.read();
    if (!data.classes.some(c => c.id === s.class_id)) throw notFound('Kelas tidak ditemukan.');
    const student = this._createStudentRecord(data, s);
    this.write(data);
    return student;
  }

  // Impor massal: baris yang gagal dilewati dan dilaporkan, sisanya tetap tersimpan.
  importStudents(list, classId) {
    const data = this.read();
    if (!data.classes.some(c => c.id === classId)) throw notFound('Kelas tidak ditemukan.');
    const imported = [];
    const skipped = [];
    list.forEach((item, i) => {
      try {
        imported.push(this._createStudentRecord(data, { ...item, class_id: classId }));
      } catch (e) {
        skipped.push({ row: i + 1, name: item && item.name, nis: item && item.nis, reason: e.message });
      }
    });
    if (imported.length) this.write(data);
    return { imported, skipped };
  }

  updateStudentStatus(studentId, status) {
    if (!['active', 'inactive'].includes(status)) throw bad('Status tidak valid.');
    const data = this.read();
    const s = data.students.find(x => x.id === studentId || x.user_id === studentId);
    if (!s) return null;
    s.status = status;
    const u = data.users.find(x => x.id === s.user_id);
    if (u) u.status = status;
    this.write(data);
    return s;
  }

  resetStudentPassword(studentId) {
    const data = this.read();
    const s = data.students.find(x => x.id === studentId || x.user_id === studentId);
    const u = s && data.users.find(x => x.id === s.user_id);
    if (!u) return false;
    u.password_hash = bcrypt.hashSync(config.defaultPassword, 10);
    this.write(data);
    return true;
  }

  deleteStudent(studentId) {
    const data = this.read();
    const s = data.students.find(x => x.id === studentId || x.user_id === studentId);
    if (!s) return false;
    data.students = data.students.filter(x => x !== s);
    data.users = data.users.filter(u => u.id !== s.user_id);
    this.write(data); // pengumpulan & tindak lanjut siswa dibersihkan oleh cleanupData
    return true;
  }

  // ---------------------------------------------------------------- LKPD
  assertLkpdAccess(user, id) {
    const l = this.read().lkpd.find(x => x.id === id);
    if (!l) throw notFound('LKPD tidak ditemukan.');
    if (user.role !== 'admin' && l.teacher_id !== user.id) throw forbidden('LKPD ini bukan milik Anda.');
    return l;
  }

  getLkpdList(user) {
    const data = this.read();
    return data.lkpd
      .filter(l => user.role === 'admin' || l.teacher_id === user.id)
      .map(l => ({
        ...l,
        assigned_classes: data.assignments.filter(a => a.lkpd_id === l.id).map(a => ({ assignment_id: a.id, class_id: a.class_id, class_name: a.class_name }))
      }));
  }

  getLkpdById(id) {
    return this.read().lkpd.find(l => l.id === id);
  }

  createLkpd(user, input) {
    const data = this.read();
    const fields = lkpdUtil.normalizeLkpd(input);
    if (!fields.title) throw bad('Judul LKPD wajib diisi.');
    const lkpd = {
      ...lkpdUtil.EMPTY_LKPD,
      subject: user.subject || 'Umum',
      grade: '',
      ...fields,
      id: uid('lkpd'),
      teacher_id: user.id,
      status: 'draft',
      created_at: nowIso()
    };
    data.lkpd.push(lkpd);
    this.write(data);
    return lkpd;
  }

  updateLkpd(id, input) {
    const data = this.read();
    const idx = data.lkpd.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const fields = lkpdUtil.normalizeLkpd(input);
    if (fields.title !== undefined && !fields.title) throw bad('Judul LKPD tidak boleh kosong.');
    data.lkpd[idx] = { ...data.lkpd[idx], ...fields, updated_at: nowIso() };
    // Nama tugas turunan mengikuti mata pelajaran LKPD.
    if (fields.subject) data.assignments.forEach(a => { if (a.lkpd_id === id) a.subject = fields.subject; });
    this.write(data);
    return data.lkpd[idx];
  }

  duplicateLkpd(id, user) {
    const src = this.getLkpdById(id);
    if (!src) return null;
    const data = this.read();
    const copy = JSON.parse(JSON.stringify(src));
    Object.assign(copy, {
      id: uid('lkpd'),
      teacher_id: user.id,
      title: `${src.title} (Salinan)`,
      status: 'draft',
      created_at: nowIso()
    });
    delete copy.updated_at;
    data.lkpd.push(copy);
    this.write(data);
    return copy;
  }

  // Menghapus LKPD beserta tugas & pengumpulan siswa. Tanpa force, ditolak bila sudah ada pengumpulan.
  deleteLkpd(id, { force = false } = {}) {
    const data = this.read();
    const idx = data.lkpd.findIndex(l => l.id === id);
    if (idx === -1) return false;
    const assignIds = data.assignments.filter(a => a.lkpd_id === id).map(a => a.id);
    const subCount = data.submissions.filter(s => assignIds.includes(s.assignment_id) && s.status !== 'draft').length;
    if (subCount > 0 && !force) {
      throw conflict(`LKPD ini sudah ditugaskan dan memiliki ${subCount} pengumpulan siswa. Menghapusnya akan menghapus semua tugas & nilai terkait.`);
    }
    data.lkpd.splice(idx, 1);
    this.write(data);
    return true;
  }

  // ---------------------------------------------------------------- assignments
  assertAssignmentAccess(user, id) {
    const a = this.read().assignments.find(x => x.id === id);
    if (!a) throw notFound('Tugas tidak ditemukan.');
    if (user.role === 'teacher' && a.teacher_id !== user.id) throw forbidden('Tugas ini bukan milik Anda.');
    if (user.role === 'student') {
      const u = this.findUserById(user.id);
      if (!u || u.class_id !== a.class_id) throw forbidden('Tugas ini bukan untuk kelas Anda.');
    }
    return a;
  }

  getAssignmentsForTeacher(user) {
    const data = this.read();
    return data.assignments
      .filter(a => a.status === 'active' && (user.role === 'admin' || a.teacher_id === user.id))
      .map(a => {
        const cls = data.classes.find(c => c.id === a.class_id);
        const lkpd = data.lkpd.find(l => l.id === a.lkpd_id);
        const subs = data.submissions.filter(s => s.assignment_id === a.id);
        const totalStudents = data.students.filter(s => s.class_id === a.class_id && s.status === 'active').length;
        return {
          ...a,
          class_name: cls ? cls.name : a.class_name,
          lkpd_title: lkpd ? lkpd.title : '-',
          total_students: totalStudents,
          submitted_count: subs.filter(s => s.status === 'submitted' || s.status === 'graded').length,
          graded_count: subs.filter(s => s.status === 'graded').length,
          draft_count: subs.filter(s => s.status === 'draft').length
        };
      })
      .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  }

  getAssignmentsForStudent(studentUserId) {
    const data = this.read();
    const user = data.users.find(u => u.id === studentUserId);
    if (!user || !user.class_id) return [];
    const now = Date.now();
    return data.assignments
      .filter(a => a.class_id === user.class_id && a.status === 'active')
      .map(a => {
        const sub = data.submissions.find(s => s.assignment_id === a.id && s.student_id === studentUserId);
        const lkpd = data.lkpd.find(l => l.id === a.lkpd_id);
        const status = sub ? sub.status : 'not_started';
        const done = status === 'submitted' || status === 'graded';
        return {
          ...a,
          submissionStatus: status,
          submissionId: sub ? sub.id : null,
          score: sub && sub.status === 'graded' ? sub.score : null,
          revision_note: sub && sub.status === 'draft' ? (sub.revision_note || null) : null,
          is_overdue: !done && new Date(a.due_date).getTime() < now,
          lkpd_title: lkpd ? lkpd.title : a.title,
          material_text: lkpd ? lkpd.material_text || '' : '',
          material_links: lkpd ? lkpd.material_links || [] : []
        };
      })
      .sort((x, y) => String(x.due_date).localeCompare(String(y.due_date)));
  }

  createAssignment(user, input) {
    const data = this.read();
    const title = String(input.title || '').trim();
    if (!input.lkpd_id || !input.class_id || !title || !input.due_date) {
      throw bad('LKPD, Kelas, Judul, dan Batas Waktu wajib diisi.');
    }
    const due = new Date(input.due_date);
    if (Number.isNaN(due.getTime())) throw bad('Format batas waktu tidak valid.');
    if (due.getTime() < Date.now() - 60 * 1000) throw bad('Batas waktu pengumpulan tidak boleh di masa lalu.');

    const lkpd = this.assertLkpdAccess(user, input.lkpd_id);
    const cls = this.assertClassAccess(user, input.class_id);
    if (data.assignments.some(a => a.lkpd_id === lkpd.id && a.class_id === cls.id && a.status === 'active')) {
      throw conflict(`LKPD "${lkpd.title}" sudah ditugaskan ke kelas ${cls.name}.`);
    }
    if (!(lkpd.questions && lkpd.questions.length) && !(lkpd.activities && lkpd.activities.length) && !(lkpd.reflection_prompts && lkpd.reflection_prompts.length)) {
      throw bad('LKPD masih kosong. Tambahkan minimal satu aktivitas, soal, atau refleksi sebelum ditugaskan.');
    }

    const assignment = {
      id: uid('asg'),
      lkpd_id: lkpd.id,
      class_id: cls.id,
      teacher_id: user.id,
      title,
      subject: lkpd.subject || cls.subject || 'Umum',
      class_name: cls.name,
      status: 'active',
      start_date: nowIso(),
      due_date: due.toISOString(),
      instructions: String(input.instructions || '').trim() || 'Kerjakan seluruh bagian LKPD sebelum batas waktu.',
      created_at: nowIso()
    };
    data.assignments.push(assignment);
    const l = data.lkpd.find(x => x.id === lkpd.id);
    if (l) l.status = 'published';
    this.logActivity(data, {
      user_id: user.id, teacher_id: user.id, role: 'teacher', icon: 'clipboard-list',
      title: 'Tugas Baru Diterbitkan',
      description: `Menugaskan "${assignment.title}" untuk Kelas ${assignment.class_name}`
    });
    this.write(data);
    return assignment;
  }

  updateAssignment(user, id, input) {
    const data = this.read();
    const a = this.assertAssignmentAccess(user, id);
    const idx = data.assignments.findIndex(x => x.id === a.id);
    const patch = {};
    if (input.title !== undefined) {
      const t = String(input.title).trim();
      if (!t) throw bad('Judul penugasan tidak boleh kosong.');
      patch.title = t;
    }
    if (input.due_date !== undefined) {
      const d = new Date(input.due_date);
      if (Number.isNaN(d.getTime())) throw bad('Format batas waktu tidak valid.');
      patch.due_date = d.toISOString();
    }
    if (input.instructions !== undefined) patch.instructions = String(input.instructions).trim();
    data.assignments[idx] = { ...a, ...patch, updated_at: nowIso() };
    this.write(data);
    return data.assignments[idx];
  }

  deleteAssignment(user, id) {
    const data = this.read();
    const a = this.assertAssignmentAccess(user, id);
    data.assignments = data.assignments.filter(x => x.id !== a.id);
    this.write(data); // pengumpulan terkait dibersihkan oleh cleanupData
    return true;
  }

  // ---------------------------------------------------------------- submissions
  _decorateSubmission(data, s) {
    const assign = data.assignments.find(a => a.id === s.assignment_id) || {};
    const user = data.users.find(u => u.id === s.student_id);
    const student = data.students.find(st => st.user_id === s.student_id);
    const cls = data.classes.find(c => c.id === assign.class_id);
    return {
      ...s,
      student_name: user ? user.name : (s.student_name || 'Siswa'),
      student_nis: user ? user.nip_or_nis : (s.student_nis || '-'),
      student_status: student ? student.status : 'active',
      assignment_title: assign.title || 'Tugas LKPD',
      subject: assign.subject || '',
      due_date: assign.due_date || null,
      class_id: assign.class_id || '',
      class_name: cls ? cls.name : (assign.class_name || '-'),
      is_late: Boolean(s.submitted_at && assign.due_date && new Date(s.submitted_at) > new Date(assign.due_date))
    };
  }

  getSubmissionSheet(data, s) {
    const assign = data.assignments.find(a => a.id === s.assignment_id);
    const lkpd = assign && data.lkpd.find(l => l.id === assign.lkpd_id);
    if (!lkpd) return { sheet: [], summary: lkpdUtil.summarizeSheet([]) };
    const sheet = lkpdUtil.buildSheet(lkpd, s.answers || {});
    return { sheet, summary: lkpdUtil.summarizeSheet(sheet) };
  }

  // Daftar untuk guru: hanya tugas miliknya & tanpa draft. Ringkas (tanpa jawaban lengkap).
  getSubmissionsForTeacher(user, filter = {}) {
    const data = this.read();
    const mine = new Set(data.assignments.filter(a => user.role === 'admin' || a.teacher_id === user.id).map(a => a.id));
    return data.submissions
      .filter(s => mine.has(s.assignment_id) && s.status !== 'draft')
      .map(s => this._decorateSubmission(data, s))
      .filter(s => (!filter.assignment_id || s.assignment_id === filter.assignment_id)
        && (!filter.class_id || s.class_id === filter.class_id)
        && (!filter.status || s.status === filter.status))
      .map(s => {
        const { answers, ...rest } = s;
        void answers;
        return rest;
      })
      .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')));
  }

  // Siswa hanya melihat miliknya sendiri.
  getSubmissionsForStudent(studentUserId) {
    const data = this.read();
    return data.submissions
      .filter(s => s.student_id === studentUserId)
      .map(s => this._decorateSubmission(data, s));
  }

  getSubmissionDetail(user, id) {
    const data = this.read();
    const s = data.submissions.find(x => x.id === id);
    if (!s) throw notFound('Data pengumpulan tidak ditemukan.');
    const assign = data.assignments.find(a => a.id === s.assignment_id);
    if (user.role === 'student') {
      if (s.student_id !== user.id) throw forbidden();
    } else if (user.role === 'teacher') {
      if (!assign || assign.teacher_id !== user.id) throw forbidden();
    }
    const base = this._decorateSubmission(data, s);
    const { sheet, summary } = this.getSubmissionSheet(data, s);
    const lkpd = assign && data.lkpd.find(l => l.id === assign.lkpd_id);
    return {
      ...base,
      sheet: user.role === 'student' ? sheet.map(({ correct_index, is_correct, ...rest }) => (s.status === 'graded' ? { ...rest, correct_index, is_correct } : rest)) : sheet,
      summary,
      learning_objectives: lkpd ? lkpd.objectives || [] : []
    };
  }

  // Simpan draft atau kumpulkan jawaban siswa.
  saveStudentSubmission(user, assignmentId, rawAnswers, submit) {
    const data = this.read();
    const account = data.users.find(u => u.id === user.id);
    const assign = data.assignments.find(a => a.id === assignmentId && a.status === 'active');
    if (!assign) throw notFound('Tugas tidak ditemukan atau sudah tidak aktif.');
    if (!account || account.class_id !== assign.class_id) throw forbidden('Tugas ini bukan untuk kelas Anda.');
    const lkpd = data.lkpd.find(l => l.id === assign.lkpd_id);
    if (!lkpd) throw notFound('LKPD untuk tugas ini sudah dihapus.');

    let sub = data.submissions.find(s => s.assignment_id === assignmentId && s.student_id === user.id);
    if (sub && (sub.status === 'submitted' || sub.status === 'graded')) {
      throw conflict(sub.status === 'graded'
        ? 'Tugas ini sudah dinilai dan tidak dapat diubah.'
        : 'Tugas ini sudah dikumpulkan. Minta guru mengembalikannya jika perlu direvisi.');
    }

    const answers = lkpdUtil.sanitizeAnswers(rawAnswers, lkpd);
    if (!sub) {
      sub = {
        id: uid('sub'),
        assignment_id: assignmentId,
        student_id: user.id,
        student_name: account.name,
        student_nis: account.nip_or_nis,
        status: 'draft',
        answers,
        submitted_at: null,
        score: null,
        feedback: null,
        graded_at: null,
        created_at: nowIso()
      };
      data.submissions.push(sub);
    } else {
      sub.answers = answers; // jawaban yang dikirim adalah keadaan lengkap lembar kerja
    }
    sub.updated_at = nowIso();

    if (submit) {
      sub.status = 'submitted';
      sub.submitted_at = nowIso();
      sub.revision_note = null;
      this.logActivity(data, {
        user_id: user.id, teacher_id: assign.teacher_id, role: 'student', icon: 'check-circle',
        title: 'Pengumpulan Tugas Baru',
        description: `${account.name} mengumpulkan "${assign.title}".`
      });
    }
    this.write(data);
    return this._decorateSubmission(data, sub);
  }

  // Guru mengembalikan pengumpulan agar siswa merevisi jawaban.
  returnSubmission(user, id, note) {
    const data = this.read();
    const sub = data.submissions.find(s => s.id === id);
    if (!sub) throw notFound('Data pengumpulan tidak ditemukan.');
    const assign = data.assignments.find(a => a.id === sub.assignment_id);
    if (!assign || assign.teacher_id !== user.id) throw forbidden();
    if (sub.status === 'draft') throw conflict('Siswa belum mengumpulkan tugas ini.');
    sub.status = 'draft';
    sub.score = null;
    sub.graded_at = null;
    sub.submitted_at = null;
    sub.revision_note = String(note || '').trim() || 'Guru meminta Anda memperbaiki jawaban.';
    this.write(data);
    return this._decorateSubmission(data, sub);
  }

  submitGrade(user, id, g) {
    const data = this.read();
    const sub = data.submissions.find(s => s.id === id);
    if (!sub) throw notFound('Data pengumpulan tidak ditemukan.');
    const assign = data.assignments.find(a => a.id === sub.assignment_id);
    if (!assign || assign.teacher_id !== user.id) throw forbidden('Tugas ini bukan milik Anda.');
    if (sub.status === 'draft') throw conflict('Siswa belum mengumpulkan tugas ini.');
    const score = Number(g.score);
    if (g.score === '' || g.score === null || g.score === undefined || !Number.isFinite(score) || score < 0 || score > 100) {
      throw bad('Nilai harus berupa angka 0 sampai 100.');
    }
    const list = (v) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).slice(0, 20) : []);
    sub.status = 'graded';
    sub.score = Math.round(score * 100) / 100;
    sub.feedback = String(g.feedback || '').trim();
    sub.strengths = list(g.strengths);
    sub.weaknesses = list(g.weaknesses);
    sub.misconceptions = list(g.misconceptions);
    sub.graded_at = nowIso();
    sub.graded_by = user.id;
    this.logActivity(data, {
      user_id: user.id, teacher_id: user.id, role: 'teacher', icon: 'award',
      title: 'Penilaian Selesai',
      description: `Nilai ${sub.score} diberikan untuk ${sub.student_name}`
    });
    this.write(data);
    return this._decorateSubmission(data, sub);
  }

  getStudentResults(studentUserId) {
    const data = this.read();
    return data.submissions
      .filter(s => s.student_id === studentUserId && s.status === 'graded')
      .map(s => {
        const d = this._decorateSubmission(data, s);
        return { ...d, assignmentTitle: d.assignment_title, passing_score: PASSING_SCORE, passed: s.score >= PASSING_SCORE };
      })
      .sort((a, b) => String(b.graded_at).localeCompare(String(a.graded_at)));
  }

  // ---------------------------------------------------------------- follow-ups
  _decorateFollowup(data, f) {
    const u = data.users.find(x => x.id === f.student_id);
    return { ...f, student_name: u ? u.name : (f.student_name || 'Siswa') };
  }

  getFollowupsForTeacher(user) {
    const data = this.read();
    return data.followups
      .filter(f => user.role === 'admin' || f.teacher_id === user.id)
      .map(f => this._decorateFollowup(data, f))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  getFollowupsForStudent(studentUserId) {
    const data = this.read();
    return data.followups
      .filter(f => f.student_id === studentUserId)
      .map(f => this._decorateFollowup(data, f))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  createFollowup(user, input) {
    const data = this.read();
    const topic = String(input.topic || '').trim();
    if (!input.student_id || !topic) throw bad('Siswa dan topik penguatan wajib diisi.');
    const student = data.students.find(s => s.user_id === input.student_id || s.id === input.student_id);
    if (!student) throw notFound('Siswa tidak ditemukan.');
    this.assertClassAccess(user, student.class_id);
    const f = {
      id: uid('flw'),
      teacher_id: user.id,
      student_id: student.user_id,
      assignment_id: input.assignment_id || null,
      subject: String(input.subject || user.subject || 'Umum'),
      topic,
      problem: String(input.problem || '').trim() || 'Perlu pendalaman materi',
      recommendations: Array.isArray(input.recommendations) && input.recommendations.length
        ? input.recommendations.map(String).slice(0, 10)
        : ['Buka materi penguatan', 'Kerjakan latihan evaluasi', 'Selesaikan refleksi mandiri'],
      status: 'active',
      progress: 0,
      created_at: nowIso()
    };
    data.followups.push(f);
    this.write(data);
    return this._decorateFollowup(data, f);
  }

  updateFollowupProgress(user, id, progress) {
    const data = this.read();
    const f = data.followups.find(x => x.id === id);
    if (!f) throw notFound('Tindak lanjut tidak ditemukan.');
    if (f.student_id !== user.id) throw forbidden('Tindak lanjut ini bukan untuk Anda.');
    const p = Number(progress);
    if (!Number.isFinite(p)) throw bad('Nilai progres tidak valid.');
    f.progress = Math.max(f.progress || 0, Math.min(100, Math.max(0, Math.round(p)))); // tidak bisa mundur
    f.status = f.progress >= 100 ? 'completed' : 'active';
    if (f.status === 'completed') f.completed_at = nowIso();
    this.write(data);
    return this._decorateFollowup(data, f);
  }

  // ---------------------------------------------------------------- AI configs (per pengguna)
  getAiConfigs(userId) {
    return this.read().ai_configs.filter(c => c.user_id === userId);
  }

  getActiveAiConfig(userId) {
    const mine = this.getAiConfigs(userId);
    return mine.find(c => c.is_active) || mine[0] || null;
  }

  saveAiConfig(userId, c) {
    const data = this.read();
    data.ai_configs.forEach(x => { if (x.user_id === userId) x.is_active = false; });
    let existing = data.ai_configs.find(x => x.user_id === userId && x.provider === c.provider);
    if (existing) {
      existing.model = c.model;
      existing.endpoint = c.endpoint;
      if (c.api_key) existing.api_key = c.api_key;
      existing.is_active = true;
      existing.status = c.status || 'connected';
      existing.updated_at = nowIso();
    } else {
      existing = {
        id: uid('cfg'), user_id: userId, provider: c.provider, model: c.model, endpoint: c.endpoint,
        api_key: c.api_key || '', is_active: true, status: c.status || 'connected',
        created_at: nowIso(), updated_at: nowIso()
      };
      data.ai_configs.push(existing);
    }
    this.write(data);
    return existing;
  }

  // ---------------------------------------------------------------- analytics & dashboards
  getClassAnalytics(user) {
    const data = this.read();
    const myAssigns = data.assignments.filter(a => user.role === 'admin' || a.teacher_id === user.id);
    const myIds = new Set(myAssigns.map(a => a.id));
    const subs = data.submissions.filter(s => myIds.has(s.assignment_id) && s.status !== 'draft');
    const graded = subs.filter(s => s.status === 'graded' && s.score !== null);

    const avg = graded.length ? Math.round(graded.reduce((n, s) => n + s.score, 0) / graded.length) : 0;
    const passed = graded.filter(s => s.score >= PASSING_SCORE).length;

    // Butir pilihan ganda dengan tingkat kesalahan tertinggi = topik tersulit (dihitung dari data nyata).
    const items = new Map();
    for (const s of subs) {
      const { sheet } = this.getSubmissionSheet(data, s);
      for (const it of sheet) {
        if (it.section !== 'question' || it.type !== 'multiple_choice' || it.correct_index === null || it.correct_index === undefined) continue;
        if (it.answer_index === null) continue;
        const key = `${s.assignment_id}:${it.id}`;
        const rec = items.get(key) || { topic: it.prompt, total: 0, wrong: 0 };
        rec.total += 1;
        if (!it.is_correct) rec.wrong += 1;
        items.set(key, rec);
      }
    }
    const difficultTopics = [...items.values()]
      .filter(r => r.total >= 1)
      .map(r => ({ topic: r.topic.length > 90 ? r.topic.slice(0, 87) + '…' : r.topic, errorRate: Math.round((r.wrong / r.total) * 100), answered: r.total }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)
      .map(r => ({ topic: r.topic, difficulty: r.errorRate >= 50 ? 'Tinggi' : (r.errorRate >= 25 ? 'Sedang' : 'Rendah'), errorRate: `${r.errorRate}%`, answered: r.answered }));

    let summary;
    if (graded.length === 0) {
      summary = 'Belum ada tugas yang dinilai. Ringkasan akan muncul setelah Anda menilai pengumpulan siswa.';
    } else {
      const mastery = Math.round((passed / graded.length) * 100);
      summary = `Dari ${graded.length} pengumpulan yang dinilai, rata-rata nilai ${avg} dan ${mastery}% siswa mencapai KKM ${PASSING_SCORE}. `
        + `${graded.length - passed} pengumpulan masih di bawah KKM dan perlu remedial`
        + (difficultTopics.length ? `; butir tersulit: "${difficultTopics[0].topic}" (${difficultTopics[0].errorRate} salah).` : '.');
    }

    return {
      averageScore: avg,
      masteryRate: graded.length ? Math.round((passed / graded.length) * 100) : 0,
      totalSubmissions: subs.length,
      gradedCount: graded.length,
      remedialCount: graded.filter(s => s.score < PASSING_SCORE).length,
      enrichmentCount: graded.filter(s => s.score >= 90).length,
      passingScore: PASSING_SCORE,
      difficultTopics,
      aiSummary: summary
    };
  }

  getTeacherStats(user) {
    const data = this.read();
    const classes = data.classes.filter(c => c.teacher_id === user.id && c.status !== 'archived');
    const classIds = new Set(classes.map(c => c.id));
    const assignments = data.assignments.filter(a => a.teacher_id === user.id && a.status === 'active');
    const assignIds = new Set(assignments.map(a => a.id));
    return {
      totalClasses: classes.length,
      totalStudents: data.students.filter(s => classIds.has(s.class_id) && s.status === 'active').length,
      totalLkpd: data.lkpd.filter(l => l.teacher_id === user.id).length,
      activeAssignments: assignments.length,
      ungradedSubmissions: data.submissions.filter(s => assignIds.has(s.assignment_id) && s.status === 'submitted').length,
      studentsNeedingFollowup: new Set(data.followups.filter(f => f.teacher_id === user.id && f.status === 'active').map(f => f.student_id)).size,
      classes,
      recentActivities: data.activities.filter(a => a.teacher_id === user.id || a.user_id === user.id).slice(0, 8)
    };
  }

  getStudentStats(studentUserId) {
    const data = this.read();
    const list = this.getAssignmentsForStudent(studentUserId);
    const subs = data.submissions.filter(s => s.student_id === studentUserId);
    const done = (a) => a.submissionStatus === 'submitted' || a.submissionStatus === 'graded';
    const graded = subs.filter(s => s.status === 'graded' && s.score !== null)
      .sort((a, b) => String(b.graded_at).localeCompare(String(a.graded_at)));
    const latest = graded[0] || null;
    const followups = data.followups.filter(f => f.student_id === studentUserId && f.status === 'active');
    return {
      activeTasks: list.filter(a => !done(a)).length,
      completedTasks: list.filter(done).length,
      overdueTasks: list.filter(a => a.is_overdue).length,
      latestGrade: latest ? { score: latest.score, feedback: latest.feedback, gradedAt: latest.graded_at } : null,
      activeFollowupsCount: followups.length,
      followups: followups.map(f => this._decorateFollowup(data, f)),
      assignments: list
    };
  }
}

const instance = new Database();
instance.PASSING_SCORE = PASSING_SCORE;
module.exports = instance;
