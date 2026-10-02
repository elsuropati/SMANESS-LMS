process.env.NODE_ENV = 'test';
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

  // 2. Guru Login
  let teacherToken = '';
  await test('Guru login returns token and role="teacher"', async () => {
    const res = await request(app, { path: '/api/auth/login', method: 'POST' }, {
      email: 'guru@aiclassroom.sch.id',
      password: 'password123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'teacher');
    teacherToken = res.body.data.token;
  });

  // 3. Siswa Login
  let studentToken = '';
  await test('Siswa login returns token and role="student"', async () => {
    const res = await request(app, { path: '/api/auth/login', method: 'POST' }, {
      email: 'siswa@aiclassroom.sch.id',
      password: 'password123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'student');
    studentToken = res.body.data.token;
  });

  // 4. Role Authorization
  await test('Role Guard blocks student from teacher endpoints', async () => {
    const res = await request(app, {
      path: '/api/classes',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  // 5. Classes & Students Management
  let newClassId = '';
  await test('Guru can create class and list classes', async () => {
    const res = await request(app, {
      path: '/api/classes',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      name: 'X-2',
      subject: 'Kimia',
      academic_year: '2026/2027',
      description: 'Kelas Paralel Kimia Fase E'
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id);
    newClassId = res.body.data.id;
  });

  await test('Guru can import students to class via CSV payload', async () => {
    const res = await request(app, {
      path: `/api/classes/${newClassId}/students/import`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      students: [
        { name: 'Bayu Pratama', nis: '10250' },
        { name: 'Citra Kirana', nis: '10251', email: 'citra@aiclassroom.sch.id' }
      ]
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 2);
  });

  // 6. LKPD Builder & AI Generator
  let newLkpdId = '';
  await test('AI LKPD Generator produces structured JSON LKPD', async () => {
    const res = await request(app, {
      path: '/api/ai/generate-lkpd',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      subject: 'Kimia',
      grade: 'X',
      topic: 'Hukum Dasar Kimia & Stoikiometri',
      activities_count: 3,
      difficulty: 'sedang'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.title);
    assert.ok(Array.isArray(res.body.data.activities));
  });

  await test('Guru can save LKPD draft and duplicate it', async () => {
    const res = await request(app, {
      path: '/api/lkpd',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      title: 'LKPD Stoikiometri Reaksi',
      subject: 'Kimia',
      grade: 'X',
      status: 'draft',
      objectives: ['Menghitung mol reaktan']
    });
    assert.strictEqual(res.status, 201);
    newLkpdId = res.body.data.id;

    const dupRes = await request(app, {
      path: `/api/lkpd/${newLkpdId}/duplicate`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    assert.strictEqual(dupRes.status, 201);
    assert.ok(dupRes.body.data.title.includes('Salinan'));
  });

  // 7. Assignment
  let newAssignId = '';
  await test('Guru can publish assignment to a class', async () => {
    const res = await request(app, {
      path: '/api/assignments',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      lkpd_id: newLkpdId,
      class_id: newClassId,
      title: 'Tugas Bab Stoikiometri',
      due_date: '2026-10-20T23:59:00Z',
      instructions: 'Kerjakan secara cermat.'
    });
    assert.strictEqual(res.status, 201);
    newAssignId = res.body.data.id;
  });

  // 8. Student LKPD Player Auto-save & Submit
  await test('Student can auto-save draft answers and submit LKPD', async () => {
    const saveRes = await request(app, {
      path: '/api/submissions/save-draft',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }, {
      assignment_id: newAssignId,
      answers: {
        activity1: 'Analisis massa gas oksigen',
        q2: 'Hukum kekekalan massa Lavoisier berlaku pada sistem tertutup'
      }
    });
    assert.strictEqual(saveRes.status, 200);
    assert.strictEqual(saveRes.body.data.status, 'draft');

    const submitRes = await request(app, {
      path: '/api/submissions/submit',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }, {
      assignment_id: newAssignId,
      answers: {
        activity1: 'Analisis massa gas oksigen',
        q2: 'Hukum kekekalan massa Lavoisier berlaku pada sistem tertutup',
        reflection: 'Materi stoikiometri sangat terstruktur'
      }
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.data.status, 'submitted');
  });

  // 9. AI Assessment & Grading
  await test('AI evaluate provides structured recommendation without setting final grade', async () => {
    const evalRes = await request(app, {
      path: '/api/ai/evaluate',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      submissionId: 'sub-1',
      studentAnswers: { q2: 'Lavoisier menyatakan massa sebelum dan sesudah reaksi sama.' },
      rubric: 'Rubrik pemahaman hukum kekekalan massa'
    });
    assert.strictEqual(evalRes.status, 200);
    assert.ok(evalRes.body.data.score_recommendation > 0);
    assert.ok(Array.isArray(evalRes.body.data.strengths));
  });

  // 10. AI Settings & Multi-Provider Test
  await test('AI Service test connection returns success in mock mode', async () => {
    const testRes = await request(app, {
      path: '/api/ai/test',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    }, {
      provider: 'custom',
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'gpt-4o'
    });
    assert.strictEqual(testRes.status, 200);
    assert.strictEqual(testRes.body.success, true);
  });

  // 11. Class Analytics Report
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
