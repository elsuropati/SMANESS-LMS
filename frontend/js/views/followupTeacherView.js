import { api } from '../api.js';

export async function renderFollowupTeacherView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Tindak Lanjut Pembelajaran (Remedial & Pengayaan)</h1>
          <p>Rancang program pendampingan, modul penguatan, atau tantangan pengayaan terarah bagi peserta didik.</p>
        </div>
        <div>
          <button class="btn-primary" id="btn-open-create-flw" style="width: auto; padding: 10px 18px;">
            <span>🎯</span> <span>Terbitkan Tindak Lanjut</span>
          </button>
        </div>
      </div>

      <!-- Follow-up List Panel -->
      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>🎯</span> Program Tindak Lanjut Aktif
          </h3>
          <span class="badge-tag warning" id="flw-count-badge">0 Program</span>
        </div>
        <div id="followup-list-container">
          <p style="color: var(--text-muted); padding: 16px;">Memuat data tindak lanjut...</p>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="flw-modal-slot"></div>
  `;

  async function loadFollowups() {
    const listContainer = container.querySelector('#followup-list-container');
    const badge = container.querySelector('#flw-count-badge');

    try {
      const res = await api.getFollowups();
      const followups = res.data || [];
      badge.textContent = `${followups.length} Program`;

      if (followups.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--text-muted);">
            <p>Belum ada program tindak lanjut yang diterbitkan. Klik <strong>Terbitkan Tindak Lanjut</strong> untuk memberi remedial/pengayaan bagi siswa.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = followups.map(f => `
        <div class="task-item-card">
          <div class="task-meta" style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="task-title">${f.student_name} • ${f.subject}</span>
              <span class="badge-tag ${f.status === 'completed' ? 'success' : 'warning'}">${f.status === 'completed' ? 'Selesai 100%' : 'Berjalan'}</span>
            </div>
            <div class="task-subtitle" style="margin-top: 4px;">
              <span>Topik: <strong>${f.topic}</strong></span>
              <span>•</span>
              <span>Kendala: <em>${f.problem}</em></span>
            </div>
            
            <div class="progress-bar-container" style="width: 250px; margin: 8px 0 4px 0;">
              <div class="progress-bar-fill" style="width: ${f.progress}%;"></div>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Kemajuan Siswa: <strong>${f.progress}%</strong></span>
          </div>
          <div style="display: flex; gap: 8px;">
            <span class="badge-tag info">Terkirim ke Siswa</span>
          </div>
        </div>
      `).join('');

    } catch (err) {
      listContainer.innerHTML = `<div class="alert-box alert-error">⚠️ Gagal memuat: ${err.message}</div>`;
    }
  }

  // Create Follow-up Modal
  container.querySelector('#btn-open-create-flw').addEventListener('click', async () => {
    const slot = container.querySelector('#flw-modal-slot');

    // Fetch classes & students
    let classes = [];
    try {
      const resC = await api.getClasses();
      classes = resC.data || [];
    } catch (e) {
      showToast('Gagal memuat data kelas.', 'error');
      return;
    }

    if (classes.length === 0) {
      showToast('Belum ada kelas binaan.', 'warning');
      return;
    }

    // Default fetch students for first class
    const resS = await api.getStudents(classes[0].id);
    const students = resS.data || [];

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>🎯</span> Terbitkan Tindak Lanjut Pembelajaran
            </h3>
            <button class="modal-close-btn" id="btn-close-flw-modal">✕</button>
          </div>
          <form id="form-create-followup">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Pilih Siswa Sasaran *</label>
                <select id="flw-student-select" class="form-input" required>
                  ${students.map(s => `<option value="${s.user_id}">${s.name} (NIS ${s.nis})</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Materi / Topik yang Perlu Diperkuat *</label>
                <input type="text" id="flw-topic-input" class="form-input" placeholder="Contoh: Pemahaman Konsep Dasar & Analisis Soal" required />
              </div>

              <div class="form-group">
                <label class="form-label">Identifikasi Kendala Siswa *</label>
                <input type="text" id="flw-problem-input" class="form-input" placeholder="Contoh: Perlu bimbingan tambahan dalam merumuskan kesimpulan" required />
              </div>

              <div class="form-group">
                <label class="form-label">Langkah Rekomendasi (Muncul di Dashboard Siswa)</label>
                <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
                  <span>✔️ 1. Buka materi penguatan konsep</span>
                  <span>✔️ 2. Kerjakan latihan interaktif terarah</span>
                  <span>✔️ 3. Isi refleksi pemahaman mandiri</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-demo-pill" id="btn-cancel-flw-modal">Batal</button>
              <button type="submit" class="btn-primary" style="width: auto;">
                [ TERBITKAN TINDAK LANJUT ]
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-flw-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-flw-modal').addEventListener('click', closeModal);

    slot.querySelector('#form-create-followup').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          student_id: slot.querySelector('#flw-student-select').value,
          subject: user.subject || 'Kimia',
          topic: slot.querySelector('#flw-topic-input').value.trim(),
          problem: slot.querySelector('#flw-problem-input').value.trim(),
          recommendations: [
            'Buka modul penguatan materi',
            'Kerjakan kuis latihan terarah',
            'Selesaikan refleksi mandiri'
          ]
        };

        await api.createFollowup(payload);
        showToast('Tindak lanjut berhasil diterbitkan ke dashboard siswa!', 'success');
        closeModal();
        loadFollowups();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  loadFollowups();
}
