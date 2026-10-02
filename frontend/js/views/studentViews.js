import { api } from '../api.js';

// ======================================================
// 1. TUGAS SAYA VIEW (Student Tasks)
// ======================================================
export async function renderStudentTasksView(container, { user, showToast, onOpenLkpd }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Tugas LKPD Saya</h1>
          <p>Daftar Lembar Kerja Peserta Didik yang wajib Anda kerjakan dan kumpulkan tepat waktu.</p>
        </div>
      </div>

      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>📝</span> Tugas Kelas X-1
          </h3>
          <span class="badge-tag info" id="std-task-badge">Memuat...</span>
        </div>
        <div id="std-tasks-container">
          <p style="color: var(--text-muted); padding: 16px;">Memuat daftar tugas...</p>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await api.getAssignments();
    const tasks = res.data || [];
    container.querySelector('#std-task-badge').textContent = `${tasks.length} Tugas`;

    const list = container.querySelector('#std-tasks-container');
    if (tasks.length === 0) {
      list.innerHTML = `<p style="padding: 24px; color: var(--text-muted); text-align: center;">Tidak ada tugas aktif saat ini.</p>`;
      return;
    }

    list.innerHTML = tasks.map(t => {
      let badge = '<span class="badge-tag warning">Belum Dikerjakan</span>';
      let btnText = '🚀 Kerjakan LKPD';
      let isGraded = false;

      if (t.submissionStatus === 'submitted') {
        badge = '<span class="badge-tag info">Sudah Dikumpulkan</span>';
        btnText = '👁️ Lihat Jawaban';
      } else if (t.submissionStatus === 'graded') {
        badge = `<span class="badge-tag success">Dinilai: ${t.score}/100</span>`;
        btnText = '🏆 Lihat Hasil';
        isGraded = true;
      }

      return `
        <div class="task-item-card">
          <div class="task-meta">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="task-title">${t.title}</span>
              ${badge}
            </div>
            <div class="task-subtitle" style="margin-top: 4px;">
              <span>Mata Pelajaran: <strong>${t.subject}</strong></span>
              <span>•</span>
              <span>Tenggat Waktu: <strong>${new Date(t.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
              ${t.instructions}
            </p>
          </div>
          <div>
            <button class="btn-primary btn-open-lkpd-player" data-id="${t.id}" style="width: auto; padding: 8px 16px;">
              ${btnText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.btn-open-lkpd-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const assignId = btn.getAttribute('data-id');
        onOpenLkpd(assignId);
      });
    });
  } catch (err) {
    container.querySelector('#std-tasks-container').innerHTML = `<div class="alert-box alert-error">⚠️ ${err.message}</div>`;
  }
}

// ======================================================
// 2. LKPD PLAYER INTERAKTIF (6 TAHAPAN NAVIGASI + AUTO-SAVE)
// ======================================================
export async function renderLkpdPlayerView(container, { user, assignmentId, showToast, onBackToTasks }) {
  container.innerHTML = `
    <div class="view-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <button class="btn-demo-pill" id="btn-back-from-player" style="padding: 8px 14px;">
          <span>← Kembali ke Tugas Saya</span>
        </button>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span id="player-autosave-indicator" style="font-size: 0.78rem; color: var(--text-muted);">
            🟢 Tersimpan otomatis
          </span>
          <button class="btn-demo-pill" id="btn-player-manual-save">
            💾 [ SIMPAN ]
          </button>
        </div>
      </div>

      <!-- LKPD Header & Overall Progress -->
      <div class="content-panel" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <div>
            <h2 id="player-lkpd-title" style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">
              Memuat LKPD...
            </h2>
            <p id="player-lkpd-meta" style="font-size: 0.84rem; color: var(--text-muted);">
              Kimia • Kelas X-1
            </p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Kemajuan Pengisian:</span>
            <strong id="player-progress-label" style="font-size: 1.15rem; color: var(--primary); margin-left: 6px;">16%</strong>
          </div>
        </div>
        <div class="progress-bar-container" style="height: 10px; margin: 0;">
          <div class="progress-bar-fill" id="player-progress-bar" style="width: 16%;"></div>
        </div>
      </div>

      <!-- Step Wizard Bar 6 Tahap -->
      <div class="step-wizard-bar">
        <button class="step-wizard-item active" data-step="1">
          <span class="step-number">01</span>
          <span class="step-title">Identitas</span>
        </button>
        <button class="step-wizard-item" data-step="2">
          <span class="step-number">02</span>
          <span class="step-title">Materi</span>
        </button>
        <button class="step-wizard-item" data-step="3">
          <span class="step-number">03</span>
          <span class="step-title">Aktivitas</span>
        </button>
        <button class="step-wizard-item" data-step="4">
          <span class="step-number">04</span>
          <span class="step-title">Pertanyaan</span>
        </button>
        <button class="step-wizard-item" data-step="5">
          <span class="step-number">05</span>
          <span class="step-title">Refleksi</span>
        </button>
        <button class="step-wizard-item" data-step="6">
          <span class="step-number">06</span>
          <span class="step-title">Kumpulkan</span>
        </button>
      </div>

      <!-- Dynamic Step Content Form -->
      <form id="form-lkpd-player">
        <div class="content-panel" id="player-step-content-box" style="min-height: 380px;">
          <!-- Content injected here according to active step -->
        </div>

        <!-- Wizard Navigation Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
          <button type="button" class="btn-demo-pill" id="btn-wizard-prev" style="padding: 10px 20px; font-weight: 700; display: none;">
            ← Langkah Sebelumnya
          </button>
          <div style="margin-left: auto; display: flex; gap: 12px;">
            <button type="button" class="btn-primary" id="btn-wizard-next" style="width: auto; padding: 10px 24px;">
              [ LANJUTKAN ] →
            </button>
            <button type="submit" class="btn-primary" id="btn-wizard-submit" style="width: auto; padding: 10px 24px; background: var(--success); display: none;">
              ✅ [ KUMPULKAN LKPD ]
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Modal Materi External Viewer Slot -->
    <div id="materi-viewer-modal-slot"></div>
  `;

  let currentStep = 1;
  let assignmentData = null;
  let lkpdData = null;
  let submissionData = null;
  let isReadOnly = false;

  const answers = {
    identity: { nama: user.name, nis: user.nip_or_nis, kelas: 'X-1' },
    activity1: '',
    activity2: '',
    q1: 0,
    q2: '',
    reflection: ''
  };

  // Back button
  container.querySelector('#btn-back-from-player').addEventListener('click', onBackToTasks);

  // Load Assignment & LKPD
  try {
    const res = await api.getAssignmentDetails(assignmentId);
    assignmentData = res.data.assignment;
    lkpdData = res.data.lkpd;
    submissionData = res.data.submission;

    if (submissionData) {
      Object.assign(answers, submissionData.answers || {});
      if (submissionData.status === 'submitted' || submissionData.status === 'graded') {
        isReadOnly = true;
      }
    }

    container.querySelector('#player-lkpd-title').textContent = lkpdData.title || assignmentData.title;
    container.querySelector('#player-lkpd-meta').textContent = `${lkpdData.subject} • Target Kelas ${assignmentData.class_name}`;

    renderStep(1);
  } catch (err) {
    container.querySelector('#player-step-content-box').innerHTML = `<div class="alert-box alert-error">⚠️ ${err.message}</div>`;
  }

  function updateProgress() {
    const percent = Math.round((currentStep / 6) * 100);
    container.querySelector('#player-progress-label').textContent = `${percent}%`;
    container.querySelector('#player-progress-bar').style.width = `${percent}%`;
  }

  function renderStep(step) {
    currentStep = step;
    updateProgress();

    // Update wizard tabs
    container.querySelectorAll('.step-wizard-item').forEach(item => {
      const s = Number(item.getAttribute('data-step'));
      if (s === step) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
      if (s < step) {
        item.classList.add('completed');
      }
    });

    const prevBtn = container.querySelector('#btn-wizard-prev');
    const nextBtn = container.querySelector('#btn-wizard-next');
    const submitBtn = container.querySelector('#btn-wizard-submit');

    prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';
    nextBtn.style.display = step < 6 ? 'inline-flex' : 'none';
    submitBtn.style.display = step === 6 ? 'inline-flex' : 'none';

    const box = container.querySelector('#player-step-content-box');

    if (step === 1) {
      box.innerHTML = `
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; color: var(--primary);">
          01 • Lembar Identitas Peserta Didik
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
          Pastikan data identitas diri Anda terverifikasi dengan benar sebelum melanjutkan.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div class="form-group">
            <label class="form-label">Nama Lengkap</label>
            <input type="text" class="form-input" value="${answers.identity.nama}" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Induk Siswa (NIS)</label>
            <input type="text" class="form-input" value="${answers.identity.nis || '-'}" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">Kelas</label>
            <input type="text" class="form-input" value="${answers.identity.kelas}" disabled />
          </div>
        </div>

        <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md);">
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 8px;">Tujuan Pembelajaran:</h4>
          <ul style="padding-left: 20px; font-size: 0.85rem; color: var(--text-main); line-height: 1.6;">
            ${(lkpdData.objectives || ['Mengidentifikasi prinsip kimia hijau', 'Menganalisis dampak lingkungan']).map(o => `<li>${o}</li>`).join('')}
          </ul>
        </div>
      `;
    } else if (step === 2) {
      box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
              02 • Materi Pembelajaran & Referensi
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Pelajari konsep penting dan buka tautan materi tanpa kehilangan catatan Anda.
            </p>
          </div>
          <button type="button" class="btn-primary btn-open-material-popup" style="width: auto; background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 8px 16px;">
            <span>📖 [ BUKA MATERI ]</span>
          </button>
        </div>

        <div style="background: var(--bg-surface-subtle); padding: 20px; border-radius: var(--radius-md); margin-bottom: 20px; line-height: 1.7; font-size: 0.9rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">
            Ringkasan Konsep:
          </h4>
          <p>${lkpdData.material_text || 'Kimia Hijau (Green Chemistry) bertujuan merancang produk dan proses kimia yang mengurangi atau meniadakan penggunaan zat berbahaya.'}</p>
        </div>

        <div class="content-panel" style="border: 1.5px dashed var(--border-subtle);">
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 8px;">Tautan Sumber Belajar Resmi:</h4>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="javascript:void(0)" class="btn-demo-pill btn-open-material-popup" style="font-weight: 600;">
              📄 Modul Kimia Hijau (Kemendikbud PDF)
            </a>
            <a href="javascript:void(0)" class="btn-demo-pill btn-open-material-popup" style="font-weight: 600;">
              🔬 Simulasi Reaksi (Lab Maya PhET)
            </a>
          </div>
        </div>
      `;

      box.querySelectorAll('.btn-open-material-popup').forEach(btn => {
        btn.addEventListener('click', openMaterialModal);
      });
    } else if (step === 3) {
      box.innerHTML = `
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; color: var(--primary);">
          03 • Aktivitas Eksplorasi Peserta Didik
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
          Lakukan pengamatan dan tuangkan hasil analisis Anda pada kolom kerja di bawah ini.
        </p>

        <div class="form-group">
          <label class="form-label">Aktivitas 1: Analisis Pelarut Ramah Lingkungan *</label>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
            Bandingkan kelebihan dan dampak penggunaan pelarut air vs benzena dalam proses sintesis obat/plastik:
          </p>
          <textarea id="input-act-1" class="form-input" rows="4" placeholder="Tuliskan hasil analisis Anda..." ${isReadOnly ? 'disabled' : ''}>${answers.activity1 || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Aktivitas 2: Perhitungan Atom Economy *</label>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
            Jelaskan bagaimana konsep efisiensi atom dapat mengurangi limbah industri:
          </p>
          <textarea id="input-act-2" class="form-input" rows="3" placeholder="Tuliskan formula atau kesimpulan kalkulasi..." ${isReadOnly ? 'disabled' : ''}>${answers.activity2 || ''}</textarea>
        </div>
      `;

      if (!isReadOnly) {
        box.querySelector('#input-act-1').addEventListener('input', (e) => {
          answers.activity1 = e.target.value;
          triggerAutoSave();
        });
        box.querySelector('#input-act-2').addEventListener('input', (e) => {
          answers.activity2 = e.target.value;
          triggerAutoSave();
        });
      }
    } else if (step === 4) {
      box.innerHTML = `
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; color: var(--primary);">
          04 • Pertanyaan Evaluasi & Pemahaman
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
          Jawab pertanyaan evaluasi secara cermat.
        </p>

        <div class="content-panel" style="margin-bottom: 20px;">
          <label class="form-label">Soal 1 (Pilihan Ganda):</label>
          <p style="font-size: 0.88rem; margin-bottom: 12px; font-weight: 600;">
            Prinsip ke-5 kimia hijau menekankan pada penggunaan:
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
              <input type="radio" name="player-q1" value="0" ${answers.q1 === 0 ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} />
              <span>A. Pelarut dan kondisi reaksi yang lebih aman</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
              <input type="radio" name="player-q1" value="1" ${answers.q1 === 1 ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} />
              <span>B. Pestisida sintetis dosis tinggi</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
              <input type="radio" name="player-q1" value="2" ${answers.q1 === 2 ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} />
              <span>C. Suhu dan tekanan ekstrem</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Soal 2 (Uraian / Essay):</label>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
            Jelaskan mengapa pencegahan limbah jauh lebih utama dibanding penanganan limbah setelah terbentuk!
          </p>
          <textarea id="input-q2" class="form-input" rows="4" placeholder="Jelaskan penalaran Anda..." ${isReadOnly ? 'disabled' : ''}>${answers.q2 || ''}</textarea>
        </div>
      `;

      if (!isReadOnly) {
        box.querySelectorAll('input[name="player-q1"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            answers.q1 = Number(e.target.value);
            triggerAutoSave();
          });
        });
        box.querySelector('#input-q2').addEventListener('input', (e) => {
          answers.q2 = e.target.value;
          triggerAutoSave();
        });
      }
    } else if (step === 5) {
      box.innerHTML = `
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; color: var(--primary);">
          05 • Refleksi Diri Pembelajaran
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
          Tuliskan pemikiran reflektif Anda untuk membantu guru memahami bagian materi yang sudah Anda kuasai atau masih membingungkan.
        </p>

        <div class="form-group">
          <label class="form-label">Catatan Refleksi Mandiri *</label>
          <textarea id="input-reflection" class="form-input" rows="6" placeholder="Bagian materi mana yang paling Anda pahami? Apakah ada rumus yang masih sulit Anda hitung?" ${isReadOnly ? 'disabled' : ''}>${answers.reflection || ''}</textarea>
        </div>
      `;

      if (!isReadOnly) {
        box.querySelector('#input-reflection').addEventListener('input', (e) => {
          answers.reflection = e.target.value;
          triggerAutoSave();
        });
      }
    } else if (step === 6) {
      if (isReadOnly) {
        box.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <div style="font-size: 3rem; margin-bottom: 12px;">✅</div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--success); margin-bottom: 6px;">
              LKPD Telah Dikumpulkan!
            </h3>
            <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 20px auto;">
              Jawaban Anda telah tersimpan dan diterima oleh Guru. Setelah dikumpulkan, jawaban tidak dapat diubah kecuali guru meminta revisi.
            </p>
            ${submissionData?.score !== null ? `
              <div style="background: var(--bg-surface-subtle); display: inline-block; padding: 16px 32px; border-radius: var(--radius-lg); margin-top: 10px;">
                <div style="font-size: 0.85rem; color: var(--text-muted);">Nilai yang Diperoleh:</div>
                <div style="font-size: 2.2rem; font-weight: 800; color: var(--primary);">${submissionData.score} / 100</div>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        box.innerHTML = `
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; color: var(--primary);">
            06 • Konfirmasi & Pengumpulan Tugas
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
            Periksa ringkasan jawaban Anda sebelum mengumpulkan secara permanen ke guru.
          </p>

          <div style="background: var(--bg-surface-subtle); padding: 18px; border-radius: var(--radius-md); margin-bottom: 24px;">
            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.86rem;">
              <div>✔️ <strong>Identitas:</strong> ${answers.identity.nama} (NIS ${answers.identity.nis || '-'})</div>
              <div>✔️ <strong>Aktivitas Terisi:</strong> ${answers.activity1 ? 'Lengkap' : 'Belum lengkap'}</div>
              <div>✔️ <strong>Pertanyaan Evaluasi:</strong> ${answers.q2 ? 'Lengkap' : 'Belum lengkap'}</div>
              <div>✔️ <strong>Refleksi Mandiri:</strong> ${answers.reflection ? 'Lengkap' : 'Belum lengkap'}</div>
            </div>
          </div>

          <div class="alert-box" style="background: #fffbeb; border: 1px solid #fde68a; color: #92400e;">
            <span>⚠️ <em>Setelah tombol Kumpulkan ditekan, Anda tidak dapat mengubah jawaban kecuali guru mengizinkan revisi.</em></span>
          </div>
        `;
      }
    }
  }

  // Wizard navigation events
  container.querySelectorAll('.step-wizard-item').forEach(item => {
    item.addEventListener('click', () => {
      const s = Number(item.getAttribute('data-step'));
      renderStep(s);
    });
  });

  container.querySelector('#btn-wizard-next').addEventListener('click', () => {
    if (currentStep < 6) renderStep(currentStep + 1);
  });

  container.querySelector('#btn-wizard-prev').addEventListener('click', () => {
    if (currentStep > 1) renderStep(currentStep - 1);
  });

  // Auto-save debounce
  let saveTimeout = null;
  function triggerAutoSave() {
    const indicator = container.querySelector('#player-autosave-indicator');
    if (indicator) indicator.textContent = '⏳ Menyimpan...';

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await api.saveStudentDraft(assignmentId, answers);
        if (indicator) indicator.textContent = '🟢 Tersimpan otomatis';
      } catch (e) {
        if (indicator) indicator.textContent = '⚠️ Gagal auto-save';
      }
    }, 1200);
  }

  container.querySelector('#btn-player-manual-save').addEventListener('click', async () => {
    try {
      await api.saveStudentDraft(assignmentId, answers);
      showToast('Progres LKPD berhasil disimpan.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // Submit Final
  container.querySelector('#form-lkpd-player').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!answers.activity1 || !answers.q2 || !answers.reflection) {
      if (!confirm('Beberapa isian tampak masih kosong. Apakah Anda tetap yakin ingin mengumpulkan tugas ini?')) {
        return;
      }
    }

    try {
      await api.submitAssignment(assignmentId, answers);
      isReadOnly = true;
      showToast('Selamat! LKPD Anda berhasil dikumpulkan ke Guru.', 'success');
      renderStep(6);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Modal Buka Materi (tanpa kehilangan progres)
  function openMaterialModal() {
    const slot = container.querySelector('#materi-viewer-modal-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>📖</span> Materi Pembelajaran: Prinsip Kimia Hijau
            </h3>
            <button class="modal-close-btn" id="btn-close-mat-viewer">✕</button>
          </div>
          <div class="modal-body" style="line-height: 1.8; font-size: 0.9rem;">
            <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <h4 style="color: var(--primary); font-weight: 800; margin-bottom: 6px;">12 Prinsip Green Chemistry</h4>
              <p>1. Pencegahan limbah (Waste Prevention)</p>
              <p>2. Ekonomi Atom (Atom Economy) meminimalkan bahan sisa</p>
              <p>3. Sintesis kimia yang tidak berbahaya</p>
              <p>4. Merancang produk kimia yang lebih aman</p>
              <p>5. Penggunaan pelarut dan kondisi yang aman (utamakan air)</p>
              <p>6. Efisiensi energi (reaksi pada suhu dan tekanan ruang)</p>
              <p>7. Penggunaan bahan baku terbarukan (bioplastik, pati)</p>
            </div>
            <p>
              Anda dapat membaca materi ini secara santai tanpa khawatir progres pengerjaan LKPD Anda terhapus.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-primary" id="btn-close-mat-viewer-2" style="width: auto;">
              Kembali Mengerjakan LKPD
            </button>
          </div>
        </div>
      </div>
    `;

    const closeViewer = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-mat-viewer').addEventListener('click', closeViewer);
    slot.querySelector('#btn-close-mat-viewer-2').addEventListener('click', closeViewer);
  }
}

// ======================================================
// 3. MATERI SISWA VIEW (Materials)
// ======================================================
export function renderStudentMaterialsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Sumber Belajar & Modul</h1>
          <p>Kumpulan bahan ajar digital, video pembelajaran, dan laboratorium simulasi interaktif.</p>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div class="content-panel">
          <div style="font-size: 2rem; margin-bottom: 8px;">📄</div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">Modul 1: Prinsip Kimia Hijau</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 6px 0 16px 0;">
            Bahan bacaan konsep 12 prinsip Green Chemistry Kemendikbudristek.
          </p>
          <button class="btn-demo-pill btn-open-demo-mat" style="width: 100%; font-weight: 700;">
            📖 Buka Dokumen (PDF)
          </button>
        </div>

        <div class="content-panel">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔬</div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">Lab Maya: Simulasi Pelarut</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 6px 0 16px 0;">
            Simulasi interaktif HTML5 reaksi sintesis ramah lingkungan.
          </p>
          <button class="btn-demo-pill btn-open-demo-mat" style="width: 100%; font-weight: 700;">
            🧪 Buka Lab Maya
          </button>
        </div>

        <div class="content-panel">
          <div style="font-size: 2rem; margin-bottom: 8px;">📺</div>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">Video Edukasi: Stoikiometri Hijau</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 6px 0 16px 0;">
            Penjelasan visual perhitungan Atom Economy dalam industri kimia.
          </p>
          <button class="btn-demo-pill btn-open-demo-mat" style="width: 100%; font-weight: 700;">
            ▶️ Tonton Video
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-open-demo-mat').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Materi terbuka dalam viewer interaktif.', 'info');
    });
  });
}

// ======================================================
// 4. HASIL BELAJAR SISWA VIEW (Results & Grades)
// ======================================================
export async function renderStudentResultsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Hasil Belajar & Ulasan Guru</h1>
          <p>Rekapitulasi pencapaian nilai, catatan kelebihan, serta arahan evaluasi dari guru.</p>
        </div>
      </div>

      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>🏆</span> Nilai Tugas & LKPD yang Telah Dinilai
          </h3>
          <span class="badge-tag success" id="results-count-badge">Memuat...</span>
        </div>
        <div id="results-list-container">
          <p style="color: var(--text-muted); padding: 16px;">Memuat riwayat nilai...</p>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await api.getStudentResults();
    const results = res.data || [];
    container.querySelector('#results-count-badge').textContent = `${results.length} Nilai`;

    const list = container.querySelector('#results-list-container');
    if (results.length === 0) {
      list.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Tugas Anda sedang dalam proses pemeriksaan guru.</p>`;
      return;
    }

    list.innerHTML = results.map(r => `
      <div class="task-item-card" style="align-items: flex-start; margin-bottom: 16px;">
        <div class="task-meta" style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="task-title">${r.assignmentTitle}</span>
            <span class="badge-tag success">Dinilai</span>
          </div>
          <span class="task-subtitle" style="margin-top: 4px;">
            Mata Pelajaran: <strong>${r.subject}</strong> • Tanggal Penilaian: <strong>${new Date(r.graded_at).toLocaleDateString('id-ID')}</strong>
          </span>

          <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-md); margin-top: 12px; border-left: 4px solid var(--primary);">
            <strong style="font-size: 0.85rem; color: var(--text-main);">Umpan Balik Guru:</strong>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; line-height: 1.5; font-style: italic;">
              "${r.feedback || 'Analisis Anda sudah baik, tingkatkan ketelitian pada bagian kalkulasi.'}"
            </p>
          </div>
        </div>
        <div style="text-align: right; padding-left: 20px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Nilai Akhir</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: var(--primary);">${r.score}</div>
          <div style="font-size: 0.75rem; color: var(--success); font-weight: 700;">Tuntas KKM</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.querySelector('#results-list-container').innerHTML = `<div class="alert-box alert-error">⚠️ ${err.message}</div>`;
  }
}

// ======================================================
// 5. TINDAK LANJUT SISWA VIEW (Follow-up)
// ======================================================
export async function renderStudentFollowupView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Tindak Lanjut & Remedial Mandiri</h1>
          <p>Program penguatan konsep untuk mengatasi kesulitan belajar dan meningkatkan ketuntasan materi.</p>
        </div>
      </div>

      <div id="std-flw-container">
        <p style="color: var(--text-muted); padding: 20px;">Memuat program tindak lanjut...</p>
      </div>
    </div>
  `;

  try {
    const res = await api.getFollowups();
    const followups = res.data || [];
    const box = container.querySelector('#std-flw-container');

    if (followups.length === 0) {
      box.innerHTML = `
        <div class="content-panel" style="text-align: center; padding: 40px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🎉</div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">Tidak Ada Remedial Tertunda</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px;">
            Seluruh capaian belajar Anda telah memenuhi kriteria ketuntasan minimal. Pertahankan prestasi Anda!
          </p>
        </div>
      `;
      return;
    }

    box.innerHTML = followups.map(f => `
      <div class="followup-card" style="margin-bottom: 20px;">
        <div class="followup-header">
          <span class="followup-badge">Program Remedial</span>
          <strong style="color: #86198f; font-size: 1.05rem;">${f.subject}: ${f.topic}</strong>
        </div>
        <p style="font-size: 0.88rem; color: #701a75; margin-bottom: 10px;">
          <strong>Kendala Terdeteksi:</strong> ${f.problem}
        </p>

        <div class="progress-bar-container" style="height: 10px;">
          <div class="progress-bar-fill" id="flw-prog-fill-${f.id}" style="width: ${f.progress}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #a21caf; margin-bottom: 16px;">
          <span>Progress Anda: <strong id="flw-prog-text-${f.id}">${f.progress}%</strong></span>
          <span>Target Selesai: 100%</span>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-demo-pill btn-step-flw" data-id="${f.id}" data-prog="35" style="background: #ffffff; color: #a21caf; font-weight: 700; border-color: #f0abfc;">
            📖 [ BUKA MATERI ]
          </button>
          <button class="btn-demo-pill btn-step-flw" data-id="${f.id}" data-prog="70" style="background: #ffffff; color: #a21caf; font-weight: 700; border-color: #f0abfc;">
            ✏️ [ KERJAKAN LATIHAN ]
          </button>
          <button class="btn-demo-pill btn-step-flw" data-id="${f.id}" data-prog="100" style="background: #a21caf; color: #ffffff; font-weight: 700; border: none;">
            💭 [ REFLEKSI ] (Selesaikan 100%)
          </button>
        </div>
      </div>
    `).join('');

    box.querySelectorAll('.btn-step-flw').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const prog = Number(btn.getAttribute('data-prog'));

        try {
          const res = await api.updateFollowupProgress(id, prog);
          container.querySelector(`#flw-prog-fill-${id}`).style.width = `${prog}%`;
          container.querySelector(`#flw-prog-text-${id}`).textContent = `${prog}%`;
          showToast(`Progress tindak lanjut diperbarui: ${prog}%`, 'success');
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });

  } catch (err) {
    container.querySelector('#std-flw-container').innerHTML = `<div class="alert-box alert-error">⚠️ ${err.message}</div>`;
  }
}

// ======================================================
// 6. PROFIL SISWA VIEW (Profile)
// ======================================================
export function renderStudentProfileView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Profil Peserta Didik</h1>
          <p>Informasi akun akademik dan identitas kesiswaan.</p>
        </div>
      </div>

      <div class="content-panel" style="max-width: 600px;">
        <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light);">
          <div class="user-avatar-circle student" style="width: 64px; height: 64px; font-size: 1.5rem;">
            ${user.avatar || 'AF'}
          </div>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${user.name}</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Peserta Didik Aktif • Kelas X-1</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
            <span style="color: var(--text-muted);">Nomor Induk Siswa (NIS):</span>
            <strong>${user.nip_or_nis || '-'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
            <span style="color: var(--text-muted);">Email Akun:</span>
            <strong>${user.email}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
            <span style="color: var(--text-muted);">Tahun Pelajaran:</span>
            <strong>2026/2027</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 8px;">
            <span style="color: var(--text-muted);">Status Keaktifan:</span>
            <span class="badge-tag success">Aktif Terdaftar</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
