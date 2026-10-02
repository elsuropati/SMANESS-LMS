import { api } from '../api.js';

export async function renderGradingView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Penilaian & Analisis Ulasan</h1>
          <p>Periksa hasil kerja siswa, gunakan evaluasi AI untuk rekomendasi rubrik, dan berikan umpan balik terarah.</p>
        </div>
        <div>
          <button class="btn-demo-pill" id="btn-refresh-grading" style="padding: 8px 16px;">
            <span>🔄 Segarkan Pengumpulan</span>
          </button>
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

  let submissions = [];

  async function loadSubmissions() {
    const tbody = container.querySelector('#submissions-table-body');
    const badge = container.querySelector('#grading-count-badge');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Memuat data pengumpulan tugas...</td></tr>`;

    try {
      const res = await api.getSubmissions();
      submissions = res.data || [];
      badge.textContent = `${submissions.length} Pengumpulan`;

      if (submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada pengumpulan tugas dari siswa.</td></tr>`;
        return;
      }

      tbody.innerHTML = submissions.map(sub => {
        let statusBadge = '<span class="badge-tag warning">Dikumpulkan</span>';
        if (sub.status === 'graded') {
          statusBadge = '<span class="badge-tag success">Dinilai</span>';
        } else if (sub.status === 'draft') {
          statusBadge = '<span class="badge-tag info">Draft (Mengerjakan)</span>';
        }

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-main);">${sub.student_name}</div>
            </td>
            <td><code>${sub.student_nis || '-'}</code></td>
            <td>
              <span style="font-size: 0.8rem; color: var(--text-muted);">
                ${sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum submit'}
              </span>
            </td>
            <td>${statusBadge}</td>
            <td>
              <strong style="font-size: 1.05rem; color: ${sub.score !== null ? 'var(--primary)' : 'var(--text-muted)'};">
                ${sub.score !== null ? sub.score : '—'}
              </strong>
            </td>
            <td style="text-align: right;">
              <button class="btn-demo-pill btn-review-sub" data-id="${sub.id}" style="font-weight: 600;">
                🔍 Periksa & Nilai
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

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger); text-align: center;">Gagal: ${err.message}</td></tr>`;
    }
  }

  function openGradingModal(subId) {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;

    const slot = container.querySelector('#grading-modal-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📝</span> Lembar Penilaian: ${sub.student_name} (NIS ${sub.student_nis})
            </h3>
            <button class="modal-close-btn" id="btn-close-grade-modal">✕</button>
          </div>
          <div class="modal-body">
            <!-- Student Answers Box -->
            <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
              <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
                Jawaban Siswa yang Dikumpulkan:
              </h4>
              <div style="font-size: 0.85rem; line-height: 1.6; color: var(--text-main); display: flex; flex-direction: column; gap: 8px;">
                <p><strong>Aktivitas:</strong> ${sub.answers?.activity1 || sub.answers?.aktivitas || 'Siswa mengkaji perbandingan pelarut air vs pelarut benzena.'}</p>
                <p><strong>Jawaban Pertanyaan:</strong> ${sub.answers?.q2 || sub.answers?.pertanyaan || 'Pencegahan limbah lebih murah dan menghindari akumulasi racun.'}</p>
                <p><strong>Refleksi Siswa:</strong> <em>"${sub.answers?.reflection || sub.answers?.refleksi || 'Memahami konsep dasar limbah tapi butuh penguatan kalkulasi.'}"</em></p>
              </div>
            </div>

            <!-- AI Assessment Trigger -->
            <div style="margin-bottom: 20px;">
              <button type="button" class="btn-primary" id="btn-run-ai-eval" style="width: auto; background: linear-gradient(135deg, #4f46e5, #9333ea);">
                <span>✦</span> [ ANALISIS DENGAN AI ]
              </button>
              <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 10px;">
                AI menganalisis jawaban terhadap rubrik & tujuan pembelajaran.
              </span>
            </div>

            <!-- AI Recommendation Box (Hidden until triggered) -->
            <div id="ai-eval-recommendation-box" style="display: none; background: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: #9333ea; color: #fff; padding: 2px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 800;">
                    REKOMENDASI AI
                  </span>
                  <span style="font-size: 0.85rem; font-weight: 700; color: #581c87;">Evaluasi Multi-Aspek</span>
                </div>
                <div>
                  <span style="font-size: 0.82rem; color: #6b21a8;">Nilai Rekomendasi:</span>
                  <strong id="ai-rec-score" style="font-size: 1.35rem; color: #7e22ce; margin-left: 6px;">85</strong>
                </div>
              </div>

              <div style="font-size: 0.85rem; line-height: 1.5; color: #4c1d95; margin-bottom: 14px;">
                <div style="margin-bottom: 6px;"><strong>Kelebihan:</strong> <span id="ai-rec-strengths">-</span></div>
                <div style="margin-bottom: 6px;"><strong>Kekurangan:</strong> <span id="ai-rec-weaknesses">-</span></div>
                <div><strong>Rekomendasi Feedback:</strong> <span id="ai-rec-feedback">-</span></div>
              </div>

              <!-- Guru Decision Action Buttons -->
              <div style="display: flex; gap: 8px; border-top: 1px dashed #d8b4fe; padding-top: 12px;">
                <button type="button" class="btn-demo-pill" id="btn-accept-ai-rec" style="background: var(--success); color: #fff; border: none; font-weight: 700;">
                  ✅ [ TERIMA ]
                </button>
                <button type="button" class="btn-demo-pill" id="btn-edit-ai-rec" style="font-weight: 700;">
                  ✏️ [ EDIT ]
                </button>
                <button type="button" class="btn-demo-pill" id="btn-reject-ai-rec" style="color: var(--danger); font-weight: 700;">
                  ❌ [ TOLAK ]
                </button>
              </div>
            </div>

            <!-- Final Grade Form (Teacher decides!) -->
            <form id="form-final-grade">
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                  <label class="form-label">Nilai Final (0-100) *</label>
                  <input type="number" id="final-score-input" class="form-input" min="0" max="100" value="${sub.score !== null ? sub.score : 85}" required />
                </div>
                <div>
                  <label class="form-label">Umpan Balik Guru (Feedback untuk Siswa)</label>
                  <textarea id="final-feedback-input" class="form-input" rows="3" placeholder="Tuliskan umpan balik yang konstruktif...">${sub.feedback || 'Jawaban Anda telah menunjukkan penalaran yang baik mengenai prinsip kimia hijau.'}</textarea>
                </div>
              </div>

              <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 0.78rem; color: var(--text-muted); margin-bottom: 16px;">
                ⚠️ <em>Sesuai standar pedagogis, AI tidak dapat menetapkan nilai akhir secara sepihak. Guru adalah pengambil keputusan final.</em>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn-demo-pill" id="btn-cancel-grade-modal">Batal</button>
                <button type="submit" class="btn-primary" style="width: auto;">
                  💾 Simpan Nilai & Terbitkan Ulasan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-grade-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-grade-modal').addEventListener('click', closeModal);

    let currentAiRec = null;

    // AI Evaluation trigger
    const aiBtn = slot.querySelector('#btn-run-ai-eval');
    aiBtn.addEventListener('click', async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = 'Menganalisis Jawaban...';

      try {
        const res = await api.evaluateSubmission({
          submissionId: sub.id,
          studentAnswers: sub.answers,
          rubric: 'Rubrik pemahaman konsep pelarut hijau dan stoikiometri atom'
        });

        currentAiRec = res.data;
        const box = slot.querySelector('#ai-eval-recommendation-box');
        box.style.display = 'block';

        slot.querySelector('#ai-rec-score').textContent = currentAiRec.score_recommendation;
        slot.querySelector('#ai-rec-strengths').textContent = currentAiRec.strengths?.join(', ') || 'Pemahaman konsep tepat';
        slot.querySelector('#ai-rec-weaknesses').textContent = currentAiRec.weaknesses?.join(', ') || 'Perlu ketelitian perhitungan';
        slot.querySelector('#ai-rec-feedback').textContent = currentAiRec.feedback || 'Teruskan penalaran kritis Anda.';

        showToast('Rekomendasi evaluasi AI berhasil disusun.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✦ [ ANALISIS DENGAN AI ]';
      }
    });

    // Accept AI Recommendation
    slot.querySelector('#btn-accept-ai-rec').addEventListener('click', () => {
      if (!currentAiRec) return;
      slot.querySelector('#final-score-input').value = currentAiRec.score_recommendation;
      slot.querySelector('#final-feedback-input').value = currentAiRec.feedback;
      showToast('Rekomendasi AI diterapkan ke form penilaian.', 'success');
    });

    // Edit AI Recommendation
    slot.querySelector('#btn-edit-ai-rec').addEventListener('click', () => {
      if (!currentAiRec) return;
      slot.querySelector('#final-score-input').value = currentAiRec.score_recommendation;
      slot.querySelector('#final-feedback-input').value = currentAiRec.feedback;
      slot.querySelector('#final-score-input').focus();
      showToast('Rekomendasi dimuat. Silakan edit nilai atau ulasan.', 'info');
    });

    // Reject AI Recommendation
    slot.querySelector('#btn-reject-ai-rec').addEventListener('click', () => {
      slot.querySelector('#ai-eval-recommendation-box').style.display = 'none';
      showToast('Rekomendasi AI ditolak. Anda dapat mengisi nilai manual.', 'info');
    });

    // Submit Final Grade
    slot.querySelector('#form-final-grade').addEventListener('submit', async (e) => {
      e.preventDefault();
      const score = Number(slot.querySelector('#final-score-input').value);
      const feedback = slot.querySelector('#final-feedback-input').value.trim();

      try {
        await api.submitGrade(sub.id, {
          score,
          feedback,
          strengths: currentAiRec?.strengths || [],
          weaknesses: currentAiRec?.weaknesses || []
        });

        showToast(`Nilai ${score} berhasil diterbitkan untuk ${sub.student_name}!`, 'success');
        closeModal();
        loadSubmissions();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  container.querySelector('#btn-refresh-grading').addEventListener('click', () => {
    loadSubmissions();
    showToast('Daftar pengumpulan diperbarui', 'info');
  });

  loadSubmissions();
}
