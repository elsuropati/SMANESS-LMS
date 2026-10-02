import { api } from '../api.js';

export async function renderTeacherDashboard(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Dashboard Guru</h1>
          <p>Selamat datang, <strong>${user.name}</strong> • Mata Pelajaran: <strong>${user.subject || 'Kimia'}</strong></p>
        </div>
        <div class="dashboard-quick-actions-top">
          <button class="btn-demo-pill" id="btn-refresh-stats" style="padding: 8px 16px;">
            <span>🔄 Segarkan Data</span>
          </button>
        </div>
      </div>

      <div id="teacher-stats-loading" style="padding: 40px; text-align: center; color: var(--text-muted);">
        Memuat statistik pembelajaran...
      </div>

      <div id="teacher-dashboard-body" style="display: none;">
        <!-- Stat Cards Grid -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-card-header">
              <span class="stat-label">Total Kelas</span>
              <div class="stat-icon-wrapper">🏫</div>
            </div>
            <div class="stat-value" id="stat-total-classes">0</div>
            <span class="stat-badge">Kelas Aktif</span>
          </div>

          <div class="stat-card secondary">
            <div class="stat-card-header">
              <span class="stat-label">Total Siswa</span>
              <div class="stat-icon-wrapper">👥</div>
            </div>
            <div class="stat-value" id="stat-total-students">0</div>
            <span class="stat-badge">Terdaftar</span>
          </div>

          <div class="stat-card purple">
            <div class="stat-card-header">
              <span class="stat-label">Koleksi LKPD</span>
              <div class="stat-icon-wrapper">📄</div>
            </div>
            <div class="stat-value" id="stat-total-lkpd">0</div>
            <span class="stat-badge">Siap Ditugaskan</span>
          </div>

          <div class="stat-card success">
            <div class="stat-card-header">
              <span class="stat-label">Tugas Aktif</span>
              <div class="stat-icon-wrapper">📋</div>
            </div>
            <div class="stat-value" id="stat-active-assignments">0</div>
            <span class="stat-badge">Sedang Berjalan</span>
          </div>

          <div class="stat-card warning">
            <div class="stat-card-header">
              <span class="stat-label">Belum Diperiksa</span>
              <div class="stat-icon-wrapper">⏳</div>
            </div>
            <div class="stat-value" id="stat-ungraded">0</div>
            <span class="stat-badge">Perlu Penilaian</span>
          </div>

          <div class="stat-card danger">
            <div class="stat-card-header">
              <span class="stat-label">Perlu Tindak Lanjut</span>
              <div class="stat-icon-wrapper">🎯</div>
            </div>
            <div class="stat-value" id="stat-followup-needed">0</div>
            <span class="stat-badge">Remedial / Pengayaan</span>
          </div>
        </div>

        <!-- 2-Column Section: Classes & Activity -->
        <div class="dashboard-grid-2col">
          <!-- Left Column -->
          <div>
            <!-- Kelas Aktif Panel -->
            <div class="content-panel">
              <div class="panel-header">
                <h3 class="panel-title">
                  <span>🏫</span> Kelas Binaan Aktif
                </h3>
                <span class="badge-tag info" id="classes-count-badge">1 Kelas</span>
              </div>
              <div id="classes-list-container">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- Quick Action Shortcuts -->
            <div class="content-panel">
              <div class="panel-header">
                <h3 class="panel-title">
                  <span>⚡</span> Pintasan Cepat Pembelajaran
                </h3>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <button class="quick-action-btn" id="qa-create-lkpd">
                  <span>✦</span>
                  <div>
                    <div>Buat LKPD Baru</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">Generator Cerdas AI</div>
                  </div>
                </button>
                <button class="quick-action-btn" id="qa-assign-task">
                  <span>🚀</span>
                  <div>
                    <div>Terbitkan Tugas</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">Bagikan LKPD ke Kelas</div>
                  </div>
                </button>
                <button class="quick-action-btn" id="qa-grade-submissions">
                  <span>📝</span>
                  <div>
                    <div>Periksa Pengumpulan</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">Penilaian & Feedback AI</div>
                  </div>
                </button>
                <button class="quick-action-btn" id="qa-ai-settings">
                  <span>⚙️</span>
                  <div>
                    <div>Pengaturan AI</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">Gemini / OpenAI / Ollama</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Recent Activities & AI Status -->
          <div>
            <!-- AI Engine Card -->
            <div class="content-panel" style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); color: #ffffff; border: 1px solid #3730a3;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #a5b4fc; font-weight: 700;">AI Engine Status</span>
                <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; background: rgba(34, 197, 94, 0.2); color: #86efac; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(134, 239, 172, 0.3);">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #22c55e;"></span> Aktif
                </span>
              </div>
              <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">Google Gemini 1.5 Pro</div>
              <p style="font-size: 0.78rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 14px;">
                Abstraksi AI multi-provider siap membantu pembuatan LKPD otomatis, analisis jawaban esai, dan tindak lanjut remedial.
              </p>
              <button class="btn-demo-pill" id="btn-quick-ai-assistant" style="background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); width: 100%;">
                <span>✦ Buka AI Assistant Guru</span>
              </button>
            </div>

            <!-- Recent Activities -->
            <div class="content-panel">
              <div class="panel-header">
                <h3 class="panel-title">
                  <span>⏱️</span> Aktivitas Terbaru
                </h3>
              </div>
              <div class="activity-feed" id="activities-container">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fetch Teacher Stats
  async function loadStats() {
    const loadingEl = container.querySelector('#teacher-stats-loading');
    const bodyEl = container.querySelector('#teacher-dashboard-body');

    try {
      loadingEl.style.display = 'block';
      bodyEl.style.display = 'none';

      const res = await api.getTeacherDashboard();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal mengambil data dashboard');
      }

      const data = res.data;

      // Update stat counters
      container.querySelector('#stat-total-classes').textContent = data.totalClasses;
      container.querySelector('#stat-total-students').textContent = data.totalStudents;
      container.querySelector('#stat-total-lkpd').textContent = data.totalLkpd;
      container.querySelector('#stat-active-assignments').textContent = data.activeAssignments;
      container.querySelector('#stat-ungraded').textContent = data.ungradedSubmissions;
      container.querySelector('#stat-followup-needed').textContent = data.studentsNeedingFollowup;

      // Render Classes List
      const classesContainer = container.querySelector('#classes-list-container');
      if (data.classes && data.classes.length > 0) {
        classesContainer.innerHTML = data.classes.map(c => `
          <div class="task-item-card">
            <div class="task-meta">
              <span class="task-title">Kelas ${c.name} — ${c.subject}</span>
              <span class="task-subtitle">
                <span>📅 TA ${c.academic_year}</span>
                <span>•</span>
                <span>👥 ${c.student_count} Siswa Terdaftar</span>
              </span>
            </div>
            <div style="display: flex; gap: 8px;">
              <span class="badge-tag success">Aktif</span>
            </div>
          </div>
        `).join('');
      } else {
        classesContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Belum ada kelas terdaftar.</p>`;
      }

      // Render Activities
      const activitiesContainer = container.querySelector('#activities-container');
      if (data.recentActivities && data.recentActivities.length > 0) {
        activitiesContainer.innerHTML = data.recentActivities.map(a => `
          <div class="activity-item">
            <div class="activity-icon">📌</div>
            <div class="activity-info">
              <span class="activity-title">${a.title}</span>
              <span class="activity-desc">${a.description}</span>
              <span class="activity-time">${new Date(a.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
          </div>
        `).join('');
      } else {
        activitiesContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Belum ada aktivitas tercatat.</p>`;
      }

      loadingEl.style.display = 'none';
      bodyEl.style.display = 'block';
    } catch (err) {
      loadingEl.innerHTML = `
        <div class="alert-box alert-error">
          <span>⚠️ Gagal memuat data: ${err.message}</span>
        </div>
      `;
    }
  }

  // Refresh button
  container.querySelector('#btn-refresh-stats').addEventListener('click', () => {
    loadStats();
    showToast('Data statistik diperbarui', 'info');
  });

  // Shortcut listeners
  container.querySelector('#qa-create-lkpd').addEventListener('click', () => {
    showToast('Fitur LKPD Builder & AI Generator akan aktif pada Phase 3 & 8', 'info');
  });
  container.querySelector('#qa-assign-task').addEventListener('click', () => {
    showToast('Fitur Penugasan akan aktif pada Phase 4', 'info');
  });
  container.querySelector('#qa-grade-submissions').addEventListener('click', () => {
    showToast('Fitur Penilaian & AI Evaluator akan aktif pada Phase 6 & 8', 'info');
  });
  container.querySelector('#qa-ai-settings').addEventListener('click', () => {
    showToast('Pengaturan AI Multi-Provider akan dikonfigurasi penuh pada Phase 7', 'info');
  });
  container.querySelector('#btn-quick-ai-assistant').addEventListener('click', () => {
    showToast('AI Assistant Chat terhubung dengan Mock AI Service', 'info');
  });

  // Initial load
  loadStats();
}
