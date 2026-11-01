// Uji end-to-end alur LMS: guru -> LKPD -> tugas -> siswa -> pengumpulan -> penilaian.
// Memakai database sementara (tidak menyentuh data asli):  npm test
const os = require('os');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const http = require('http');

const tmpFile = path.join(os.tmpdir(), `lms-test-${process.pid}-${Date.now()}.json`);
process.env.DATA_FILE = tmpFile;
process.env.NODE_ENV = 'test';
process.env.MOCK_AI = 'true';
delete process.env.MONGODB_URI;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.GEMINI_API_KEY;
delete process.env.AI_API_KEY;
delete process.env.OPENAI_API_KEY;

const app = require('../backend/server');
let server;
let base;

async function api(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* bukan JSON (mis. CSV) */ }
  return { status: res.status, body: json, text, headers: res.headers };
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}\n     ${err.stack.split('\n').slice(0, 3).join('\n     ')}`);
    failed++;
  }
}

const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const login = async (email, password = 'password123') => {
  const r = await api('POST', '/api/auth/login', { body: { email, password } });
  assert.strictEqual(r.status, 200, `login ${email} gagal: ${r.text}`);
  return { token: r.body.data.token, user: r.body.data.user };
};

async function run() {
  console.log('🧪 AI CLASSROOM — uji alur lengkap guru ⇄ siswa\n');
  await new Promise(r => { server = http.createServer(app).listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;

  const S = {}; // state bersama antar uji

  console.log('Dasar & akun');
  await test('health check & halaman utama tersaji', async () => {
    const h = await api('GET', '/api/health');
    assert.strictEqual(h.status, 200);
    const idx = await fetch(base + '/');
    assert.strictEqual(idx.status, 200);
  });
  await test('API tanpa token ditolak 401', async () => {
    assert.strictEqual((await api('GET', '/api/assignments')).status, 401);
  });
  await test('admin login & membuat dua guru (kata sandi lemah/duplikat ditolak)', async () => {
    S.admin = await login('admin@aiclassroom.sch.id');
    const weak = await api('POST', '/api/admin/teachers', { token: S.admin.token, body: { name: 'X', email: 'x@s.id', password: '123' } });
    assert.strictEqual(weak.status, 400);
    const a = await api('POST', '/api/admin/teachers', { token: S.admin.token, body: { name: 'Budi Santoso', email: 'budi@s.id', subject: 'Kimia', password: 'password123' } });
    assert.strictEqual(a.status, 201);
    const dup = await api('POST', '/api/admin/teachers', { token: S.admin.token, body: { name: 'Budi 2', email: 'BUDI@s.id', password: 'password123' } });
    assert.strictEqual(dup.status, 409);
    const b = await api('POST', '/api/admin/teachers', { token: S.admin.token, body: { name: 'Sari Dewi', email: 'sari@s.id', subject: 'Fisika', password: 'password123' } });
    assert.strictEqual(b.status, 201);
    S.tA = await login('budi@s.id');
    S.tB = await login('sari@s.id');
  });

  console.log('\nKelas, siswa & isolasi antar guru');
  await test('tiap guru hanya melihat kelas miliknya', async () => {
    const c1 = await api('POST', '/api/classes', { token: S.tA.token, body: { name: 'X-1', subject: 'Kimia' } });
    assert.strictEqual(c1.status, 201);
    S.classA = c1.body.data.id;
    const c2 = await api('POST', '/api/classes', { token: S.tB.token, body: { name: 'X-2', subject: 'Fisika' } });
    S.classB = c2.body.data.id;
    const la = await api('GET', '/api/classes', { token: S.tA.token });
    assert.deepStrictEqual(la.body.data.map(c => c.id), [S.classA]);
    const lb = await api('GET', '/api/classes', { token: S.tB.token });
    assert.deepStrictEqual(lb.body.data.map(c => c.id), [S.classB]);
    assert.strictEqual((await api('GET', `/api/classes/${S.classA}/students`, { token: S.tB.token })).status, 403);
    assert.strictEqual((await api('DELETE', `/api/classes/${S.classA}`, { token: S.tB.token })).status, 403);
  });
  await test('impor siswa: NIS ganda dilewati & dilaporkan, id unik walau diimpor bersamaan', async () => {
    const r = await api('POST', `/api/classes/${S.classA}/students/import`, {
      token: S.tA.token,
      body: { students: [
        { name: 'Ahmad Fauzi', nis: '10241' },
        { name: 'Siti Nurhaliza', nis: '10242' },
        { name: 'Rafi Pratama', nis: '10243' },
        { name: 'Duplikat', nis: '10241' },
        { name: '', nis: '999' }
      ] }
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.length, 3);
    assert.strictEqual(r.body.skipped.length, 2);
    assert.strictEqual(new Set(r.body.data.map(s => s.id)).size, 3);
    const other = await api('POST', `/api/classes/${S.classB}/students`, { token: S.tB.token, body: { name: 'Dina Kelas B', nis: '20001' } });
    assert.strictEqual(other.status, 201);
    S.s1 = await login('10241@aiclassroom.sch.id');
    S.s2 = await login('10242@aiclassroom.sch.id');
    S.sB = await login('20001@aiclassroom.sch.id');
    assert.strictEqual(S.s1.user.class_name, 'X-1');
  });

  console.log('\nLKPD (satu format dari builder sampai penilaian)');
  await test('guru membuat LKPD terstruktur; guru lain tidak bisa melihat/mengubah', async () => {
    const r = await api('POST', '/api/lkpd', { token: S.tA.token, body: {
      title: 'Prinsip Kimia Hijau',
      subject: 'Kimia',
      grade: 'X',
      objectives: ['Mengidentifikasi prinsip kimia hijau'],
      material_text: 'Kimia hijau mengurangi limbah.',
      material_links: [{ title: 'Modul', url: 'https://example.org/modul' }, { title: 'bad', url: 'javascript:alert(1)' }],
      activities: [
        { title: 'Aktivitas 1', instructions: 'Bandingkan pelarut air vs benzena.' },
        { title: 'Aktivitas 2', instructions: 'Hitung atom economy.' }
      ],
      questions: [
        { type: 'multiple_choice', prompt: 'Prinsip ke-5 menekankan?', options: ['Pelarut aman', 'Pestisida dosis tinggi', 'Suhu ekstrem'], correct_index: 0 },
        { type: 'essay', prompt: 'Mengapa pencegahan limbah lebih utama?' }
      ],
      reflection_prompts: ['Apa yang paling Anda pahami?', 'Apa yang masih sulit?']
    } });
    assert.strictEqual(r.status, 201, r.text);
    S.lkpd = r.body.data;
    assert.strictEqual(S.lkpd.activities.length, 2);
    assert.strictEqual(S.lkpd.questions.length, 2);
    assert.strictEqual(S.lkpd.questions[0].type, 'multiple_choice');
    assert.strictEqual(S.lkpd.material_links.length, 1, 'tautan non-http harus dibuang');
    assert.strictEqual(S.lkpd.reflection_prompts.length, 2);

    assert.strictEqual((await api('GET', `/api/lkpd/${S.lkpd.id}`, { token: S.tB.token })).status, 403);
    assert.strictEqual((await api('PUT', `/api/lkpd/${S.lkpd.id}`, { token: S.tB.token, body: { title: 'hack' } })).status, 403);
    assert.strictEqual((await api('GET', '/api/lkpd', { token: S.tB.token })).body.data.length, 0);
    assert.strictEqual((await api('GET', '/api/lkpd', { token: S.tA.token })).body.data.length, 1);
    assert.strictEqual((await api('GET', `/api/lkpd/${S.lkpd.id}`, { token: S.s1.token })).status, 403);
  });
  await test('LKPD kosong tidak bisa ditugaskan', async () => {
    const empty = await api('POST', '/api/lkpd', { token: S.tA.token, body: { title: 'Kosong' } });
    const r = await api('POST', '/api/assignments', { token: S.tA.token, body: { lkpd_id: empty.body.data.id, class_id: S.classA, title: 't', due_date: future(3) } });
    assert.strictEqual(r.status, 400);
    await api('DELETE', `/api/lkpd/${empty.body.data.id}`, { token: S.tA.token });
  });
  await test('generator AI mengembalikan format yang sama dengan builder', async () => {
    const r = await api('POST', '/api/ai/generate-lkpd', { token: S.tA.token, body: { subject: 'Kimia', grade: 'X', topic: 'Redoks' } });
    assert.strictEqual(r.status, 200, r.text);
    const d = r.body.data;
    assert.ok(d.title && Array.isArray(d.objectives) && d.objectives.length);
    assert.ok(d.activities.every(a => a.id && a.instructions));
    assert.ok(d.questions.some(q => q.type === 'multiple_choice' && q.options.length >= 2));
    assert.ok(d.reflection_prompts.every(r2 => r2.id && r2.prompt));
  });

  console.log('\nPenugasan');
  await test('validasi penugasan & hak akses kelas/LKPD', async () => {
    const body = { lkpd_id: S.lkpd.id, class_id: S.classA, title: 'Tugas Kimia Hijau', due_date: future(5), instructions: 'Kerjakan' };
    assert.strictEqual((await api('POST', '/api/assignments', { token: S.tA.token, body: { ...body, due_date: '2020-01-01T00:00:00Z' } })).status, 400, 'deadline lampau');
    assert.strictEqual((await api('POST', '/api/assignments', { token: S.tA.token, body: { ...body, due_date: 'bukan-tanggal' } })).status, 400);
    assert.strictEqual((await api('POST', '/api/assignments', { token: S.tB.token, body: { ...body, class_id: S.classB } })).status, 403, 'LKPD guru lain');
    assert.strictEqual((await api('POST', '/api/assignments', { token: S.tA.token, body: { ...body, class_id: S.classB } })).status, 403, 'kelas guru lain');
    const ok = await api('POST', '/api/assignments', { token: S.tA.token, body });
    assert.strictEqual(ok.status, 201, ok.text);
    S.asg = ok.body.data;
    assert.strictEqual((await api('POST', '/api/assignments', { token: S.tA.token, body })).status, 409, 'penugasan ganda');
    const l = await api('GET', '/api/lkpd', { token: S.tA.token });
    assert.strictEqual(l.body.data[0].status, 'published');
    assert.strictEqual(l.body.data[0].assigned_classes[0].class_name, 'X-1');
  });
  await test('tugas sampai ke siswa kelas yang benar saja', async () => {
    const a1 = await api('GET', '/api/assignments', { token: S.s1.token });
    assert.strictEqual(a1.body.data.length, 1);
    assert.strictEqual(a1.body.data[0].id, S.asg.id);
    assert.strictEqual(a1.body.data[0].submissionStatus, 'not_started');
    assert.strictEqual(a1.body.data[0].is_overdue, false);
    assert.strictEqual((await api('GET', '/api/assignments', { token: S.sB.token })).body.data.length, 0);
    assert.strictEqual((await api('GET', `/api/assignments/${S.asg.id}`, { token: S.sB.token })).status, 403);
    assert.strictEqual((await api('GET', '/api/assignments', { token: S.tB.token })).body.data.length, 0);
    const tl = await api('GET', '/api/assignments', { token: S.tA.token });
    assert.strictEqual(tl.body.data[0].total_students, 3);
    assert.strictEqual(tl.body.data[0].submitted_count, 0);
  });
  await test('siswa menerima LKPD guru persis (tanpa kunci jawaban)', async () => {
    const d = await api('GET', `/api/assignments/${S.asg.id}`, { token: S.s1.token });
    assert.strictEqual(d.status, 200);
    const l = d.body.data.lkpd;
    assert.strictEqual(l.title, 'Prinsip Kimia Hijau');
    assert.deepStrictEqual(l.activities.map(a => a.title), ['Aktivitas 1', 'Aktivitas 2']);
    assert.deepStrictEqual(l.questions.map(q => q.prompt), ['Prinsip ke-5 menekankan?', 'Mengapa pencegahan limbah lebih utama?']);
    assert.ok(!('correct_index' in l.questions[0]), 'kunci jawaban bocor ke siswa!');
    assert.strictEqual(d.body.data.assignment.class_name, 'X-1');
    assert.strictEqual((await api('GET', `/api/lkpd/${S.lkpd.id}`, { token: S.s1.token })).status, 403);
  });

  console.log('\nPengerjaan siswa → guru');
  await test('draft tersimpan, tidak muncul di guru, dan dihitung "tugas aktif" siswa', async () => {
    const q = S.lkpd.questions; const act = S.lkpd.activities; const ref = S.lkpd.reflection_prompts;
    S.answers = {
      activities: { [act[0].id]: 'Air lebih aman daripada benzena.', [act[1].id]: 'AE = massa produk / massa reaktan.' },
      questions: { [q[0].id]: 0, [q[1].id]: 'Karena mencegah lebih murah.' },
      reflections: { [ref[0].id]: 'Paham konsep limbah.', [ref[1].id]: 'Hitungan masih sulit.' },
      hack: 'tidak boleh tersimpan'
    };
    const r = await api('POST', '/api/submissions/save-draft', { token: S.s1.token, body: { assignment_id: S.asg.id, answers: S.answers } });
    assert.strictEqual(r.status, 200, r.text);
    const tl = await api('GET', '/api/submissions', { token: S.tA.token });
    assert.strictEqual(tl.body.data.length, 0, 'draft tidak boleh tampil ke guru');
    const sd = await api('GET', '/api/dashboard/student', { token: S.s1.token });
    assert.strictEqual(sd.body.data.activeTasks, 1);
    const d = await api('GET', `/api/assignments/${S.asg.id}`, { token: S.s1.token });
    assert.strictEqual(d.body.data.submission.status, 'draft');
    assert.strictEqual(d.body.data.submission.answers.questions[q[0].id], 0);
    assert.ok(!('hack' in d.body.data.submission.answers));
  });
  await test('siswa lain/kelas lain tidak bisa mengisi tugas ini', async () => {
    const r = await api('POST', '/api/submissions/save-draft', { token: S.sB.token, body: { assignment_id: S.asg.id, answers: {} } });
    assert.strictEqual(r.status, 403);
    const g = await api('POST', '/api/submissions/save-draft', { token: S.tA.token, body: { assignment_id: S.asg.id, answers: {} } });
    assert.strictEqual(g.status, 403, 'guru tidak boleh mengisi sebagai siswa');
  });
  await test('kumpulkan → guru melihat lembar jawaban berpasangan dengan soal', async () => {
    const r = await api('POST', '/api/submissions/submit', { token: S.s1.token, body: { assignment_id: S.asg.id, answers: S.answers } });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.data.status, 'submitted');

    const list = await api('GET', '/api/submissions', { token: S.tA.token });
    assert.strictEqual(list.body.data.length, 1);
    const row = list.body.data[0];
    S.sub = row.id;
    assert.strictEqual(row.student_name, 'Ahmad Fauzi');
    assert.strictEqual(row.class_name, 'X-1');
    assert.ok(!('answers' in row), 'daftar tidak boleh membawa jawaban lengkap');
    assert.strictEqual((await api('GET', '/api/submissions', { token: S.tB.token })).body.data.length, 0);

    const det = await api('GET', `/api/submissions/${S.sub}`, { token: S.tA.token });
    assert.strictEqual(det.status, 200);
    const sheet = det.body.data.sheet;
    assert.strictEqual(sheet.length, 2 + 2 + 2);
    const mc = sheet.find(x => x.type === 'multiple_choice');
    assert.strictEqual(mc.answer, 'Pelarut aman');
    assert.strictEqual(mc.is_correct, true);
    assert.strictEqual(det.body.data.summary.mc_correct, 1);
    assert.strictEqual(sheet.find(x => x.section === 'question' && x.type === 'essay').answer, 'Karena mencegah lebih murah.');
    assert.strictEqual(sheet.find(x => x.label === 'Aktivitas 1').answer, 'Air lebih aman daripada benzena.');
    assert.strictEqual(sheet.find(x => x.label === 'Refleksi 2').answer, 'Hitungan masih sulit.');
    assert.strictEqual((await api('GET', `/api/submissions/${S.sub}`, { token: S.tB.token })).status, 403);
    assert.strictEqual((await api('GET', `/api/submissions/${S.sub}`, { token: S.s2.token })).status, 403);
  });
  await test('setelah dikumpulkan tidak bisa ditimpa autosave; dashboard guru & siswa sinkron', async () => {
    const r = await api('POST', '/api/submissions/save-draft', { token: S.s1.token, body: { assignment_id: S.asg.id, answers: {} } });
    assert.strictEqual(r.status, 409);
    const sd = await api('GET', '/api/dashboard/student', { token: S.s1.token });
    assert.strictEqual(sd.body.data.activeTasks, 0);
    assert.strictEqual(sd.body.data.completedTasks, 1);
    const td = await api('GET', '/api/dashboard/teacher', { token: S.tA.token });
    assert.strictEqual(td.body.data.ungradedSubmissions, 1);
    assert.strictEqual(td.body.data.activeAssignments, 1);
    assert.strictEqual(td.body.data.totalStudents, 3);
    const tdB = await api('GET', '/api/dashboard/teacher', { token: S.tB.token });
    assert.strictEqual(tdB.body.data.ungradedSubmissions, 0);
    assert.strictEqual(tdB.body.data.activeAssignments, 0);
    assert.ok(td.body.data.recentActivities.some(a => /mengumpulkan/.test(a.description)));
    assert.ok(!tdB.body.data.recentActivities.some(a => /mengumpulkan/.test(a.description)), 'aktivitas guru lain bocor');
    const cls = await api('GET', `/api/classes/${S.classA}/students`, { token: S.tA.token });
    assert.strictEqual(cls.body.data.find(s => s.nis === '10241').progress, 100);
    assert.strictEqual(cls.body.data.find(s => s.nis === '10242').progress, 0);
  });

  console.log('\nPenilaian');
  await test('evaluasi AI memakai lembar jawaban dari server', async () => {
    const r = await api('POST', '/api/ai/evaluate', { token: S.tA.token, body: { submission_id: S.sub } });
    assert.strictEqual(r.status, 200, r.text);
    assert.ok(typeof r.body.data.score_recommendation === 'number');
    assert.strictEqual((await api('POST', '/api/ai/evaluate', { token: S.tB.token, body: { submission_id: S.sub } })).status, 403);
  });
  await test('validasi nilai & hak akses guru', async () => {
    assert.strictEqual((await api('POST', `/api/grades/${S.sub}`, { token: S.tA.token, body: { score: 101 } })).status, 400);
    assert.strictEqual((await api('POST', `/api/grades/${S.sub}`, { token: S.tA.token, body: { score: 'abc' } })).status, 400);
    assert.strictEqual((await api('POST', `/api/grades/${S.sub}`, { token: S.tA.token, body: {} })).status, 400);
    assert.strictEqual((await api('POST', `/api/grades/${S.sub}`, { token: S.tB.token, body: { score: 80 } })).status, 403);
    assert.strictEqual((await api('POST', `/api/grades/${S.sub}`, { token: S.s1.token, body: { score: 100 } })).status, 403);
  });
  await test('nilai & umpan balik langsung terlihat di sisi siswa', async () => {
    const r = await api('POST', `/api/grades/${S.sub}`, { token: S.tA.token, body: { score: 88, feedback: 'Bagus sekali', strengths: ['konsep'], weaknesses: ['hitungan'] } });
    assert.strictEqual(r.status, 200, r.text);
    const res = await api('GET', '/api/grades/student-results', { token: S.s1.token });
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].score, 88);
    assert.strictEqual(res.body.data[0].feedback, 'Bagus sekali');
    assert.strictEqual(res.body.data[0].assignmentTitle, 'Tugas Kimia Hijau');
    assert.strictEqual(res.body.data[0].passed, true);
    const sd = await api('GET', '/api/dashboard/student', { token: S.s1.token });
    assert.strictEqual(sd.body.data.latestGrade.score, 88);
    assert.strictEqual(sd.body.data.assignments[0].submissionStatus, 'graded');
    assert.strictEqual(sd.body.data.assignments[0].score, 88);
    const det = await api('GET', `/api/assignments/${S.asg.id}`, { token: S.s1.token });
    assert.strictEqual(det.body.data.submission.score, 88);
    assert.strictEqual((await api('GET', '/api/grades/student-results', { token: S.s2.token })).body.data.length, 0);
    const td = await api('GET', '/api/dashboard/teacher', { token: S.tA.token });
    assert.strictEqual(td.body.data.ungradedSubmissions, 0);
  });
  await test('siswa yang sudah dinilai melihat kunci jawaban; yang belum dinilai tidak', async () => {
    const det = await api('GET', `/api/submissions/${S.sub}`, { token: S.s1.token });
    assert.strictEqual(det.status, 200);
    assert.strictEqual(det.body.data.sheet.find(x => x.type === 'multiple_choice').is_correct, true);
  });
  await test('laporan memakai data nyata (bukan teks palsu)', async () => {
    const r = await api('GET', '/api/reports/class-analytics', { token: S.tA.token });
    assert.strictEqual(r.body.data.averageScore, 88);
    assert.strictEqual(r.body.data.masteryRate, 100);
    assert.strictEqual(r.body.data.gradedCount, 1);
    assert.strictEqual(r.body.data.difficultTopics[0].topic, 'Prinsip ke-5 menekankan?');
    const rb = await api('GET', '/api/reports/class-analytics', { token: S.tB.token });
    assert.strictEqual(rb.body.data.gradedCount, 0);
    assert.strictEqual(rb.body.data.difficultTopics.length, 0);
  });
  await test('ekspor CSV hanya milik guru & aman dari formula injection', async () => {
    await api('POST', `/api/classes/${S.classA}/students`, { token: S.tA.token, body: { name: '=HYPERLINK("http://x")', nis: '10299' } });
    const x = await login('10299@aiclassroom.sch.id');
    await api('POST', '/api/submissions/submit', { token: x.token, body: { assignment_id: S.asg.id, answers: {} } });
    const csv = await api('GET', '/api/grades/export-excel', { token: S.tA.token });
    assert.strictEqual(csv.status, 200);
    assert.ok(/text\/csv/.test(csv.headers.get('content-type')));
    assert.ok(csv.text.includes('Ahmad Fauzi'));
    assert.ok(csv.text.includes(`"'=HYPERLINK`), 'sel diawali = harus dinetralkan');
    assert.ok(!csv.text.includes('"=HYPERLINK'));
    const other = await api('GET', '/api/grades/export-excel', { token: S.tB.token });
    assert.ok(!other.text.includes('Ahmad Fauzi'), 'rekap guru lain bocor');
    assert.strictEqual((await api('GET', `/api/grades/export-excel?class_id=${S.classA}`, { token: S.tB.token })).status, 403);
  });
  await test('guru mengembalikan tugas untuk revisi → siswa bisa mengisi lagi', async () => {
    const list = await api('GET', '/api/submissions', { token: S.tA.token });
    const second = list.body.data.find(s => s.student_nis === '10299');
    const r = await api('POST', `/api/submissions/${second.id}/return`, { token: S.tA.token, body: { note: 'Isi lengkap ya' } });
    assert.strictEqual(r.status, 200, r.text);
    const x = await login('10299@aiclassroom.sch.id');
    const d = await api('GET', `/api/assignments/${S.asg.id}`, { token: x.token });
    assert.strictEqual(d.body.data.submission.status, 'draft');
    assert.strictEqual(d.body.data.submission.revision_note, 'Isi lengkap ya');
    assert.strictEqual((await api('POST', '/api/submissions/save-draft', { token: x.token, body: { assignment_id: S.asg.id, answers: {} } })).status, 200);
  });

  console.log('\nTindak lanjut');
  await test('tindak lanjut hanya untuk siswa milik guru & progres hanya oleh siswanya', async () => {
    const s2 = (await api('GET', `/api/classes/${S.classA}/students`, { token: S.tA.token })).body.data.find(s => s.nis === '10242');
    assert.strictEqual((await api('POST', '/api/followups', { token: S.tB.token, body: { student_id: s2.user_id, topic: 'x' } })).status, 403);
    const r = await api('POST', '/api/followups', { token: S.tA.token, body: { student_id: s2.user_id, topic: 'Atom economy', problem: 'Hitungan' } });
    assert.strictEqual(r.status, 201, r.text);
    const id = r.body.data.id;
    assert.strictEqual((await api('GET', '/api/followups', { token: S.s2.token })).body.data.length, 1);
    assert.strictEqual((await api('GET', '/api/followups', { token: S.s1.token })).body.data.length, 0);
    assert.strictEqual((await api('PATCH', `/api/followups/${id}/progress`, { token: S.s1.token, body: { progress: 100 } })).status, 403);
    const p = await api('PATCH', `/api/followups/${id}/progress`, { token: S.s2.token, body: { progress: 70 } });
    assert.strictEqual(p.body.data.progress, 70);
    const back = await api('PATCH', `/api/followups/${id}/progress`, { token: S.s2.token, body: { progress: 10 } });
    assert.strictEqual(back.body.data.progress, 70, 'progres tidak boleh mundur');
    assert.strictEqual((await api('GET', '/api/followups', { token: S.tA.token })).body.data[0].student_name, 'Siti Nurhaliza');
  });

  console.log('\nAkun & keamanan');
  await test('siswa nonaktif tidak bisa login/memakai token lama', async () => {
    const std = (await api('GET', `/api/classes/${S.classA}/students`, { token: S.tA.token })).body.data.find(s => s.nis === '10243');
    const r3 = await login('10243@aiclassroom.sch.id');
    assert.strictEqual((await api('PATCH', `/api/classes/students/${std.id}/status`, { token: S.tB.token, body: { status: 'inactive' } })).status, 403);
    assert.strictEqual((await api('PATCH', `/api/classes/students/${std.id}/status`, { token: S.tA.token, body: { status: 'inactive' } })).status, 200);
    const l = await api('POST', '/api/auth/login', { body: { email: '10243@aiclassroom.sch.id', password: 'password123' } });
    assert.strictEqual(l.status, 403);
    assert.strictEqual((await api('GET', '/api/auth/me', { token: r3.token })).status, 403);
    await api('PATCH', `/api/classes/students/${std.id}/status`, { token: S.tA.token, body: { status: 'active' } });
    assert.strictEqual((await api('GET', '/api/auth/me', { token: r3.token })).status, 200);
  });
  await test('ubah kata sandi', async () => {
    assert.strictEqual((await api('POST', '/api/auth/change-password', { token: S.s2.token, body: { current_password: 'salah', new_password: 'baru12345' } })).status, 400);
    assert.strictEqual((await api('POST', '/api/auth/change-password', { token: S.s2.token, body: { current_password: 'password123', new_password: 'pendek' } })).status, 400);
    assert.strictEqual((await api('POST', '/api/auth/change-password', { token: S.s2.token, body: { current_password: 'password123', new_password: 'baru12345' } })).status, 200);
    assert.strictEqual((await api('POST', '/api/auth/login', { body: { email: '10242@aiclassroom.sch.id', password: 'password123' } })).status, 401);
    assert.strictEqual((await api('POST', '/api/auth/login', { body: { email: '10242@aiclassroom.sch.id', password: 'baru12345' } })).status, 200);
  });
  await test('peran dibatasi: siswa tak bisa API guru/admin, guru tak bisa API admin', async () => {
    assert.strictEqual((await api('GET', '/api/classes', { token: S.s1.token })).status, 403);
    assert.strictEqual((await api('POST', '/api/assignments', { token: S.s1.token, body: {} })).status, 403);
    assert.strictEqual((await api('GET', '/api/admin/teachers', { token: S.tA.token })).status, 403);
    assert.strictEqual((await api('GET', '/api/reports/class-analytics', { token: S.s1.token })).status, 403);
  });
  await test('konfigurasi AI tiap guru terpisah (API key tidak bocor antar guru)', async () => {
    await api('POST', '/api/ai/config', { token: S.tA.token, body: { provider: 'openai', model: 'gpt-4o', api_key: 'sk-rahasia-1234' } });
    const b = await api('GET', '/api/ai/config', { token: S.tB.token });
    assert.strictEqual(b.body.data.active, null);
    const a = await api('GET', '/api/ai/config', { token: S.tA.token });
    assert.strictEqual(a.body.data.active.api_key_masked, '••••••••1234');
    assert.ok(!JSON.stringify(a.body).includes('sk-rahasia'));
  });

  console.log('\nPenghapusan & integritas data');
  await test('menghapus LKPD yang sudah dikumpulkan butuh konfirmasi (force)', async () => {
    const r = await api('DELETE', `/api/lkpd/${S.lkpd.id}`, { token: S.tA.token });
    assert.strictEqual(r.status, 409);
    assert.ok(/pengumpulan/.test(r.body.message));
    assert.strictEqual((await api('GET', '/api/assignments', { token: S.s1.token })).body.data.length, 1);
  });
  await test('mengedit LKPD memperbarui tugas siswa tanpa menggeser jawaban', async () => {
    const q = S.lkpd.questions;
    const upd = await api('PUT', `/api/lkpd/${S.lkpd.id}`, { token: S.tA.token, body: {
      questions: [{ id: q[1].id, type: 'essay', prompt: 'Mengapa pencegahan limbah lebih utama? (revisi)' }]
    } });
    assert.strictEqual(upd.status, 200);
    const det = await api('GET', `/api/submissions/${S.sub}`, { token: S.tA.token });
    const essay = det.body.data.sheet.find(x => x.id === q[1].id);
    assert.strictEqual(essay.prompt, 'Mengapa pencegahan limbah lebih utama? (revisi)');
    assert.strictEqual(essay.answer, 'Karena mencegah lebih murah.', 'jawaban esai harus tetap menempel pada soalnya');
  });
  await test('hapus tugas, siswa, kelas membersihkan data turunannya', async () => {
    assert.strictEqual((await api('DELETE', `/api/assignments/${S.asg.id}`, { token: S.tB.token })).status, 403);
    const std = (await api('GET', `/api/classes/${S.classA}/students`, { token: S.tA.token })).body.data.find(s => s.nis === '10241');
    assert.strictEqual((await api('DELETE', `/api/classes/students/${std.id}`, { token: S.tA.token })).status, 200);
    assert.strictEqual((await api('GET', '/api/submissions', { token: S.tA.token })).body.data.filter(s => s.student_nis === '10241').length, 0);
    assert.strictEqual((await api('POST', '/api/auth/login', { body: { email: '10241@aiclassroom.sch.id', password: 'password123' } })).status, 401);
    assert.strictEqual((await api('DELETE', `/api/assignments/${S.asg.id}`, { token: S.tA.token })).status, 200);
    assert.strictEqual((await api('GET', '/api/submissions', { token: S.tA.token })).body.data.length, 0);
    assert.strictEqual((await api('DELETE', `/api/lkpd/${S.lkpd.id}`, { token: S.tA.token })).status, 200);
  });
  await test('admin menghapus guru → seluruh data milik guru itu ikut bersih', async () => {
    const teachers = (await api('GET', '/api/admin/teachers', { token: S.admin.token })).body.data;
    const budi = teachers.find(t => t.email === 'budi@s.id');
    assert.strictEqual((await api('DELETE', `/api/admin/teachers/${budi.id}`, { token: S.admin.token })).status, 200);
    const st = await api('GET', '/api/admin/stats', { token: S.admin.token });
    assert.strictEqual(st.body.data.totalTeachers, 1);
    assert.strictEqual(st.body.data.totalClasses, 1);
    assert.strictEqual(st.body.data.totalStudents, 1);
    assert.strictEqual((await api('POST', '/api/auth/login', { body: { email: '10299@aiclassroom.sch.id', password: 'password123' } })).status, 401);
  });
  await test('data tersimpan ke berkas & bisa dibaca ulang', async () => {
    const saved = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    assert.ok(saved.users.some(u => u.email === 'sari@s.id'));
    assert.ok(!saved.users.some(u => u.email === 'budi@s.id'));
  });

  server.close();
  try { fs.unlinkSync(tmpFile); } catch (e) { /* abaikan */ }
  console.log(`\n${failed === 0 ? '🎉' : '💥'} Hasil: ${passed} lulus, ${failed} gagal`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => { console.error(err); process.exit(1); });
