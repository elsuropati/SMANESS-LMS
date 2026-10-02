const assert = require('assert');
const http = require('http');
const app = require('../backend/server');

function request(app, options, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const reqOptions = {
        hostname: '127.0.0.1',
        port: port,
        path: options.path,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      if (body) {
        reqOptions.headers['Content-Type'] = 'application/json';
      }

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

async function runTests() {
  console.log('🧪 Running AI CLASSROOM Full System Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('Health check returns 200', async () => {
    const res = await request(app, { path: '/api/health', method: 'GET' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  // 2. Admin Login
  let adminToken = '';
  await test('Admin login returns 200 and role="admin"', async () => {
    const res = await request(app, { path: '/api/auth/login', method: 'POST' }, {
      email: 'admin@aiclassroom.sch.id',
      password: 'password123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'admin');
    assert.strictEqual(res.body.data.user.name, 'Administrator Sekolah');
    adminToken = res.body.data.token;
  });

  // 3. Admin creates Teacher
  const teacherEmail = 'guru_' + Date.now().toString(36) + '@aiclassroom.sch.id';
  await test('Admin can create a new teacher account', async () => {
    const createRes = await request(app, {
      path: '/api/admin/teachers',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }, {
      name: 'Budi Santoso, S.Pd.',
      email: teacherEmail,
      nip: '198507122010011005',
      subject: 'Kimia',
      password: 'password123'
    });
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.data.name, 'Budi Santoso, S.Pd.');
  });

  // 4. Guru Login
  let teacherToken = '';
  await test('Guru login returns token and role="teacher"', async () => {
    const res = await request(app, { path: '/api/auth/login', method: 'POST' }, {
      email: teacherEmail,
      password: 'password123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'teacher');
    teacherToken = res.body.data.token;
  });

  // 5. Classes & Students Management
  let newClassId = '';
  await test('Guru can create class and list classes', async () => {
    const res = await request(app, {
      path: '/api/classes',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      name: 'X-1',
      subject: 'Kimia',
      academic_year: '2026/2027',
      description: 'Kelas Kimia Dasar & Terapan Fase E SMA'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id);
    newClassId = res.body.data.id;
  });

  const studentEmail = 'siswa_' + Date.now().toString(36) + '@aiclassroom.sch.id';
  await test('Guru can import students to class via CSV payload', async () => {
    const res = await request(app, {
      path: `/api/classes/${newClassId}/students/import`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      students: [
        { name: 'Ahmad Fauzi', nis: '10241', email: studentEmail },
        { name: 'Siti Nurhaliza', nis: '10242', email: 'siti_' + Date.now().toString(36) + '@aiclassroom.sch.id' }
      ]
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 2);
  });

  // 6. Siswa Login
  let studentToken = '';
  await test('Siswa login returns token and role="student"', async () => {
    const res = await request(app, { path: '/api/auth/login', method: 'POST' }, {
      email: studentEmail,
      password: 'password123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'student');
    studentToken = res.body.data.token;
  });

  // 7. Role Authorization
  await test('Role Guard blocks student from teacher endpoints', async () => {
    const res = await request(app, {
      path: '/api/classes',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  // 8. AI LKPD Generator & Draft
  let lkpdId = '';
  await test('AI LKPD Generator produces structured JSON LKPD', async () => {
    const res = await request(app, {
      path: '/api/ai/generate-lkpd',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      subject: 'Kimia',
      grade: 'X',
      topic: 'Prinsip Kimia Hijau dalam Kehidupan Sehari-hari',
      activities_count: 2,
      difficulty: 'sedang',
      learning_model: 'Problem Based Learning'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.title);
    assert.ok(Array.isArray(res.body.data.activities));
    assert.ok(Array.isArray(res.body.data.questions));
  });

  await test('Guru can save LKPD draft and duplicate it', async () => {
    const createRes = await request(app, {
      path: '/api/lkpd',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      title: 'LKPD Kimia Hijau Lingkungan',
      subject: 'Kimia',
      grade: 'X',
      objectives: ['Menjelaskan prinsip 12 kimia hijau'],
      trigger_questions: 'Apa itu reaksi ramah lingkungan?',
      instructions: 'Kerjakan berurutan.',
      activities: [{ id: 'a1', title: 'Observasi', instructions: 'Amati sekitar' }],
      questions: [{ id: 'q1', type: 'essay', prompt: 'Sebutkan 3 prinsip kimia hijau!' }],
      reflection_prompts: ['Apa yang kamu pelajari?']
    });
    assert.strictEqual(createRes.status, 201);
    lkpdId = createRes.body.data.id;

    const dupRes = await request(app, {
      path: `/api/lkpd/${lkpdId}/duplicate`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(dupRes.status, 201);
    assert.ok(dupRes.body.data.title.includes('(Salinan)'));
  });

  // 9. Assignment & Student Submission
  let assignmentId = '';
  await test('Guru can publish assignment to a class', async () => {
    const res = await request(app, {
      path: '/api/assignments',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      lkpd_id: lkpdId,
      class_id: newClassId,
      title: 'Tugas Kimia Hijau 1',
      due_date: '2026-11-01T23:59:00Z',
      instructions: 'Selesaikan sebelum batas waktu.'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id);
    assignmentId = res.body.data.id;
  });

  let submissionId = '';
  await test('Student can auto-save draft answers and submit LKPD', async () => {
    // Draft save
    const draftRes = await request(app, {
      path: '/api/submissions/save-draft',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }, {
      assignment_id: assignmentId,
      answers: { q1: '1. Pencegahan limbah, 2. Desain aman...' }
    });
    assert.strictEqual(draftRes.status, 200);

    // Final submit
    const submitRes = await request(app, {
      path: '/api/submissions/submit',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }, {
      assignment_id: assignmentId,
      answers: {
        q1: '1. Pencegahan limbah, 2. Desain produk aman, 3. Pelarut hijau.',
        reflection: 'Saya berkomitmen menerapkan hidup minim sampah plastik.'
      }
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.data.status, 'submitted');
    submissionId = submitRes.body.data.id;
  });

  // 10. AI Evaluation & Grading
  await test('AI evaluate provides structured recommendation without setting final grade', async () => {
    const res = await request(app, {
      path: '/api/ai/evaluate',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      submissionId,
      studentAnswers: { q1: '1. Pencegahan limbah, 2. Desain aman, 3. Pelarut hijau.' },
      rubric: { standard: 'Kurikulum Merdeka Fase E' },
      learningObjectives: ['Memahami prinsip kimia hijau']
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.score_recommendation >= 0);
    assert.ok(Array.isArray(res.body.data.strengths));
    assert.ok(res.body.data.feedback);
  });

  await test('AI Service test connection returns success in mock mode', async () => {
    const res = await request(app, {
      path: '/api/ai/test',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      provider: 'mock'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // 11. Excel Grade Export
  await test('Teacher can export student grades as Excel/CSV', async () => {
    const res = await request(app, {
      path: '/api/grades/export-excel',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('REKAPITULASI NILAI SISWA'));
  });

  // 12. Class Analytics Report
  await test('Class analytics returns average, mastery rate, and difficult topics', async () => {
    const reportRes = await request(app, {
      path: '/api/reports/class-analytics',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(reportRes.status, 200);
    assert.ok(reportRes.body.data.averageScore >= 0);
    assert.ok(reportRes.body.data.masteryRate >= 0);
    assert.ok(Array.isArray(reportRes.body.data.difficultTopics));
  });

  console.log(`\n📊 Full Suite Result: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
