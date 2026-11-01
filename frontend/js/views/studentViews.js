import { api } from '../api.js';
import { esc, escMultiline, fmtDate, fmtDateTime, renderLinksHtml } from '../utils.js';

const PASSING_FALLBACK = 75;

function statusBadge(t) {
  if (t.submissionStatus === 'graded') return `<span class="badge-tag success">Dinilai: ${esc(t.score)}/100</span>`;
  if (t.submissionStatus === 'submitted') return '<span class="badge-tag info">Sudah Dikumpulkan</span>';
  if (t.submissionStatus === 'draft' && t.revision_note) return '<span class="badge-tag warning">Perlu Revisi</span>';
  if (t.submissionStatus === 'draft') return '<span class="badge-tag warning">Sedang Dikerjakan</span>';
  return '<span class="badge-tag warning">Belum Dikerjakan</span>';
}

// ======================================================
// 1. TUGAS SAYA
// ======================================================
export async function renderStudentTasksView(container, { user, showToast, onOpenLkpd }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Tugas LKPD Saya</h1>
          <p>Lembar Kerja Peserta Didik dari guru Anda. Kerjakan dan kumpulkan sebelum batas waktu.</p>
        </div>
      </div>
      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title"><span>📝</span> Tugas ${user.class_name ? 'Kelas ' + esc(user.class_name) : ''}</h3>
          <span class="badge-tag info" id="std-task-badge">Memuat...</span>
        </div>
        <div id="std-tasks-container"><p style="color: var(--text-muted); padding: 16px;">Memuat daftar tugas...</p></div>
      </div>
    </div>`;

  const list = container.querySelector('#std-tasks-container');
  try {
    const tasks = (await api.getAssignments()).data || [];
    container.querySelector('#std-task-badge').textContent = `${tasks.length} Tugas`;
    if (tasks.length === 0) {
      list.innerHTML = `<p style="padding: 24px; color: var(--text-muted); text-align: center;">Belum ada tugas dari guru untuk kelas Anda.</p>`;
      return;
    }
    list.innerHTML = tasks.map(t => {
      const btn = { graded: '🏆 Lihat Hasil', submitted: '👁️ Lihat Jawaban' }[t.submissionStatus] || (t.submissionStatus === 'draft' ? '✏️ Lanjutkan' : '🚀 Kerjakan LKPD');
      return `
        <div class="task-item-card">
          <div class="task-meta">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="task-title">${esc(t.title)}</span>
              ${statusBadge(t)}
              ${t.is_overdue ? '<span class="badge-tag danger" style="background:#fee2e2;color:#b91c1c;">Lewat Batas Waktu</span>' : ''}
            </div>
            <div class="task-subtitle" style="margin-top:4px;">
              <span>Mata Pelajaran: <strong>${esc(t.subject)}</strong></span><span>•</span>
              <span>Tenggat: <strong>${fmtDateTime(t.due_date)}</strong></span>
            </div>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">${escMultiline(t.instructions)}</p>
            ${t.revision_note ? `<p style="font-size:0.82rem;margin-top:6px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;">↩️ Catatan guru: ${escMultiline(t.revision_note)}</p>` : ''}
          </div>
          <div><button class="btn-primary btn-open-lkpd-player" data-id="${esc(t.id)}" style="width:auto;padding:8px 16px;">${btn}</button></div>
        </div>`;
    }).join('');
    list.querySelectorAll('.btn-open-lkpd-player').forEach(b => b.addEventListener('click', () => onOpenLkpd(b.dataset.id)));
  } catch (err) {
    list.innerHTML = `<div class="alert-box alert-error">⚠️ ${esc(err.message)}</div>`;
  }
}

// ======================================================
// 2. PEMUTAR LKPD — dibangun dari LKPD buatan guru
// ======================================================
export async function renderLkpdPlayerView(container, { user, assignmentId, showToast, onBackToTasks }) {
  container.innerHTML = `
    <div class="view-content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <button class="btn-demo-pill" id="btn-back-from-player" style="padding:8px 14px;">← Kembali ke Tugas Saya</button>
        <div style="display:flex;align-items:center;gap:12px;">
          <span id="player-autosave-indicator" style="font-size:0.78rem;color:var(--text-muted);"></span>
          <button class="btn-demo-pill" id="btn-player-manual-save" style="display:none;">💾 Simpan</button>
        </div>
      </div>
      <div class="content-panel" style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
          <div>
            <h2 id="player-lkpd-title" style="font-size:1.35rem;font-weight:800;color:var(--text-main);">Memuat LKPD...</h2>
            <p id="player-lkpd-meta" style="font-size:0.84rem;color:var(--text-muted);"></p>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.8rem;color:var(--text-muted);">Terisi:</span>
            <strong id="player-progress-label" style="font-size:1.15rem;color:var(--primary);margin-left:6px;">0%</strong>
          </div>
        </div>
        <div class="progress-bar-container" style="height:10px;margin:0;"><div class="progress-bar-fill" id="player-progress-bar" style="width:0%;"></div></div>
      </div>
      <div class="step-wizard-bar" id="player-steps"></div>
      <form id="form-lkpd-player" novalidate>
        <div class="content-panel" id="player-step-content-box" style="min-height:300px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;">
          <button type="button" class="btn-demo-pill" id="btn-wizard-prev" style="padding:10px 20px;font-weight:700;display:none;">← Sebelumnya</button>
          <div style="margin-left:auto;display:flex;gap:12px;">
            <button type="button" class="btn-primary" id="btn-wizard-next" style="width:auto;padding:10px 24px;">Lanjutkan →</button>
            <button type="submit" class="btn-primary" id="btn-wizard-submit" style="width:auto;padding:10px 24px;background:var(--success);display:none;">✅ KUMPULKAN LKPD</button>
          </div>
        </div>
      </form>
    </div>`;

  const $ = (s) => container.querySelector(s);
  $('#btn-back-from-player').addEventListener('click', () => { flushSave().finally(onBackToTasks); });

  let assignment, lkpd, submission;
  let readOnly = false;
  let steps = [];
  let stepIdx = 0;
  let keyBySheet = {}; // id -> {correct_index, is_correct} setelah dinilai
  let dirty = false;
  let saveTimer = null;
  const answers = { activities: {}, questions: {}, reflections: {} };

  try {
    const res = await api.getAssignmentDetails(assignmentId);
    assignment = res.data.assignment;
    lkpd = res.data.lkpd;
    submission = res.data.submission;
  } catch (err) {
    $('#player-step-content-box').innerHTML = `<div class="alert-box alert-error">⚠️ ${esc(err.message)}</div>`;
    $('#player-lkpd-title').textContent = 'LKPD tidak dapat dibuka';
    $('#btn-wizard-next').style.display = 'none';
    return;
  }

  if (submission) {
    Object.assign(answers.activities, submission.answers?.activities || {});
    Object.assign(answers.questions, submission.answers?.questions || {});
    Object.assign(answers.reflections, submission.answers?.reflections || {});
    readOnly = submission.status === 'submitted' || submission.status === 'graded';
    if (submission.status === 'graded') {
      try {
        const det = await api.getSubmissionDetail(submission.id);
        (det.data.sheet || []).forEach(it => { if (it.section === 'question') keyBySheet[it.id] = it; });
      } catch (e) { /* kunci jawaban opsional */ }
    }
  }

  const acts = lkpd.activities || [];
  const qs = lkpd.questions || [];
  const refs = lkpd.reflection_prompts || [];
  steps = [{ id: 'identity', title: 'Identitas' }, { id: 'material', title: 'Materi' }];
  if (acts.length) steps.push({ id: 'activities', title: 'Aktivitas' });
  if (qs.length) steps.push({ id: 'questions', title: 'Soal' });
  if (refs.length) steps.push({ id: 'reflections', title: 'Refleksi' });
  steps.push({ id: 'submit', title: readOnly ? 'Hasil' : 'Kumpulkan' });

  $('#player-lkpd-title').textContent = lkpd.title || assignment.title;
  $('#player-lkpd-meta').textContent = `${lkpd.subject || assignment.subject} • Kelas ${assignment.class_name || user.class_name || '-'} • Tenggat ${fmtDateTime(assignment.due_date)}`;
  $('#player-steps').innerHTML = steps.map((s, i) => `
    <button type="button" class="step-wizard-item" data-step="${i}">
      <span class="step-number">${String(i + 1).padStart(2, '0')}</span><span class="step-title">${esc(s.title)}</span>
    </button>`).join('');
  $('#player-steps').querySelectorAll('.step-wizard-item').forEach(b => b.addEventListener('click', () => renderStep(Number(b.dataset.step))));
  if (!readOnly) $('#btn-player-manual-save').style.display = 'inline-flex';

  const totalItems = acts.length + qs.length + refs.length;
  function filledCount() {
    const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    return acts.filter(a => has(answers.activities[a.id])).length
      + qs.filter(q => has(answers.questions[q.id])).length
      + refs.filter(r => has(answers.reflections[r.id])).length;
  }
  function updateProgress() {
    const pct = totalItems ? Math.round((filledCount() / totalItems) * 100) : 100;
    $('#player-progress-label').textContent = `${pct}%`;
    $('#player-progress-bar').style.width = `${pct}%`;
  }

  // ---- penyimpanan
  function setIndicator(text) { $('#player-autosave-indicator').textContent = text; }
  async function saveDraft() {
    if (readOnly || !dirty) return;
    dirty = false;
    setIndicator('⏳ Menyimpan...');
    try {
      await api.saveStudentDraft(assignmentId, answers);
      setIndicator('🟢 Tersimpan');
    } catch (e) {
      dirty = true;
      setIndicator('⚠️ Gagal menyimpan');
      throw e;
    }
  }
  function flushSave() { clearTimeout(saveTimer); return saveDraft().catch(() => {}); }
  function markDirty() {
    dirty = true;
    updateProgress();
    setIndicator('⏳ Menyimpan...');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveDraft().catch(() => {}), 1200);
  }
  $('#btn-player-manual-save').addEventListener('click', async () => {
    dirty = true;
    try { await saveDraft(); showToast('Progres LKPD tersimpan.', 'success'); } catch (e) { showToast(e.message, 'error'); }
  });

  const dis = readOnly ? 'disabled' : '';

  // ---- render langkah
  function renderStep(i) {
    stepIdx = i;
    const step = steps[i];
    container.querySelectorAll('.step-wizard-item').forEach((el, n) => {
      el.classList.toggle('active', n === i);
      el.classList.toggle('completed', n < i);
    });
    $('#btn-wizard-prev').style.display = i > 0 ? 'inline-flex' : 'none';
    $('#btn-wizard-next').style.display = i < steps.length - 1 ? 'inline-flex' : 'none';
    $('#btn-wizard-submit').style.display = i === steps.length - 1 && !readOnly ? 'inline-flex' : 'none';
    updateProgress();
    const box = $('#player-step-content-box');
    const h = (n, t, sub) => `<h3 style="font-size:1.15rem;font-weight:800;margin-bottom:6px;color:var(--primary);">${String(n).padStart(2, '0')} • ${esc(t)}</h3>${sub ? `<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">${sub}</p>` : ''}`;
    const n = i + 1;

    if (step.id === 'identity') {
      box.innerHTML = `
        ${h(n, 'Identitas & Tujuan Pembelajaran')}
        ${submission?.revision_note && !readOnly ? `<div class="alert-box" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;margin-bottom:16px;">↩️ <strong>Guru meminta revisi:</strong> ${escMultiline(submission.revision_note)}</div>` : ''}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px;">
          <div class="form-group"><label class="form-label">Nama Lengkap</label><input class="form-input" value="${esc(user.name)}" disabled /></div>
          <div class="form-group"><label class="form-label">NIS</label><input class="form-input" value="${esc(user.nip_or_nis || '-')}" disabled /></div>
          <div class="form-group"><label class="form-label">Kelas</label><input class="form-input" value="${esc(assignment.class_name || user.class_name || '-')}" disabled /></div>
        </div>
        ${assignment.instructions ? `<div style="background:#eef2ff;padding:14px;border-radius:var(--radius-md);margin-bottom:14px;font-size:0.86rem;"><strong>Instruksi guru:</strong> ${escMultiline(assignment.instructions)}</div>` : ''}
        ${lkpd.instructions ? `<div style="background:var(--bg-surface-subtle);padding:14px;border-radius:var(--radius-md);margin-bottom:14px;font-size:0.86rem;"><strong>Petunjuk kerja:</strong> ${escMultiline(lkpd.instructions)}</div>` : ''}
        ${(lkpd.objectives || []).length ? `<div style="background:var(--bg-surface-subtle);padding:16px;border-radius:var(--radius-md);margin-bottom:14px;"><h4 style="font-size:0.9rem;font-weight:700;margin-bottom:8px;">Tujuan Pembelajaran:</h4><ul style="padding-left:20px;font-size:0.85rem;line-height:1.6;">${lkpd.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
        ${lkpd.trigger_questions ? `<div style="background:#f0fdf4;padding:14px;border-radius:var(--radius-md);font-size:0.86rem;"><strong>💡 Pertanyaan pemantik:</strong> ${escMultiline(lkpd.trigger_questions)}</div>` : ''}`;
    } else if (step.id === 'material') {
      const links = lkpd.material_links || [];
      box.innerHTML = `
        ${h(n, 'Materi & Sumber Belajar', 'Pelajari materi, tonton video, atau buka lab maya. Jawaban Anda tidak hilang saat membuka tautan.')}
        ${lkpd.material_text ? `<div style="background:var(--bg-surface-subtle);padding:20px;border-radius:var(--radius-md);margin-bottom:20px;line-height:1.7;font-size:0.9rem;"><h4 style="font-size:0.95rem;font-weight:700;margin-bottom:8px;">Ringkasan Konsep:</h4><p>${escMultiline(lkpd.material_text)}</p></div>` : ''}
        <div class="content-panel" style="border:1.5px dashed var(--border-subtle);">
          <h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">Tautan dari Guru:</h4>
          ${renderLinksHtml(links)}
        </div>`;
    } else if (step.id === 'activities') {
      box.innerHTML = `${h(n, 'Aktivitas', 'Kerjakan setiap aktivitas dan tuliskan hasilnya.')}` + acts.map((a, k) => `
        <div class="form-group">
          <label class="form-label">${esc(a.title || 'Aktivitas ' + (k + 1))}</label>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;">${escMultiline(a.instructions)}</p>
          <textarea class="form-input ans-act" data-id="${esc(a.id)}" rows="4" placeholder="Tuliskan hasil Anda..." ${dis}>${esc(answers.activities[a.id] || '')}</textarea>
        </div>`).join('');
      box.querySelectorAll('.ans-act').forEach(t => t.addEventListener('input', () => { answers.activities[t.dataset.id] = t.value; markDirty(); }));
    } else if (step.id === 'questions') {
      box.innerHTML = `${h(n, 'Soal Evaluasi', 'Jawab semua soal dengan cermat.')}` + qs.map((q, k) => {
        const key = keyBySheet[q.id];
        if (q.type === 'multiple_choice') {
          return `
          <div class="content-panel" style="margin-bottom:16px;">
            <label class="form-label">Soal ${k + 1} (Pilihan Ganda)</label>
            <p style="font-size:0.9rem;margin-bottom:10px;font-weight:600;">${escMultiline(q.prompt)}</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${q.options.map((o, oi) => {
                const isKey = key && key.correct_index === oi;
                return `<label style="display:flex;align-items:center;gap:8px;font-size:0.86rem;cursor:pointer;${isKey ? 'color:#15803d;font-weight:700;' : ''}">
                  <input type="radio" class="ans-mc" name="q-${esc(q.id)}" data-id="${esc(q.id)}" value="${oi}" ${answers.questions[q.id] === oi ? 'checked' : ''} ${dis} />
                  <span>${String.fromCharCode(65 + oi)}. ${esc(o)}${isKey ? ' ✔ (kunci)' : ''}</span></label>`;
              }).join('')}
            </div>
            ${key && key.is_correct === false ? '<p style="font-size:0.8rem;color:#b91c1c;margin-top:8px;">Jawaban Anda belum tepat.</p>' : ''}
            ${key && key.is_correct === true ? '<p style="font-size:0.8rem;color:#15803d;margin-top:8px;">Jawaban Anda benar ✔</p>' : ''}
          </div>`;
        }
        return `
          <div class="form-group">
            <label class="form-label">Soal ${k + 1} (Uraian)</label>
            <p style="font-size:0.9rem;margin-bottom:8px;font-weight:600;">${escMultiline(q.prompt)}</p>
            <textarea class="form-input ans-essay" data-id="${esc(q.id)}" rows="4" placeholder="Tuliskan jawaban Anda..." ${dis}>${esc(answers.questions[q.id] || '')}</textarea>
          </div>`;
      }).join('');
      box.querySelectorAll('.ans-mc').forEach(r => r.addEventListener('change', () => { answers.questions[r.dataset.id] = Number(r.value); markDirty(); }));
      box.querySelectorAll('.ans-essay').forEach(t => t.addEventListener('input', () => { answers.questions[t.dataset.id] = t.value; markDirty(); }));
    } else if (step.id === 'reflections') {
      box.innerHTML = `${h(n, 'Refleksi Diri', 'Bantu guru memahami bagian yang sudah dan belum Anda kuasai.')}` + refs.map((r, k) => `
        <div class="form-group">
          <label class="form-label">Refleksi ${k + 1}</label>
          <p style="font-size:0.85rem;margin-bottom:8px;">${escMultiline(r.prompt)}</p>
          <textarea class="form-input ans-ref" data-id="${esc(r.id)}" rows="3" placeholder="Tuliskan refleksi Anda..." ${dis}>${esc(answers.reflections[r.id] || '')}</textarea>
        </div>`).join('');
      box.querySelectorAll('.ans-ref').forEach(t => t.addEventListener('input', () => { answers.reflections[t.dataset.id] = t.value; markDirty(); }));
    } else {
      renderSubmitStep(box, n);
    }
  }

  function renderSubmitStep(box, n) {
    if (readOnly) {
      const graded = submission?.status === 'graded';
      box.innerHTML = `
        <div style="text-align:center;padding:30px 10px;">
          <div style="font-size:3rem;margin-bottom:12px;">${graded ? '🏆' : '✅'}</div>
          <h3 style="font-size:1.3rem;font-weight:800;color:var(--success);margin-bottom:6px;">${graded ? 'LKPD Telah Dinilai' : 'LKPD Telah Dikumpulkan'}</h3>
          <p style="font-size:0.9rem;color:var(--text-muted);max-width:480px;margin:0 auto 20px;">
            ${graded ? 'Berikut nilai dan umpan balik dari guru.' : 'Jawaban Anda sudah diterima guru dan menunggu penilaian. Jawaban tidak dapat diubah kecuali guru mengembalikannya untuk revisi.'}
          </p>
          ${graded ? `
            <div style="background:var(--bg-surface-subtle);display:inline-block;padding:16px 32px;border-radius:var(--radius-lg);">
              <div style="font-size:0.85rem;color:var(--text-muted);">Nilai</div>
              <div style="font-size:2.2rem;font-weight:800;color:var(--primary);">${esc(submission.score)} / 100</div>
            </div>
            ${submission.feedback ? `<div style="text-align:left;max-width:560px;margin:18px auto 0;background:#f8fafc;border-left:4px solid var(--primary);padding:14px;border-radius:8px;"><strong style="font-size:0.85rem;">Umpan balik guru:</strong><p style="font-size:0.88rem;margin-top:4px;line-height:1.5;">${escMultiline(submission.feedback)}</p></div>` : ''}` : ''}
        </div>`;
      return;
    }
    const f = filledCount();
    box.innerHTML = `
      <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:6px;color:var(--primary);">${String(n).padStart(2, '0')} • Konfirmasi & Pengumpulan</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">Periksa ringkasan sebelum mengumpulkan ke guru.</p>
      <div style="background:var(--bg-surface-subtle);padding:18px;border-radius:var(--radius-md);margin-bottom:20px;font-size:0.88rem;display:flex;flex-direction:column;gap:8px;">
        <div>${acts.length ? (acts.every(a => (answers.activities[a.id] || '').trim()) ? '✔️' : '⚠️') : '➖'} Aktivitas: ${acts.filter(a => (answers.activities[a.id] || '').trim()).length}/${acts.length} terisi</div>
        <div>${qs.length ? (qs.every(q => answers.questions[q.id] !== undefined && String(answers.questions[q.id]).trim() !== '') ? '✔️' : '⚠️') : '➖'} Soal: ${qs.filter(q => answers.questions[q.id] !== undefined && String(answers.questions[q.id]).trim() !== '').length}/${qs.length} terjawab</div>
        <div>${refs.length ? (refs.every(r => (answers.reflections[r.id] || '').trim()) ? '✔️' : '⚠️') : '➖'} Refleksi: ${refs.filter(r => (answers.reflections[r.id] || '').trim()).length}/${refs.length} terisi</div>
        <div style="font-weight:700;">Total terisi: ${f}/${totalItems}</div>
      </div>
      ${assignment.is_overdue ? '<div class="alert-box" style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;margin-bottom:12px;">⏰ Batas waktu sudah lewat. Tugas akan tercatat terlambat.</div>' : ''}
      <div class="alert-box" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;">⚠️ Setelah dikumpulkan, jawaban tidak dapat diubah kecuali guru mengembalikannya untuk revisi.</div>`;
  }

  $('#btn-wizard-next').addEventListener('click', () => { if (stepIdx < steps.length - 1) renderStep(stepIdx + 1); });
  $('#btn-wizard-prev').addEventListener('click', () => { if (stepIdx > 0) renderStep(stepIdx - 1); });

  $('#form-lkpd-player').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (filledCount() < totalItems && !confirm('Beberapa isian masih kosong. Tetap kumpulkan sekarang?')) return;
    const btn = $('#btn-wizard-submit');
    btn.disabled = true;
    clearTimeout(saveTimer);
    try {
      const res = await api.submitAssignment(assignmentId, answers);
      readOnly = true;
      dirty = false;
      submission = { ...(submission || {}), status: 'submitted', score: null };
      steps[steps.length - 1].title = 'Hasil';
      container.querySelectorAll('.step-wizard-item .step-title')[steps.length - 1].textContent = 'Hasil';
      $('#btn-player-manual-save').style.display = 'none';
      setIndicator('');
      showToast(res.message || 'LKPD berhasil dikumpulkan ke guru!', 'success');
      renderStep(steps.length - 1);
    } catch (err) {
      btn.disabled = false;
      showToast(err.message, 'error');
    }
  });

  renderStep(0);
}

// ======================================================
// 3. MATERI (dari LKPD yang ditugaskan guru)
// ======================================================
export async function renderStudentMaterialsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header"><div class="dash-title-group">
        <h1>Sumber Belajar & Materi</h1>
        <p>Materi, video, dan lab maya yang dibagikan guru pada tugas-tugas Anda.</p>
      </div></div>
      <div id="materials-container"><p style="color:var(--text-muted);padding:16px;">Memuat materi...</p></div>
    </div>`;
  const box = container.querySelector('#materials-container');
  try {
    const tasks = ((await api.getAssignments()).data || []).filter(t => t.material_text || (t.material_links || []).length);
    if (!tasks.length) {
      box.innerHTML = `<div class="content-panel" style="text-align:center;padding:36px;color:var(--text-muted);">Guru belum membagikan materi. Materi akan muncul di sini saat guru menambahkan tautan atau ringkasan pada LKPD.</div>`;
      return;
    }
    box.innerHTML = tasks.map(t => `
      <div class="content-panel" style="margin-bottom:20px;">
        <div class="panel-header"><h3 class="panel-title"><span>📖</span> ${esc(t.lkpd_title || t.title)}</h3><span class="badge-tag info">${esc(t.subject)}</span></div>
        ${t.material_text ? `<p style="font-size:0.9rem;line-height:1.7;margin-bottom:16px;">${escMultiline(t.material_text)}</p>` : ''}
        ${renderLinksHtml(t.material_links)}
      </div>`).join('');
  } catch (err) {
    box.innerHTML = `<div class="alert-box alert-error">⚠️ ${esc(err.message)}</div>`;
  }
}

// ======================================================
// 4. HASIL BELAJAR
// ======================================================
export async function renderStudentResultsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header"><div class="dash-title-group">
        <h1>Hasil Belajar & Ulasan Guru</h1>
        <p>Nilai dan umpan balik dari guru untuk tugas yang sudah diperiksa.</p>
      </div></div>
      <div class="content-panel">
        <div class="panel-header"><h3 class="panel-title"><span>🏆</span> Nilai Tugas</h3><span class="badge-tag success" id="results-count-badge">Memuat...</span></div>
        <div id="results-list-container"><p style="color:var(--text-muted);padding:16px;">Memuat riwayat nilai...</p></div>
      </div>
    </div>`;
  const list = container.querySelector('#results-list-container');
  try {
    const results = (await api.getStudentResults()).data || [];
    container.querySelector('#results-count-badge').textContent = `${results.length} Nilai`;
    if (!results.length) {
      list.innerHTML = `<p style="padding:24px;text-align:center;color:var(--text-muted);">Belum ada tugas yang dinilai. Tugas Anda sedang menunggu pemeriksaan guru.</p>`;
      return;
    }
    list.innerHTML = results.map(r => {
      const kkm = r.passing_score || PASSING_FALLBACK;
      return `
      <div class="task-item-card" style="align-items:flex-start;margin-bottom:16px;">
        <div class="task-meta" style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;"><span class="task-title">${esc(r.assignmentTitle)}</span><span class="badge-tag success">Dinilai</span></div>
          <span class="task-subtitle" style="margin-top:4px;">${esc(r.subject)} • Dinilai ${fmtDate(r.graded_at)}</span>
          ${r.feedback ? `<div style="background:var(--bg-surface-subtle);padding:14px;border-radius:var(--radius-md);margin-top:12px;border-left:4px solid var(--primary);">
            <strong style="font-size:0.85rem;">Umpan Balik Guru:</strong>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;line-height:1.5;">${escMultiline(r.feedback)}</p></div>` : '<p style="font-size:0.82rem;color:var(--text-muted);margin-top:10px;">Guru tidak menambahkan catatan.</p>'}
          ${(r.weaknesses || []).length ? `<p style="font-size:0.8rem;margin-top:8px;"><strong>Perlu ditingkatkan:</strong> ${r.weaknesses.map(esc).join(', ')}</p>` : ''}
          <button class="btn-demo-pill btn-view-result" data-id="${esc(r.assignment_id)}" style="margin-top:10px;">📄 Lihat Jawaban & Kunci</button>
        </div>
        <div style="text-align:right;padding-left:20px;">
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;">Nilai Akhir</div>
          <div style="font-size:2.2rem;font-weight:800;color:var(--primary);">${esc(r.score)}</div>
          <div style="font-size:0.75rem;font-weight:700;color:${r.passed ? 'var(--success)' : '#b45309'};">${r.passed ? 'Tuntas' : `Belum tuntas (KKM ${kkm})`}</div>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.btn-view-result').forEach(b => b.addEventListener('click', () => { window.location.hash = `#player/${b.dataset.id}`; }));
  } catch (err) {
    list.innerHTML = `<div class="alert-box alert-error">⚠️ ${esc(err.message)}</div>`;
  }
}

// ======================================================
// 5. TINDAK LANJUT
// ======================================================
export async function renderStudentFollowupView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header"><div class="dash-title-group">
        <h1>Tindak Lanjut & Remedial Mandiri</h1>
        <p>Program penguatan dari guru untuk membantu Anda menuntaskan materi.</p>
      </div></div>
      <div id="std-flw-container"><p style="color:var(--text-muted);padding:20px;">Memuat program tindak lanjut...</p></div>
    </div>`;
  const box = container.querySelector('#std-flw-container');
  try {
    const followups = (await api.getFollowups()).data || [];
    if (!followups.length) {
      box.innerHTML = `<div class="content-panel" style="text-align:center;padding:40px;"><div style="font-size:2.5rem;margin-bottom:8px;">🎉</div><h3 style="font-size:1.2rem;font-weight:700;">Tidak Ada Tindak Lanjut</h3><p style="color:var(--text-muted);font-size:0.88rem;margin-top:4px;">Belum ada program penguatan dari guru untuk Anda.</p></div>`;
      return;
    }
    box.innerHTML = followups.map(f => `
      <div class="followup-card" style="margin-bottom:20px;">
        <div class="followup-header"><span class="followup-badge">${f.status === 'completed' ? 'Selesai' : 'Program Penguatan'}</span>
          <strong style="color:#86198f;font-size:1.05rem;">${esc(f.subject)}: ${esc(f.topic)}</strong></div>
        <p style="font-size:0.88rem;color:#701a75;margin-bottom:10px;"><strong>Kendala:</strong> ${esc(f.problem)}</p>
        <div class="progress-bar-container" style="height:10px;"><div class="progress-bar-fill" id="flw-prog-fill-${esc(f.id)}" style="width:${Number(f.progress) || 0}%;"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#a21caf;margin-bottom:16px;"><span>Progres: <strong id="flw-prog-text-${esc(f.id)}">${Number(f.progress) || 0}%</strong></span><span>Target: 100%</span></div>
        ${f.status === 'completed' ? '' : `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-demo-pill btn-step-flw" data-id="${esc(f.id)}" data-prog="35" style="background:#fff;color:#a21caf;font-weight:700;border-color:#f0abfc;">📖 Sudah Belajar Materi (35%)</button>
          <button class="btn-demo-pill btn-step-flw" data-id="${esc(f.id)}" data-prog="70" style="background:#fff;color:#a21caf;font-weight:700;border-color:#f0abfc;">✏️ Sudah Latihan (70%)</button>
          <button class="btn-demo-pill btn-step-flw" data-id="${esc(f.id)}" data-prog="100" style="background:#a21caf;color:#fff;font-weight:700;border:none;">💭 Selesai & Refleksi (100%)</button>
        </div>`}
      </div>`).join('');
    box.querySelectorAll('.btn-step-flw').forEach(btn => btn.addEventListener('click', async () => {
      try {
        const res = await api.updateFollowupProgress(btn.dataset.id, Number(btn.dataset.prog));
        const p = res.data.progress;
        container.querySelector(`#flw-prog-fill-${btn.dataset.id}`).style.width = `${p}%`;
        container.querySelector(`#flw-prog-text-${btn.dataset.id}`).textContent = `${p}%`;
        showToast(`Progres tindak lanjut: ${p}%`, 'success');
        if (p >= 100) renderStudentFollowupView(container, { user, showToast });
      } catch (e) { showToast(e.message, 'error'); }
    }));
  } catch (err) {
    box.innerHTML = `<div class="alert-box alert-error">⚠️ ${esc(err.message)}</div>`;
  }
}

// ======================================================
// 6. PROFIL
// ======================================================
export function renderStudentProfileView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header"><div class="dash-title-group"><h1>Profil Peserta Didik</h1><p>Informasi akun dan keamanan.</p></div></div>
      <div class="content-panel" style="max-width:600px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border-light);">
          <div class="user-avatar-circle student" style="width:64px;height:64px;font-size:1.5rem;">${esc(user.avatar || (user.name || '?').slice(0, 2).toUpperCase())}</div>
          <div><h2 style="font-size:1.25rem;font-weight:800;">${esc(user.name)}</h2><p style="font-size:0.85rem;color:var(--text-muted);">Peserta Didik • Kelas ${esc(user.class_name || '-')}</p></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;font-size:0.9rem;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-light);padding-bottom:8px;"><span style="color:var(--text-muted);">NIS:</span><strong>${esc(user.nip_or_nis || '-')}</strong></div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-light);padding-bottom:8px;"><span style="color:var(--text-muted);">Email Akun:</span><strong>${esc(user.email)}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">Status:</span><span class="badge-tag success">Aktif</span></div>
        </div>
      </div>
      <div class="content-panel" style="max-width:600px;">
        <h3 style="font-size:1rem;font-weight:800;margin-bottom:12px;">🔑 Ubah Kata Sandi</h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">Segera ganti kata sandi bawaan dari sekolah dengan kata sandi pribadi (minimal 8 karakter).</p>
        <form id="form-change-password">
          <div class="form-group"><label class="form-label">Kata Sandi Saat Ini</label><input type="password" id="pw-current" class="form-input" autocomplete="current-password" required /></div>
          <div class="form-group"><label class="form-label">Kata Sandi Baru</label><input type="password" id="pw-new" class="form-input" minlength="8" autocomplete="new-password" required /></div>
          <button type="submit" class="btn-primary" style="width:auto;">Simpan Kata Sandi</button>
        </form>
      </div>
    </div>`;
  container.querySelector('#form-change-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.changePassword(container.querySelector('#pw-current').value, container.querySelector('#pw-new').value);
      showToast('Kata sandi berhasil diubah.', 'success');
      e.target.reset();
    } catch (err) { showToast(err.message, 'error'); }
  });
}
