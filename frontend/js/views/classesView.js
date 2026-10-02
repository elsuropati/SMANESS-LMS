import { api } from '../api.js';

export async function renderClassesView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Kelola Kelas & Siswa</h1>
          <p>Atur kelas binaan, data peserta didik, dan impor siswa secara massal.</p>
        </div>
        <div>
          <button class="btn-primary" id="btn-open-create-class" style="width: auto; padding: 10px 18px;">
            <span>➕</span> <span>Tambah Kelas Baru</span>
          </button>
        </div>
      </div>

      <div id="classes-content-loading" style="padding: 30px; text-align: center; color: var(--text-muted);">
        Memuat data kelas...
      </div>

      <div id="classes-content-body" style="display: none;">
        <!-- Class Selector & Quick Stats -->
        <div style="display: flex; gap: 16px; margin-bottom: 24px; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 250px;">
            <label class="form-label" for="select-active-class">Pilih Kelas Binaan:</label>
            <select id="select-active-class" class="form-input" style="font-weight: 600;">
              <!-- Dynamically populated -->
            </select>
          </div>
          <div style="display: flex; gap: 10px; align-self: flex-end;">
            <button class="btn-demo-pill" id="btn-open-add-student" style="padding: 10px 16px;">
              <span>➕ Tambah Siswa</span>
            </button>
            <button class="btn-demo-pill" id="btn-open-import-modal" style="padding: 10px 16px; border-color: var(--primary-border); color: var(--primary);">
              <span>📥 Impor CSV/Excel</span>
            </button>
          </div>
        </div>

        <!-- Class Info Card -->
        <div class="content-panel" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 id="class-title-display" style="font-size: 1.2rem; font-weight: 800; color: var(--text-main);">Kelas</h3>
              <p id="class-desc-display" style="font-size: 0.84rem; color: var(--text-muted); margin-top: 2px;">Deskripsi kelas</p>
            </div>
            <div style="display: flex; gap: 12px;">
              <span class="stat-badge" id="class-year-badge">TA 2026/2027</span>
              <span class="stat-badge" id="class-student-count-badge">0 Siswa</span>
            </div>
          </div>
        </div>

        <!-- Students Table Panel -->
        <div class="content-panel">
          <div class="panel-header">
            <h3 class="panel-title">
              <span>👥</span> Daftar Peserta Didik
            </h3>
            <span class="badge-tag info" id="students-table-count">0 Terdaftar</span>
          </div>

          <div class="table-container">
            <table class="modern-table">
              <thead>
                <tr>
                  <th style="width: 50px;">No</th>
                  <th>Nama Lengkap</th>
                  <th>NIS</th>
                  <th>Email Akun</th>
                  <th>Status</th>
                  <th>Progress LKPD</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody id="students-table-body">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="modal-container-slot"></div>
  `;

  let currentClasses = [];
  let selectedClassId = null;

  async function loadClasses() {
    const loadingEl = container.querySelector('#classes-content-loading');
    const bodyEl = container.querySelector('#classes-content-body');
    const selectEl = container.querySelector('#select-active-class');

    try {
      loadingEl.style.display = 'block';
      bodyEl.style.display = 'none';

      const res = await api.getClasses();
      if (!res.success || !res.data) throw new Error(res.message);

      currentClasses = res.data;
      if (currentClasses.length === 0) {
        loadingEl.innerHTML = `<p style="padding: 20px;">Belum ada kelas binaan. Silakan klik tombol "Tambah Kelas Baru".</p>`;
        return;
      }

      selectEl.innerHTML = currentClasses.map(c => `
        <option value="${c.id}" ${c.id === selectedClassId ? 'selected' : ''}>
          Kelas ${c.name} — ${c.subject} (${c.academic_year})
        </option>
      `).join('');

      if (!selectedClassId) {
        selectedClassId = currentClasses[0].id;
      }

      loadingEl.style.display = 'none';
      bodyEl.style.display = 'block';

      loadStudentsForClass(selectedClassId);
    } catch (err) {
      loadingEl.innerHTML = `<div class="alert-box alert-error">⚠️ ${err.message}</div>`;
    }
  }

  async function loadStudentsForClass(classId) {
    const cls = currentClasses.find(c => c.id === classId);
    if (cls) {
      container.querySelector('#class-title-display').textContent = `Kelas ${cls.name} — ${cls.subject}`;
      container.querySelector('#class-desc-display').textContent = cls.description || 'Tidak ada deskripsi.';
      container.querySelector('#class-year-badge').textContent = `TA ${cls.academic_year}`;
    }

    const tbody = container.querySelector('#students-table-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat daftar siswa...</td></tr>`;

    try {
      const res = await api.getStudents(classId);
      const students = res.data || [];

      container.querySelector('#class-student-count-badge').textContent = `${students.length} Siswa`;
      container.querySelector('#students-table-count').textContent = `${students.length} Siswa Terdaftar`;

      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada siswa di kelas ini. Klik "Tambah Siswa" atau "Impor CSV/Excel".</td></tr>`;
        return;
      }

      tbody.innerHTML = students.map((s, idx) => `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${s.name}</div>
          </td>
          <td><code>${s.nis}</code></td>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);">${s.email}</span></td>
          <td>
            <span class="badge-tag ${s.status === 'active' ? 'success' : 'warning'}">
              ${s.status === 'active' ? 'Aktif' : 'Nonaktif'}
            </span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="progress-bar-container" style="width: 80px; height: 6px; margin: 0;">
                <div class="progress-bar-fill" style="width: ${s.progress || 0}%;"></div>
              </div>
              <span style="font-size: 0.76rem; font-weight: 600;">${s.progress || 0}%</span>
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button class="btn-demo-pill btn-toggle-status" data-id="${s.id}" data-status="${s.status}" title="Ubah status">
                ${s.status === 'active' ? '🚫 Nonaktifkan' : '✅ Aktifkan'}
              </button>
              <button class="btn-demo-pill btn-reset-pass" data-id="${s.id}" title="Reset kata sandi">
                🔑 Reset
              </button>
              <button class="btn-demo-pill btn-delete-student" data-id="${s.id}" data-name="${s.name}" title="Hapus siswa" style="border-color: var(--danger); color: var(--danger);">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Status toggle events
      tbody.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentId = btn.getAttribute('data-id');
          const currentStatus = btn.getAttribute('data-status');
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
          try {
            await api.toggleStudentStatus(studentId, newStatus);
            showToast(`Status siswa diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`, 'success');
            loadStudentsForClass(classId);
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });

      // Reset pass events
      tbody.querySelectorAll('.btn-reset-pass').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentId = btn.getAttribute('data-id');
          if (confirm('Reset kata sandi siswa ini ke kata sandi bawaan "password123"?')) {
            try {
              await api.resetStudentPassword(studentId);
              showToast('Kata sandi siswa berhasil direset ke "password123".', 'success');
            } catch (e) {
              showToast(e.message, 'error');
            }
          }
        });
      });

      // Delete student events
      tbody.querySelectorAll('.btn-delete-student').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentId = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (confirm(`⚠️ Hapus permanen data siswa "${name}"?\n\nAksi ini tidak dapat dibatalkan.`)) {
            try {
              await api.deleteStudent(studentId);
              showToast(`Data siswa "${name}" berhasil dihapus.`, 'success');
              loadStudentsForClass(classId);
            } catch (e) {
              showToast(e.message, 'error');
            }
          }
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger); text-align: center;">Gagal memuat siswa: ${err.message}</td></tr>`;
    }
  }


  // Select class change
  container.querySelector('#select-active-class').addEventListener('change', (e) => {
    selectedClassId = e.target.value;
    loadStudentsForClass(selectedClassId);
  });

  // Modal: Tambah Kelas Baru
  container.querySelector('#btn-open-create-class').addEventListener('click', () => {
    const slot = container.querySelector('#modal-container-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Tambah Kelas Baru</h3>
            <button class="modal-close-btn" id="btn-close-class-modal">✕</button>
          </div>
          <form id="form-create-class">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nama Kelas *</label>
                <input type="text" id="new-class-name" class="form-input" placeholder="Contoh: X-1, XI IPA 2" required />
              </div>
              <div class="form-group">
                <label class="form-label">Mata Pelajaran *</label>
                <input type="text" id="new-class-subject" class="form-input" value="${user.subject || 'Kimia'}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tahun Pelajaran</label>
                <input type="text" id="new-class-year" class="form-input" value="2026/2027" required />
              </div>
              <div class="form-group">
                <label class="form-label">Deskripsi / Catatan Pembelajaran</label>
                <textarea id="new-class-desc" class="form-input" rows="3" placeholder="Fase E, materi semester ganjil..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-demo-pill" id="btn-cancel-class-modal">Batal</button>
              <button type="submit" class="btn-primary" style="width: auto;">Simpan Kelas</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-class-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-class-modal').addEventListener('click', closeModal);

    slot.querySelector('#form-create-class').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = slot.querySelector('#new-class-name').value.trim();
      const subject = slot.querySelector('#new-class-subject').value.trim();
      const academic_year = slot.querySelector('#new-class-year').value.trim();
      const description = slot.querySelector('#new-class-desc').value.trim();

      try {
        const res = await api.createClass({ name, subject, academic_year, description });
        showToast('Kelas baru berhasil ditambahkan!', 'success');
        closeModal();
        selectedClassId = res.data.id;
        loadClasses();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Modal: Tambah Siswa Tunggal
  container.querySelector('#btn-open-add-student').addEventListener('click', () => {
    if (!selectedClassId) {
      showToast('Pilih atau buat kelas terlebih dahulu.', 'warning');
      return;
    }

    const slot = container.querySelector('#modal-container-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Tambah Siswa Baru</h3>
            <button class="modal-close-btn" id="btn-close-std-modal">✕</button>
          </div>
          <form id="form-create-student">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nama Lengkap Siswa *</label>
                <input type="text" id="new-std-name" class="form-input" placeholder="Contoh: Muhammad Rizky" required />
              </div>
              <div class="form-group">
                <label class="form-label">Nomor Induk Siswa (NIS) *</label>
                <input type="text" id="new-std-nis" class="form-input" placeholder="Contoh: 10245" required />
              </div>
              <div class="form-group">
                <label class="form-label">Email Akun (Opsional)</label>
                <input type="email" id="new-std-email" class="form-input" placeholder="Otomatis: [nis]@aiclassroom.sch.id" />
                <span style="font-size: 0.72rem; color: var(--text-muted);">Kata sandi default akun baru adalah: <strong>password123</strong></span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-demo-pill" id="btn-cancel-std-modal">Batal</button>
              <button type="submit" class="btn-primary" style="width: auto;">Daftarkan Siswa</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-std-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-std-modal').addEventListener('click', closeModal);

    slot.querySelector('#form-create-student').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = slot.querySelector('#new-std-name').value.trim();
      const nis = slot.querySelector('#new-std-nis').value.trim();
      const email = slot.querySelector('#new-std-email').value.trim();

      try {
        await api.createStudent(selectedClassId, { name, nis, email });
        showToast(`Siswa "${name}" berhasil didaftarkan.`, 'success');
        closeModal();
        loadStudentsForClass(selectedClassId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Modal: Import Siswa CSV/Excel
  container.querySelector('#btn-open-import-modal').addEventListener('click', () => {
    if (!selectedClassId) {
      showToast('Pilih kelas terlebih dahulu.', 'warning');
      return;
    }

    const slot = container.querySelector('#modal-container-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📥</span> Impor Siswa Massal (CSV / Format Teks)
            </h3>
            <button class="modal-close-btn" id="btn-close-import-modal">✕</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">
              Tempelkan daftar siswa dengan format <strong>Nama, NIS</strong> atau <strong>Nama, NIS, Email</strong> (satu siswa per baris), atau unggah file CSV.
            </p>

            <div class="form-group">
              <label class="form-label">Data Siswa (Format CSV / Paste):</label>
              <textarea id="import-csv-text" class="form-input" rows="8" style="font-family: monospace; font-size: 0.85rem;" placeholder="Ahmad Dhani,10243\nDewi Sartika,10244,dewi@aiclassroom.sch.id\nFajar Pratama,10245">Rendra Wijaya,10243
Zaskia Gotik,10244
Bambang Pamungkas,10245,bambang@aiclassroom.sch.id</textarea>
            </div>

            <div style="background: var(--bg-surface-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 0.78rem; color: var(--text-muted);">
              💡 <em>Seluruh akun siswa yang diimpor akan langsung dapat masuk ke AI CLASSROOM menggunakan kata sandi awal: <strong>password123</strong></em>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-demo-pill" id="btn-cancel-import-modal">Batal</button>
            <button type="button" class="btn-primary" id="btn-process-import" style="width: auto;">
              Mulai Impor Siswa
            </button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-import-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-import-modal').addEventListener('click', closeModal);

    slot.querySelector('#btn-process-import').addEventListener('click', async () => {
      const rawText = slot.querySelector('#import-csv-text').value.trim();
      if (!rawText) {
        showToast('Teks data siswa tidak boleh kosong.', 'error');
        return;
      }

      const lines = rawText.split('\n');
      const parsedStudents = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          parsedStudents.push({
            name: parts[0],
            nis: parts[1],
            email: parts[2] || `${parts[1]}@aiclassroom.sch.id`
          });
        }
      }

      if (parsedStudents.length === 0) {
        showToast('Format baris tidak valid. Gunakan format "Nama,NIS".', 'error');
        return;
      }

      try {
        const res = await api.importStudents(selectedClassId, parsedStudents);
        showToast(res.message || `Berhasil mengimpor ${parsedStudents.length} siswa!`, 'success');
        closeModal();
        loadStudentsForClass(selectedClassId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Initial load
  loadClasses();
}
