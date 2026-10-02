import { api } from '../api.js';

export async function renderStudentDashboard(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Dashboard Siswa</h1>
          <p>Selamat datang, <strong>${user.name}</strong> • NIS: <strong>${user.nip_or_nis || '-'}</strong> • Kelas: <strong>X-1</strong></p>
        </div>
        <div class="dashboard-quick-actions-top">
          <button class="btn-demo-pill" id="btn-refresh-student-stats" style="padding: 8px 16px;">
            <span>🔄 Segarkan Data</span>
          </button>
        </div>
      </div>

      <div id="student-stats-loading" style="padding: 40px; text-align: center; color: var(--text-muted);">
        Memuat data tugas dan pembelajaran...
      </div>

      <div id="student-dashboard-body" style="display: none;">
        <!-- Stat Cards Grid -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-card-header">
              <span class="stat-label">Tugas Aktif</span>
              <div class="stat-icon-wrapper">📝</div>
            </div>
            <div class="stat-value" id="stat-student-active-tasks">0</div>
            <span class="stat-badge">Perlu Dikerjakan</span>
          </div>

          <div class="stat-card success">
            <div class="stat-card-header">
              <span class="stat-label">Tugas Selesai</span>
              <div class="stat-icon-wrapper">✅</div>
            </div>
            <div class="stat-value" id="stat-student-completed">0</div>
            <span class="stat-badge">Telah Dikumpulkan</span>
          </div>

          <div class="stat-card danger">
            <div class="stat-card-header">
              <span class="stat-label">Tugas Terlambat</span>
              <div class="stat-icon-wrapper">⚠️</div>
            </div>
            <div class="stat-value" id="stat-student-overdue">0</div>
            <span class="stat-badge">Lewat Batas</span>
          </div>

          <div class="stat-card purple">
            <div class="stat-card-header">
              <span class="stat-label">Nilai Terbaru</span>
              <div class="stat-icon-wrapper">🏆</div>
            </div>
            <div class="stat-value" id="stat-student-latest-grade">—</div>
            <span class="stat-badge" id="stat-student-latest-grade-badge">Hasil Penilaian</span>
          </div>

          <div class="stat-card warning">
            <div class="stat-card-header">
              <span class="stat-label">Tindak Lanjut</span>
              <div class="stat-icon-wrapper">🎯</div>
            </div>
            <div class="stat-value" id="stat-student-followups">0</div>
            <span class="stat-badge">Remedial / Penguatan</span>
          </div>
        </div>

        <!-- Follow-up Banner if Available -->
        <div id="student-followup-banner-container"></div>

        <!-- 2-Column Section: Active Assignments & Performance Summary -->
        <div class="dashboard-grid-2col">
          <!-- Left Column: Assignments -->
          <div>
            <div class="content-panel">
              <div class="panel-header">
                <h3 class="panel-title">
                  <span>📚</span> Daftar Tugas LKPD
                </h3>
                <span class="badge-tag info" id="student-tasks-badge">Tugas Berjalan</span>
              </div>
              <div id="student-assignments-container">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>

          <!-- Right Column: Learning Status & Feedback -->
          <div>
            <!-- Latest Teacher Feedback Card -->
            <div class="content-panel" id="latest-feedback-panel">
              <div class="panel-header">
                <h3 class="panel-title">
                  <span>💬</span> Umpan Balik Guru
                </h3>
              </div>
              <div id="latest-feedback-content">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- Quick Navigation Tips -->
            <div class="content-panel" style="background-color: var(--bg-surface-subtle);">
              <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">
                💡 Alur Pengerjaan LKPD
              </h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
                Saat membuka tugas, ikuti navigasi tahap 01 Identitas hingga 06 Kumpulkan. Progres tersimpan secara otomatis sehingga Anda tidak perlu khawatir kehilangan catatan.
              </p>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <span class="stat-badge">01 Identitas</span>
                <span class="stat-badge">02 Materi</span>
                <span class="stat-badge">03 Aktivitas</span>
                <span class="stat-badge">04 Pertanyaan</span>
                <span class="stat-badge">05 Refleksi</span>
                <span class="stat-badge">06 Kumpulkan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  async function loadStudentStats() {
    const loadingEl = container.querySelector('#student-stats-loading');
    const bodyEl = container.querySelector('#student-dashboard-body');

    try {
      loadingEl.style.display = 'block';
      bodyEl.style.display = 'none';

      const res = await api.getStudentDashboard();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Gagal mengambil data siswa');
      }

      const data = res.data;

      container.querySelector('#stat-student-active-tasks').textContent = data.activeTasks;
      container.querySelector('#stat-student-completed').textContent = data.completedTasks;
      container.querySelector('#stat-student-overdue').textContent = data.overdueTasks;
      container.querySelector('#stat-student-followups').textContent = data.activeFollowupsCount;

      if (data.latestGrade) {
        container.querySelector('#stat-student-latest-grade').textContent = data.latestGrade.score;
        container.querySelector('#stat-student-latest-grade-badge').textContent = 'Nilai Terakhir';
      } else {
        container.querySelector('#stat-student-latest-grade').textContent = '—';
        container.querySelector('#stat-student-latest-grade-badge').textContent = 'Belum Dinilai';
      }

      // Render Follow-up banner
      const bannerContainer = container.querySelector('#student-followup-banner-container');
      if (data.followups && data.followups.length > 0) {
        const f = data.followups[0];
        bannerContainer.innerHTML = `
          <div class="followup-card">
            <div class="followup-header">
              <span class="followup-badge">Tindak Lanjut Aktif</span>
              <strong style="color: #86198f; font-size: 0.95rem;">${f.subject}: ${f.topic}</strong>
            </div>
            <p style="font-size: 0.85rem; color: #701a75; margin-bottom: 8px;">
              <strong>Fokus Penguatan:</strong> ${f.problem}
            </p>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${f.progress}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #a21caf; margin-bottom: 12px;">
              <span>Kemajuan: ${f.progress}%</span>
              <span>Target Selesai: 100%</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn-demo-pill btn-open-followup-material" style="background: #ffffff; border-color: #f0abfc; color: #a21caf; font-weight: 700;">
                <span>📖 Buka Materi Penguatan</span>
              </button>
              <button class="btn-demo-pill btn-open-followup-quiz" style="background: #ffffff; border-color: #f0abfc; color: #a21caf; font-weight: 700;">
                <span>✏️ Kerjakan Latihan</span>
              </button>
              <button class="btn-demo-pill btn-open-followup-reflection" style="background: #ffffff; border-color: #f0abfc; color: #a21caf; font-weight: 700;">
                <span>💭 Refleksi Mandiri</span>
              </button>
            </div>
          </div>
        `;

        bannerContainer.querySelectorAll('.btn-open-followup-material, .btn-open-followup-quiz, .btn-open-followup-reflection').forEach(btn => {
          btn.addEventListener('click', () => {
            showToast('Modul Penguatan Pembelajaran akan aktif pada Phase 9', 'info');
          });
        });
      } else {
        bannerContainer.innerHTML = '';
      }

      // Render Assignments
      const assignmentsContainer = container.querySelector('#student-assignments-container');
      if (data.assignments && data.assignments.length > 0) {
        assignmentsContainer.innerHTML = data.assignments.map(a => {
          let statusBadge = '<span class="badge-tag warning">Belum Dikerjakan</span>';
          let actionBtn = `<button class="btn-demo-pill btn-start-task" data-id="${a.id}" style="background: var(--primary); color: #fff; border: none; padding: 6px 14px;">Kerjakan</button>`;

          if (a.submissionStatus === 'submitted') {
            statusBadge = '<span class="badge-tag info">Sudah Dikumpulkan</span>';
            actionBtn = `<span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">⏳ Menunggu Nilai</span>`;
          } else if (a.submissionStatus === 'graded') {
            statusBadge = `<span class="badge-tag success">Nilai: ${a.score}</span>`;
            actionBtn = `<button class="btn-demo-pill btn-view-feedback" data-id="${a.id}" style="padding: 6px 12px;">Lihat Ulasan</button>`;
          }

          return `
            <div class="task-item-card">
              <div class="task-meta">
                <span class="task-title">${a.title}</span>
                <span class="task-subtitle">
                  <span>📅 Batas: ${new Date(a.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>•</span>
                  <span>${a.subject} (Kelas ${a.class_name})</span>
                </span>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
                  ${a.instructions}
                </p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                ${statusBadge}
                ${actionBtn}
              </div>
            </div>
          `;
        }).join('');

        // Task button events
        assignmentsContainer.querySelectorAll('.btn-start-task').forEach(btn => {
          btn.addEventListener('click', () => {
            showToast('Antarmuka pengerjaan LKPD Siswa 6-tahap akan aktif pada Phase 5', 'info');
          });
        });

        assignmentsContainer.querySelectorAll('.btn-view-feedback').forEach(btn => {
          btn.addEventListener('click', () => {
            showToast('Ulasan dan rubrik penilaian dapat dilihat pada modul Hasil Belajar (Phase 6)', 'info');
          });
        });
      } else {
        assignmentsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Tidak ada tugas yang ditugaskan saat ini.</p>`;
      }

      // Feedback panel
      const feedbackContent = container.querySelector('#latest-feedback-content');
      if (data.latestGrade && data.latestGrade.feedback) {
        feedbackContent.innerHTML = `
          <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); border-left: 4px solid var(--success);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="font-size: 0.88rem; color: var(--text-main);">Nilai Terakhir: ${data.latestGrade.score}/100</strong>
              <span style="font-size: 0.72rem; color: var(--text-light);">${new Date(data.latestGrade.gradedAt).toLocaleDateString('id-ID')}</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; font-style: italic;">
              "${data.latestGrade.feedback}"
            </p>
          </div>
        `;
      } else {
        feedbackContent.innerHTML = `
          <p style="font-size: 0.82rem; color: var(--text-muted);">
            Tugas yang Anda kumpulkan sedang dalam antrian pemeriksaan oleh Guru.
          </p>
        `;
      }

      loadingEl.style.display = 'none';
      bodyEl.style.display = 'block';
    } catch (err) {
      loadingEl.innerHTML = `
        <div class="alert-box alert-error">
          <span>⚠️ Gagal memuat data siswa: ${err.message}</span>
        </div>
      `;
    }
  }

  container.querySelector('#btn-refresh-student-stats').addEventListener('click', () => {
    loadStudentStats();
    showToast('Data siswa diperbarui', 'info');
  });

  loadStudentStats();
}
