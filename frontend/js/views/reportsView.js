import { api } from '../api.js';

export async function renderReportsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Laporan & Analisis Hasil Pembelajaran</h1>
          <p>Pantau ketuntasan kurikulum, evaluasi distribusi nilai, dan identifikasi materi yang memerlukan remidiasi.</p>
        </div>
        <div>
          <button class="btn-demo-pill" id="btn-export-report" style="padding: 8px 16px;">
            <span>📥 Cetak / Unduh Laporan</span>
          </button>
        </div>
      </div>

      <div id="reports-loading" style="padding: 30px; text-align: center; color: var(--text-muted);">
        Mengalkulasi analisis kelas...
      </div>

      <div id="reports-body" style="display: none;">
        <!-- Analytics Metric Cards -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-card-header">
              <span class="stat-label">Rata-Rata Kelas</span>
              <div class="stat-icon-wrapper">📈</div>
            </div>
            <div class="stat-value" id="rep-avg-score">0</div>
            <span class="stat-badge">Skala 100</span>
          </div>

          <div class="stat-card success">
            <div class="stat-card-header">
              <span class="stat-label">Tingkat Ketuntasan</span>
              <div class="stat-icon-wrapper">🎯</div>
            </div>
            <div class="stat-value" id="rep-mastery-rate">0%</div>
            <span class="stat-badge">Kriteria Minimal 75</span>
          </div>

          <div class="stat-card warning">
            <div class="stat-card-header">
              <span class="stat-label">Perlu Remedial</span>
              <div class="stat-icon-wrapper">⚠️</div>
            </div>
            <div class="stat-value" id="rep-remedial-count">0</div>
            <span class="stat-badge">Siswa di Bawah KKM</span>
          </div>

          <div class="stat-card purple">
            <div class="stat-card-header">
              <span class="stat-label">Siswa Pengayaan</span>
              <div class="stat-icon-wrapper">🌟</div>
            </div>
            <div class="stat-value" id="rep-enrichment-count">0</div>
            <span class="stat-badge">Nilai ≥ 90</span>
          </div>
        </div>

        <!-- AI Pedagogical Summary Card -->
        <div class="content-panel" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #86efac; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #16a34a; color: #fff; padding: 2px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 800;">
              AI PEDAGOGICAL INSIGHT
            </span>
            <span style="font-size: 0.85rem; font-weight: 700; color: #166534;">Diagnosis Pembelajaran Cerdas</span>
          </div>
          <p id="rep-ai-summary" style="font-size: 0.9rem; color: #14532d; line-height: 1.6;">
            -
          </p>
        </div>

        <!-- 2 Column Layout: Difficult Topics & Distribution -->
        <div class="dashboard-grid-2col">
          <!-- Difficult Topics Table -->
          <div class="content-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <span>🔍</span> Analisis Topik Pembelajaran Paling Sulit
              </h3>
            </div>
            <div class="table-container">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Materi / Sub-Topik</th>
                    <th>Tingkat Kesulitan</th>
                    <th>Tingkat Kekeliruan</th>
                  </tr>
                </thead>
                <tbody id="rep-topics-tbody">
                  <!-- Populated dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Class Progress Card -->
          <div class="content-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <span>📊</span> Capaian Ketuntasan Kelas
              </h3>
            </div>
            <div style="padding: 10px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px;">
                <span>Progres Ketuntasan Pembelajaran</span>
                <strong id="rep-progress-percent">0%</strong>
              </div>
              <div class="progress-bar-container" style="height: 12px;">
                <div class="progress-bar-fill" id="rep-progress-fill" style="width: 0%;"></div>
              </div>

              <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Total Tugas Dikumpulkan:</span>
                  <strong id="rep-total-subs">0</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
                  <span style="color: var(--text-muted);">Tugas Selesai Dinilai:</span>
                  <strong id="rep-graded-subs">0</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span style="color: var(--text-muted);">Status Kurikulum:</span>
                  <span class="badge-tag success">Sesuai Target</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  async function loadAnalytics() {
    const loading = container.querySelector('#reports-loading');
    const body = container.querySelector('#reports-body');

    try {
      loading.style.display = 'block';
      body.style.display = 'none';

      const res = await api.getClassAnalytics();
      const data = res.data;

      container.querySelector('#rep-avg-score').textContent = data.averageScore;
      container.querySelector('#rep-mastery-rate').textContent = `${data.masteryRate}%`;
      container.querySelector('#rep-remedial-count').textContent = data.remedialCount;
      container.querySelector('#rep-enrichment-count').textContent = data.enrichmentCount;
      container.querySelector('#rep-ai-summary').textContent = data.aiSummary;

      container.querySelector('#rep-progress-percent').textContent = `${data.masteryRate}%`;
      container.querySelector('#rep-progress-fill').style.width = `${data.masteryRate}%`;
      container.querySelector('#rep-total-subs').textContent = data.totalSubmissions;
      container.querySelector('#rep-graded-subs').textContent = data.gradedCount;

      const topicsTbody = container.querySelector('#rep-topics-tbody');
      topicsTbody.innerHTML = (data.difficultTopics || []).map(t => `
        <tr>
          <td><strong>${t.topic}</strong></td>
          <td>
            <span class="badge-tag ${t.difficulty === 'Tinggi' ? 'danger' : 'warning'}">
              ${t.difficulty}
            </span>
          </td>
          <td><code style="color: #b91c1c;">${t.errorRate}</code></td>
        </tr>
      `).join('');

      loading.style.display = 'none';
      body.style.display = 'block';
    } catch (err) {
      loading.innerHTML = `<div class="alert-box alert-error">⚠️ Gagal memuat laporan: ${err.message}</div>`;
    }
  }

  container.querySelector('#btn-export-report').addEventListener('click', () => {
    window.print();
  });

  loadAnalytics();
}
