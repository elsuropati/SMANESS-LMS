import { api } from '../api.js';

export async function renderAssignmentsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Penugasan LKPD</h1>
          <p>Terbitkan Lembar Kerja Peserta Didik ke kelas tertentu dengan tenggat waktu dan petunjuk pengerjaan.</p>
        </div>
        <div>
          <button class="btn-primary" id="btn-open-create-assign" style="width: auto; padding: 10px 18px;">
            <span>🚀</span> <span>Terbitkan Tugas Baru</span>
          </button>
        </div>
      </div>

      <!-- Published Assignments List -->
      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>📋</span> Daftar Penugasan Aktif
          </h3>
          <span class="badge-tag success" id="assign-count-badge">0 Penugasan</span>
        </div>
        <div id="assignments-list-container">
          <p style="color: var(--text-muted); padding: 16px;">Memuat data penugasan...</p>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="assign-modal-slot"></div>
  `;

  async function loadAssignments() {
    const listContainer = container.querySelector('#assignments-list-container');
    const badge = container.querySelector('#assign-count-badge');

    try {
      const res = await api.getAssignments();
      const assignments = res.data || [];
      badge.textContent = `${assignments.length} Penugasan`;

      if (assignments.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--text-muted);">
            <p>Belum ada penugasan LKPD yang diterbitkan. Klik <strong>Terbitkan Tugas Baru</strong> untuk memulai.</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = assignments.map(a => `
        <div class="task-item-card">
          <div class="task-meta">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="task-title">${a.title}</span>
              <span class="badge-tag success">Aktif</span>
            </div>
            <div class="task-subtitle" style="margin-top: 4px;">
              <span>Target Kelas: <strong>${a.class_name}</strong></span>
              <span>•</span>
              <span>Tenggat Waktu: <strong>${new Date(a.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
              ${a.instructions}
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-demo-pill btn-view-subs" data-id="${a.id}">
              👥 Cek Pengumpulan
            </button>
          </div>
        </div>
      `).join('');

      listContainer.querySelectorAll('.btn-view-subs').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.hash = '#grading';
        });
      });

    } catch (err) {
      listContainer.innerHTML = `<div class="alert-box alert-error">⚠️ Gagal memuat tugas: ${err.message}</div>`;
    }
  }

  // Open Modal Terbitkan Tugas
  container.querySelector('#btn-open-create-assign').addEventListener('click', async () => {
    const slot = container.querySelector('#assign-modal-slot');

    // Fetch classes and lkpd
    let classes = [];
    let lkpdList = [];

    try {
      const [resC, resL] = await Promise.all([api.getClasses(), api.getLkpdList()]);
      classes = resC.data || [];
      lkpdList = resL.data || [];
    } catch (e) {
      showToast('Gagal memuat daftar kelas atau LKPD.', 'error');
      return;
    }

    if (classes.length === 0) {
      showToast('Anda belum memiliki kelas. Tambahkan kelas terlebih dahulu di menu Kelas & Siswa.', 'warning');
      return;
    }

    if (lkpdList.length === 0) {
      showToast('Anda belum memiliki dokumen LKPD. Buat LKPD terlebih dahulu di menu LKPD Builder.', 'warning');
      return;
    }

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>🚀</span> Terbitkan Tugas LKPD ke Kelas
            </h3>
            <button class="modal-close-btn" id="btn-close-assign-modal">✕</button>
          </div>
          <form id="form-publish-assignment">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Pilih Dokumen LKPD *</label>
                <select id="assign-lkpd-select" class="form-input" required>
                  ${lkpdList.map(l => `<option value="${l.id}">${l.title} (${l.subject} - Kelas ${l.grade})</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Target Kelas Binaan *</label>
                <select id="assign-class-select" class="form-input" required>
                  ${classes.map(c => `<option value="${c.id}">Kelas ${c.name} — ${c.subject}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Judul Penugasan *</label>
                <input type="text" id="assign-title-input" class="form-input" value="LKPD: Prinsip Kimia Hijau" required />
              </div>

              <div class="form-group">
                <label class="form-label">Batas Waktu Pengumpulan (Deadline) *</label>
                <input type="datetime-local" id="assign-due-date" class="form-input" value="2026-10-12T23:59" required />
              </div>

              <div class="form-group">
                <label class="form-label">Instruksi Khusus untuk Siswa</label>
                <textarea id="assign-instructions" class="form-input" rows="3" placeholder="Kerjakan seluruh tahapan hingga 06 Kumpulkan sebelum batas akhir."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-demo-pill" id="btn-cancel-assign-modal">Batal</button>
              <button type="submit" class="btn-primary" style="width: auto;">
                [ TERBITKAN TUGAS ]
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-assign-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-assign-modal').addEventListener('click', closeModal);

    // Dynamic title from lkpd select
    const lkpdSelect = slot.querySelector('#assign-lkpd-select');
    const titleInput = slot.querySelector('#assign-title-input');
    lkpdSelect.addEventListener('change', () => {
      const selected = lkpdList.find(l => l.id === lkpdSelect.value);
      if (selected) titleInput.value = `Tugas: ${selected.title}`;
    });

    slot.querySelector('#form-publish-assignment').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          lkpd_id: slot.querySelector('#assign-lkpd-select').value,
          class_id: slot.querySelector('#assign-class-select').value,
          title: slot.querySelector('#assign-title-input').value.trim(),
          due_date: slot.querySelector('#assign-due-date').value,
          instructions: slot.querySelector('#assign-instructions').value.trim()
        };

        await api.createAssignment(payload);
        showToast('Tugas berhasil diterbitkan! Siswa di kelas terkait sekarang dapat mengaksesnya.', 'success');
        closeModal();
        loadAssignments();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  loadAssignments();
}
