import { api } from '../api.js';

// ======================================================
// 1. ADMIN DASHBOARD
// ======================================================
export async function renderAdminDashboard(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Dashboard Administrator Sekolah</h1>
          <p>Selamat datang, <strong>${user.name}</strong> • Pengelolaan Akun Tenaga Pendidik & Sistem AI CLASSROOM</p>
        </div>
      </div>

      <div id="admin-stats-loading" style="padding: 30px; text-align: center; color: var(--text-muted);">
        Memuat statistik institusi...
      </div>

      <div id="admin-stats-body" style="display: none;">
        <!-- Stat Cards Grid -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-card-header">
              <span class="stat-label">Total Guru Terdaftar</span>
              <div class="stat-icon-wrapper">👨‍🏫</div>
            </div>
            <div class="stat-value" id="adm-total-teachers">0</div>
            <span class="stat-badge">Tenaga Pendidik</span>
          </div>

          <div class="stat-card secondary">
            <div class="stat-card-header">
              <span class="stat-label">Total Siswa Aktif</span>
              <div class="stat-icon-wrapper">👥</div>
            </div>
            <div class="stat-value" id="adm-total-students">0</div>
            <span class="stat-badge">Peserta Didik</span>
          </div>

          <div class="stat-card purple">
            <div class="stat-card-header">
              <span class="stat-label">Total Kelas Binaan</span>
              <div class="stat-icon-wrapper">🏫</div>
            </div>
            <div class="stat-value" id="adm-total-classes">0</div>
            <span class="stat-badge">Rombongan Belajar</span>
          </div>

          <div class="stat-card success">
            <div class="stat-card-header">
              <span class="stat-label">Koleksi LKPD</span>
              <div class="stat-icon-wrapper">📄</div>
            </div>
            <div class="stat-value" id="adm-total-lkpd">0</div>
            <span class="stat-badge">Kurikulum Aktif</span>
          </div>
        </div>

        <!-- System Quick Access Panels -->
        <div class="dashboard-grid-2col">
          <div class="content-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <span>⚡</span> Tugas Cepat Administrator
              </h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <a href="#teachers" class="quick-action-btn" style="text-decoration: none;">
                <span>👨‍🏫</span>
                <div>
                  <div style="font-weight: 700;">Kelola Akun Guru & Akses Login</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">Buat akun baru untuk guru, reset kata sandi, dan atur hak akses.</div>
                </div>
              </a>
              <div class="alert-box" style="background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; margin: 0;">
                <div>
                  <strong>Status Layanan AI:</strong> Mode multi-provider aktif dan siap melayani permintaan modul LKPD dan analisis jawaban esai.
                </div>
              </div>
            </div>
          </div>

          <div class="content-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <span>🛡️</span> Informasi Keamanan Sistem
              </h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Tipe Akses:</span>
                <span class="badge-tag danger">Super Administrator</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Enkripsi Sandi:</span>
                <strong>Bcrypt 10 Rounds (Secure)</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
                <span style="color: var(--text-muted);">Token Autentikasi:</span>
                <strong>JWT 7-Hari</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Kunci API AI Guru:</span>
                <span class="badge-tag success">Tersimpan Aman di Server</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await api.getAdminStats();
    const data = res.data;

    container.querySelector('#adm-total-teachers').textContent = data.totalTeachers;
    container.querySelector('#adm-total-students').textContent = data.totalStudents;
    container.querySelector('#adm-total-classes').textContent = data.totalClasses;
    container.querySelector('#adm-total-lkpd').textContent = data.totalLkpd;

    container.querySelector('#admin-stats-loading').style.display = 'none';
    container.querySelector('#admin-stats-body').style.display = 'block';
  } catch (err) {
    container.querySelector('#admin-stats-loading').innerHTML = `<div class="alert-box alert-error">⚠️ ${err.message}</div>`;
  }
}

// ======================================================
// 2. KELOLA AKUN GURU (Teacher Accounts Management)
// ======================================================
export async function renderTeacherManagementView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Kelola Akun Guru & Tenaga Pendidik</h1>
          <p>Tambahkan akun guru baru, berikan akses login, dan bantu reset kata sandi guru jika diperlukan.</p>
        </div>
        <div>
          <button class="btn-primary" id="btn-open-create-teacher-modal" style="width: auto; padding: 10px 18px;">
            <span>➕</span> <span>Buat Akun Guru Baru</span>
          </button>
        </div>
      </div>

      <!-- Teachers Table Panel -->
      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>👨‍🏫</span> Daftar Akun Guru Sekolah
          </h3>
          <span class="badge-tag info" id="teachers-count-badge">Memuat...</span>
        </div>

        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                <th>Nama Lengkap Guru</th>
                <th>NIP</th>
                <th>Email Login</th>
                <th>Mata Pelajaran</th>
                <th>Status Akun</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="teachers-table-body">
              <!-- Populated dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="admin-modal-slot"></div>
  `;

  let teachers = [];

  async function loadTeachers() {
    const tbody = container.querySelector('#teachers-table-body');
    const badge = container.querySelector('#teachers-count-badge');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Memuat data guru...</td></tr>`;

    try {
      const res = await api.getAdminTeachers();
      teachers = res.data || [];
      badge.textContent = `${teachers.length} Guru`;

      if (teachers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada akun guru. Klik "Buat Akun Guru Baru".</td></tr>`;
        return;
      }

      tbody.innerHTML = teachers.map((t, idx) => `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${t.name}</div>
          </td>
          <td><code>${t.nip || '-'}</code></td>
          <td><strong style="color: var(--primary);">${t.email}</strong></td>
          <td><span class="badge-tag info">${t.subject || 'Umum'}</span></td>
          <td>
            <span class="badge-tag ${t.status === 'active' ? 'success' : 'warning'}">
              ${t.status === 'active' ? 'Aktif' : 'Nonaktif'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button class="btn-demo-pill btn-reset-teacher-pass" data-id="${t.id}" data-name="${t.name}" title="Reset kata sandi guru">
                🔑 Reset Sandi
              </button>
              <button class="btn-demo-pill btn-toggle-teacher-status" data-id="${t.id}" data-status="${t.status}" title="Ubah status akun">
                ${t.status === 'active' ? '🚫 Nonaktifkan' : '✅ Aktifkan'}
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Reset Password Handler
      tbody.querySelectorAll('.btn-reset-teacher-pass').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (confirm(`Reset kata sandi akun guru "${name}" kembali ke bawaan "password123"?`)) {
            try {
              const res = await api.resetTeacherPasswordByAdmin(id);
              showToast(res.message || `Kata sandi "${name}" berhasil direset ke password123.`, 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });

      // Toggle Status Handler
      tbody.querySelectorAll('.btn-toggle-teacher-status').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const currentStatus = btn.getAttribute('data-status');
          const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
          try {
            await api.toggleTeacherStatusByAdmin(id, newStatus);
            showToast(`Status akun guru berhasil diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`, 'success');
            loadTeachers();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger); text-align: center;">Gagal: ${err.message}</td></tr>`;
    }
  }

  // Modal: Tambah Akun Guru Baru
  container.querySelector('#btn-open-create-teacher-modal').addEventListener('click', () => {
    const slot = container.querySelector('#admin-modal-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>👨‍🏫</span> Buat Akun Guru Baru
            </h3>
            <button class="modal-close-btn" id="btn-close-t-modal">✕</button>
          </div>
          <form id="form-create-teacher">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="t-name">Nama Lengkap Guru (beserta gelar) *</label>
                <input type="text" id="t-name" class="form-input" placeholder="Contoh: Dra. Siti Rahmawati, M.Pd." required />
              </div>

              <div class="form-group">
                <label class="form-label" for="t-nip">Nomor Induk Pegawai (NIP)</label>
                <input type="text" id="t-nip" class="form-input" placeholder="Contoh: 198203152008012015" />
              </div>

              <div class="form-group">
                <label class="form-label" for="t-email">Email Login Akun Guru *</label>
                <input type="email" id="t-email" class="form-input" placeholder="Contoh: sitirahma@aiclassroom.sch.id" required autocomplete="username" />
              </div>

              <div class="form-group">
                <label class="form-label" for="t-subject">Mata Pelajaran yang Diampu</label>
                <input type="text" id="t-subject" class="form-input" placeholder="Contoh: Biologi / Matematika / Fisika" value="Kimia" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="t-password">Kata Sandi Awal</label>
                <input type="text" id="t-password" class="form-input" value="password123" required />
                <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: block;">
                  Berikan email dan kata sandi ini kepada guru untuk login pertama kali. Guru dapat mengganti kata sandi setelah masuk.
                </span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-demo-pill" id="btn-cancel-t-modal">Batal</button>
              <button type="submit" class="btn-primary" style="width: auto;">
                ➕ Buat Akun Guru
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-t-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-t-modal').addEventListener('click', closeModal);

    slot.querySelector('#form-create-teacher').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          name: slot.querySelector('#t-name').value.trim(),
          nip: slot.querySelector('#t-nip').value.trim(),
          email: slot.querySelector('#t-email').value.trim(),
          subject: slot.querySelector('#t-subject').value.trim(),
          password: slot.querySelector('#t-password').value.trim()
        };

        const res = await api.createTeacherByAdmin(payload);
        showToast(res.message || 'Akun guru baru berhasil dibuat!', 'success');
        closeModal();
        loadTeachers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  loadTeachers();
}
