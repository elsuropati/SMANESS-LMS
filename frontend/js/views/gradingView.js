import { api } from '../api.js';
import { esc, escMultiline, fmtDateTime } from '../utils.js';

export async function renderGradingView(container, { user, showToast, params = {} }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Penilaian & Analisis Ulasan</h1>
          <p>Periksa hasil kerja siswa, gunakan evaluasi AI untuk rekomendasi rubrik, dan berikan umpan balik terarah.</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-demo-pill" id="btn-export-grades-excel" style="background: #ecfdf5; border-color: #a7f3d0; color: #065f46; font-weight: 700; padding: 8px 16px;">
            <span>📊 Unduh Excel Nilai (.csv)</span>
          </button>
          <button class="btn-demo-pill" id="btn-print-grades" style="padding: 8px 16px;">
            <span>🖨️ Cetak Nilai</span>
          </button>
          <button class="btn-demo-pill" id="btn-refresh-grading" style="padding: 8px 16px;">
            <span>🔄 Segarkan</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="content-panel" style="margin-bottom: 20px; padding: 14px 20px;">
        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="form-label" for="select-grading-class" style="margin: 0; font-weight: 700; white-space: nowrap;">
              🏫 Filter Kelas:
            </label>
            <select id="select-grading-class" class="form-input" style="min-width: 200px; padding: 8px 12px; font-weight: 600;">
              <option value="">Semua Kelas</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="form-label" for="select-grading-status" style="margin: 0; font-weight: 700; white-space: nowrap;">
              📑 Status:
            </label>
            <select id="select-grading-status" class="form-input" style="min-width: 160px; padding: 8px 12px;">
              <option value="">Semua Status</option>
              <option value="submitted">Perlu Dinilai</option>
              <option value="graded">Sudah Dinilai</option>
            </select>
          </div>
          <div style="margin-left: auto; color: var(--text-muted); font-size: 0.85rem;" id="grading-filtered-summary">
            Memuat data...
          </div>
        </div>
      </div>

      <!-- Submissions Table Panel -->
      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>📝</span> Pengumpulan Tugas Siswa
          </h3>
          <span class="badge-tag warning" id="grading-count-badge">0 Pengumpulan</span>
        </div>

        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                <th>NIS</th>
                <th>Kelas</th>
                <th>Tugas LKPD</th>
                <th>Waktu Pengumpulan</th>
                <th>Status</th>
                <th>Nilai Final</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="submissions-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Review Modal Container -->
    <div id="grading-modal-slot"></div>
  `;

  let allSubmissions = [];
  let availableClasses = [];

  const classSelect = container.querySelector('#select-grading-class');
  const statusSelect = container.querySelector('#select-grading-status');
  const summaryEl = container.querySelector('#grading-filtered-summary');
  const tbody = container.querySelector('#submissions-table-body');
  const badge = container.querySelector('#grading-count-badge');

  async function loadClasses() {
    try {
      const res = await api.getClasses();
      availableClasses = res.data || [];
      classSelect.innerHTML = `<option value="">Semua Kelas (${availableClasses.length})</option>` + 
        availableClasses.map(c => `<option value="${esc(c.id)}">Kelas ${esc(c.name)} — ${esc(c.subject)}</option>`).join('');
    } catch (e) {
      console.error('Error loading classes for filter:', e);
    }
  }

  function renderSubmissionsTable() {
    const selectedClassId = classSelect.value;
    const selectedStatus = statusSelect.value;

    let filtered = allSubmissions.filter(sub => {
      if (selectedClassId && sub.class_id !== selectedClassId) return false;
      if (params.assignment && sub.assignment_id !== params.assignment) return false;
      if (selectedStatus === 'submitted' && sub.status !== 'submitted') return false;
      if (selectedStatus === 'graded' && sub.status !== 'graded') return false;
      return true;
    });

    badge.textContent = `${filtered.length} Pengumpulan`;
    summaryEl.textContent = `Menampilkan ${filtered.length} dari ${allSubmissions.length} pengumpulan`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Tidak ada data pengumpulan tugas yang sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(sub => {
      let statusBadge = '<span class="badge-tag warning">Dikumpulkan</span>';
      if (sub.status === 'graded') {
        statusBadge = '<span class="badge-tag success">Dinilai</span>';
      }

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${esc(sub.student_name)}</div>
          </td>
          <td><code>${esc(sub.student_nis || '-')}</code></td>
          <td><span class="badge-tag info">${esc(sub.class_name || '-')}</span></td>
          <td><strong style="color: var(--text-main);">${esc(sub.assignment_title || 'Tugas LKPD')}</strong></td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              ${sub.submitted_at ? fmtDateTime(sub.submitted_at) : '-'}${sub.is_late ? ' <span class="badge-tag" style="background:#fee2e2;color:#b91c1c;">Terlambat</span>' : ''}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <strong style="font-size: 1.05rem; color: ${sub.score !== null ? 'var(--primary)' : 'var(--text-muted)'};">
              ${sub.score !== null ? sub.score : '—'}
            </strong>
          </td>
          <td style="text-align: right;">
            <button class="btn-demo-pill btn-review-sub" data-id="${esc(sub.id)}" style="font-weight: 600;">
              🔍 ${sub.status === 'graded' ? 'Lihat / Ubah Nilai' : 'Periksa & Nilai'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-review-sub').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openGradingModal(id);
      });
    });
  }

  async function loadSubmissions() {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">Memuat data pengumpulan tugas...</td></tr>`;

    try {
      const res = await api.getSubmissions();
      allSubmissions = res.data || [];
      renderSubmissionsTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="color: var(--danger); text-align: center;">Gagal: ${err.message}</td></tr>`;
    }
  }

  classSelect.addEventListener('change', renderSubmissionsTable);
  statusSelect.addEventListener('change', renderSubmissionsTable);


  async function openGradingModal(subId) {
    const slot = container.querySelector('#grading-modal-slot');
    slot.innerHTML = `<div class="modal-backdrop"><div class="modal-dialog lg"><div class="modal-body"><p style="padding:20px;color:var(--text-muted);">Memuat lembar jawaban...</p></div></div></div>`;

    let sub;
    try {
      sub = (await api.getSubmissionDetail(subId)).data;
    } catch (err) {
      slot.innerHTML = '';
      showToast(err.message, 'error');
      return;
    }

    const sheetHtml = (sub.sheet || []).length ? sub.sheet.map(it => {
      const answered = String(it.answer || '').trim() !== '';
      let verdict = '';
      if (it.type === 'multiple_choice') {
        if (it.correct_index === null || it.correct_index === undefined) verdict = '';
        else if (!answered) verdict = '<span class="badge-tag warning">Tidak dijawab</span>';
        else verdict = it.is_correct ? '<span class="badge-tag success">Benar ✔</span>' : `<span class="badge-tag" style="background:#fee2e2;color:#b91c1c;">Salah ✘ (kunci: ${esc(it.options[it.correct_index])})</span>`;
      }
      return `
        <div style="border:1px solid var(--border-light);border-radius:10px;padding:12px;margin-bottom:10px;background:#fff;">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
            <strong style="font-size:0.82rem;color:var(--primary);">${esc(it.label)}</strong>${verdict}
          </div>
          <p style="font-size:0.84rem;color:var(--text-muted);margin:4px 0 8px;">${escMultiline(it.prompt)}</p>
          <div style="font-size:0.88rem;background:${answered ? '#f8fafc' : '#fffbeb'};padding:10px;border-radius:8px;white-space:pre-wrap;">${answered ? esc(it.answer) : '<em>(tidak dijawab)</em>'}</div>
        </div>`;
    }).join('') : '<p style="color:var(--text-muted);">LKPD untuk tugas ini tidak memiliki butir.</p>';

    const summary = sub.summary || {};
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog lg">
          <div class="modal-header">
            <h3 class="modal-title"><span>📝</span> ${esc(sub.student_name)} (NIS ${esc(sub.student_nis)})</h3>
            <button class="modal-close-btn" id="btn-close-grade-modal">✕</button>
          </div>
          <div class="modal-body" style="max-height:72vh;overflow-y:auto;">
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px;">
              ${esc(sub.assignment_title)} • Kelas ${esc(sub.class_name)} • Dikumpulkan ${fmtDateTime(sub.submitted_at)}
              ${sub.is_late ? ' <span class="badge-tag" style="background:#fee2e2;color:#b91c1c;">Terlambat</span>' : ''}
              • Terisi ${summary.answered_items || 0}/${summary.total_items || 0}
              ${summary.mc_total ? ` • Pilihan ganda benar ${summary.mc_correct}/${summary.mc_total} (${summary.mc_percent}%)` : ''}
            </p>
            <div style="background:var(--bg-surface-subtle);padding:14px;border-radius:var(--radius-md);margin-bottom:20px;">
              <h4 style="font-size:0.9rem;font-weight:700;margin-bottom:10px;">Jawaban Siswa</h4>
              ${sheetHtml}
            </div>

            <div style="margin-bottom:20px;">
              <button type="button" class="btn-primary" id="btn-run-ai-eval" style="width:auto;background:linear-gradient(135deg,#4f46e5,#9333ea);">✦ ANALISIS DENGAN AI</button>
              <span style="font-size:0.78rem;color:var(--text-muted);margin-left:10px;">AI hanya memberi rekomendasi; keputusan nilai ada pada guru.</span>
            </div>
            <div id="ai-eval-recommendation-box" style="display:none;background:#faf5ff;border:1.5px solid #d8b4fe;border-radius:var(--radius-lg);padding:20px;margin-bottom:24px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <span style="background:#9333ea;color:#fff;padding:2px 8px;border-radius:9999px;font-size:0.72rem;font-weight:800;">REKOMENDASI AI</span>
                <div><span style="font-size:0.82rem;color:#6b21a8;">Nilai rekomendasi:</span> <strong id="ai-rec-score" style="font-size:1.35rem;color:#7e22ce;"></strong></div>
              </div>
              <div style="font-size:0.85rem;line-height:1.5;color:#4c1d95;margin-bottom:14px;">
                <div style="margin-bottom:6px;"><strong>Kelebihan:</strong> <span id="ai-rec-strengths">-</span></div>
                <div style="margin-bottom:6px;"><strong>Kekurangan:</strong> <span id="ai-rec-weaknesses">-</span></div>
                <div><strong>Umpan balik:</strong> <span id="ai-rec-feedback">-</span></div>
              </div>
              <div style="display:flex;gap:8px;border-top:1px dashed #d8b4fe;padding-top:12px;">
                <button type="button" class="btn-demo-pill" id="btn-accept-ai-rec" style="background:var(--success);color:#fff;border:none;font-weight:700;">✅ Terapkan ke Form</button>
                <button type="button" class="btn-demo-pill" id="btn-reject-ai-rec" style="color:var(--danger);font-weight:700;">❌ Abaikan</button>
              </div>
            </div>

            <form id="form-final-grade">
              <div style="display:grid;grid-template-columns:140px 1fr;gap:16px;margin-bottom:16px;">
                <div><label class="form-label">Nilai (0-100) *</label>
                  <input type="number" id="final-score-input" class="form-input" min="0" max="100" step="0.5" value="${sub.score !== null && sub.score !== undefined ? esc(sub.score) : ''}" placeholder="${summary.mc_percent !== null && summary.mc_percent !== undefined ? 'PG: ' + summary.mc_percent : ''}" required /></div>
                <div><label class="form-label">Umpan Balik untuk Siswa</label>
                  <textarea id="final-feedback-input" class="form-input" rows="3" placeholder="Tuliskan umpan balik yang konstruktif...">${esc(sub.feedback || '')}</textarea></div>
              </div>
              <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <button type="button" class="btn-demo-pill" id="btn-return-sub" style="color:#b45309;border-color:#fcd34d;">↩️ Kembalikan untuk Revisi</button>
                <div style="display:flex;gap:10px;">
                  <button type="button" class="btn-demo-pill" id="btn-cancel-grade-modal">Batal</button>
                  <button type="submit" class="btn-primary" style="width:auto;">💾 Simpan Nilai</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>`;

    const closeModal = () => { slot.innerHTML = ''; };
    slot.querySelector('#btn-close-grade-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-grade-modal').addEventListener('click', closeModal);

    let currentAiRec = null;
    const aiBtn = slot.querySelector('#btn-run-ai-eval');
    aiBtn.addEventListener('click', async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = 'Menganalisis...';
      try {
        const res = await api.evaluateSubmission({ submission_id: sub.id });
        currentAiRec = res.data;
        slot.querySelector('#ai-eval-recommendation-box').style.display = 'block';
        slot.querySelector('#ai-rec-score').textContent = currentAiRec.score_recommendation;
        slot.querySelector('#ai-rec-strengths').textContent = (currentAiRec.strengths || []).join('; ') || '-';
        slot.querySelector('#ai-rec-weaknesses').textContent = (currentAiRec.weaknesses || []).join('; ') || '-';
        slot.querySelector('#ai-rec-feedback').textContent = currentAiRec.feedback || '-';
        showToast('Rekomendasi AI disusun.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✦ ANALISIS DENGAN AI';
      }
    });
    slot.querySelector('#btn-accept-ai-rec').addEventListener('click', () => {
      if (!currentAiRec) return;
      slot.querySelector('#final-score-input').value = currentAiRec.score_recommendation;
      slot.querySelector('#final-feedback-input').value = currentAiRec.feedback || '';
      showToast('Rekomendasi diterapkan. Silakan periksa sebelum menyimpan.', 'info');
    });
    slot.querySelector('#btn-reject-ai-rec').addEventListener('click', () => {
      slot.querySelector('#ai-eval-recommendation-box').style.display = 'none';
      currentAiRec = null;
    });

    slot.querySelector('#btn-return-sub').addEventListener('click', async () => {
      const note = prompt('Catatan untuk siswa (apa yang perlu diperbaiki)?', '');
      if (note === null) return;
      try {
        await api.returnSubmission(sub.id, note);
        showToast('Tugas dikembalikan ke siswa untuk direvisi.', 'success');
        closeModal();
        loadSubmissions();
      } catch (err) { showToast(err.message, 'error'); }
    });

    slot.querySelector('#form-final-grade').addEventListener('submit', async (e) => {
      e.preventDefault();
      const score = Number(slot.querySelector('#final-score-input').value);
      try {
        await api.submitGrade(sub.id, {
          score,
          feedback: slot.querySelector('#final-feedback-input').value.trim(),
          strengths: currentAiRec?.strengths || sub.strengths || [],
          weaknesses: currentAiRec?.weaknesses || sub.weaknesses || [],
          misconceptions: currentAiRec?.misconceptions || sub.misconceptions || []
        });
        showToast(`Nilai ${score} tersimpan untuk ${sub.student_name}.`, 'success');
        closeModal();
        loadSubmissions();
      } catch (err) { showToast(err.message, 'error'); }
    });
  }

  container.querySelector('#btn-export-grades-excel').addEventListener('click', async () => {
    try {
      const selectedClassId = classSelect.value;
      const selectedClass = availableClasses.find(c => c.id === selectedClassId);
      const label = selectedClass ? `Kelas ${selectedClass.name}` : 'Semua Kelas';
      showToast(`Menyiapkan berkas Excel nilai untuk ${label}...`, 'info');
      await api.exportGradesExcel(selectedClassId);
      showToast(`Berkas Excel nilai ${label} berhasil diunduh!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#btn-print-grades').addEventListener('click', () => {
    const selectedClassId = classSelect.value;
    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    const label = selectedClass ? `Kelas ${selectedClass.name} — ${selectedClass.subject}` : 'Semua Kelas';

    const selectedStatus = statusSelect.value;
    let filtered = allSubmissions.filter(sub => {
      if (selectedClassId && sub.class_id !== selectedClassId) return false;
      if (params.assignment && sub.assignment_id !== params.assignment) return false;
      if (selectedStatus === 'submitted' && sub.status !== 'submitted') return false;
      if (selectedStatus === 'graded' && sub.status !== 'graded') return false;
      return true;
    });

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const tableRows = filtered.map((s, idx) => `
      <tr>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #333; padding: 6px;">${esc(s.student_nis || '-')}</td>
        <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${esc(s.student_name)}</td>
        <td style="border: 1px solid #333; padding: 6px;">${esc(s.class_name || '-')}</td>
        <td style="border: 1px solid #333; padding: 6px;">${esc(s.assignment_title || 'Tugas LKPD')}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${s.score !== null ? s.score : 'Belum Dinilai'}</td>
        <td style="border: 1px solid #333; padding: 6px;">${s.score !== null && s.score >= 75 ? 'TUNTAS' : (s.score !== null ? 'REMEDIAL' : '-')}</td>
        <td style="border: 1px solid #333; padding: 6px; font-size: 0.85em;">${esc(s.feedback || '-')}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekap Nilai</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 25px; color: #111; }
          h2 { margin: 0 0 4px 0; text-align: center; }
          h4 { margin: 0 0 16px 0; text-align: center; color: #555; }
          .meta-info { margin-bottom: 16px; font-size: 0.9em; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.88em; }
          th { background: #f0f0f0; border: 1px solid #333; padding: 8px; text-align: left; }
          td { border: 1px solid #333; padding: 6px; }
          @media print {
            @page { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <h2>AI CLASSROOM — REKAPITULASI NILAI SISWA</h2>
        <h4>SMANESS LEARNING MANAGEMENT SYSTEM</h4>
        <div class="meta-info">
          <div><strong>Guru Pengampu:</strong> ${esc(user.name)} (${esc(user.subject || 'Umum')})</div>
          <div><strong>Filter Kelas:</strong> ${esc(label)}</div>
          <div><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
          <div><strong>Total Data Ditampilkan:</strong> ${filtered.length} Siswa</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No</th>
              <th>NIS</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Tugas / LKPD</th>
              <th style="width: 70px; text-align: center;">Nilai</th>
              <th>Status</th>
              <th>Umpan Balik Guru</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" style="text-align:center; padding:16px;">Tidak ada data nilai siswa.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  });

  container.querySelector('#btn-refresh-grading').addEventListener('click', () => {
    loadSubmissions();
    showToast('Daftar pengumpulan diperbarui', 'info');
  });

  await loadClasses();
  await loadSubmissions();
}

