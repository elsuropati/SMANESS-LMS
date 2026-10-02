import { api } from '../api.js';

export async function renderLkpdBuilderView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>LKPD Builder & Generator</h1>
          <p>Rancang Lembar Kerja Peserta Didik terstruktur dengan AI dan tugaskan langsung ke kelas pilihan Anda.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-demo-pill" id="btn-trigger-ai-lkpd" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border: none; padding: 10px 18px; font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
            <span>✦ BANTUAN AI</span>
          </button>
          <button class="btn-primary" id="btn-create-empty-lkpd" style="width: auto; padding: 10px 18px;">
            <span>➕ Buat Manual</span>
          </button>
        </div>
      </div>

      <!-- LKPD Collection List -->
      <div class="content-panel" style="margin-bottom: 24px;">
        <div class="panel-header">
          <h3 class="panel-title">
            <span>📚</span> Koleksi Dokumen LKPD
          </h3>
          <span class="badge-tag info" id="lkpd-list-badge">0 Dokumen</span>
        </div>
        <div id="lkpd-collection-container">
          <p style="color: var(--text-muted); padding: 16px;">Memuat koleksi LKPD...</p>
        </div>
      </div>

      <!-- Active LKPD Editor Workspace -->
      <div id="lkpd-editor-workspace" class="content-panel" style="display: none; border-top: 4px solid var(--primary);">
        <div class="panel-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h3 class="panel-title">
              <span>✏️</span> Editor Lembar Kerja Peserta Didik
            </h3>
            <span class="badge-tag warning" id="editor-status-badge">Draft</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn-demo-pill" id="btn-assign-from-editor-header" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none; font-weight: 700;">
              <span>🚀 Tugaskan ke Kelas</span>
            </button>
            <button type="button" class="btn-demo-pill" id="btn-duplicate-editor-lkpd">📋 Duplikasi</button>
            <button type="submit" form="form-lkpd-editor" class="btn-primary" id="btn-save-editor-lkpd" style="width: auto; padding: 8px 16px;">
              💾 Simpan Draft
            </button>
          </div>
        </div>

        <form id="form-lkpd-editor">
          <input type="hidden" id="editor-lkpd-id" />

          <!-- Bagian 1: Identitas -->
          <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 12px; color: var(--primary);">
              01 • Identitas & Konsep LKPD
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
              <div>
                <label class="form-label">Judul LKPD *</label>
                <input type="text" id="editor-title" class="form-input" placeholder="Contoh: Prinsip Kimia Hijau" required />
              </div>
              <div>
                <label class="form-label">Mata Pelajaran</label>
                <input type="text" id="editor-subject" class="form-input" value="${user.subject || 'Kimia'}" required />
              </div>
              <div>
                <label class="form-label">Fase / Kelas</label>
                <input type="text" id="editor-grade" class="form-input" value="X (Sepuluh)" required />
              </div>
            </div>
          </div>

          <!-- Bagian 2: Tujuan Pembelajaran -->
          <div class="form-group">
            <label class="form-label">Tujuan Pembelajaran (Satu tujuan per baris)</label>
            <textarea id="editor-objectives" class="form-input" rows="3" placeholder="- Mengidentifikasi 12 prinsip kimia hijau&#10;- Menganalisis reaksi ramah lingkungan"></textarea>
          </div>

          <!-- Bagian 3: Pertanyaan Pemantik & Petunjuk -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div>
              <label class="form-label">Pertanyaan Pemantik</label>
              <textarea id="editor-trigger" class="form-input" rows="3" placeholder="Mengapa industri beralih ke pelarut air?"></textarea>
            </div>
            <div>
              <label class="form-label">Petunjuk Kerja Peserta Didik</label>
              <textarea id="editor-instructions" class="form-input" rows="3" placeholder="Kerjakan berkelompok atau mandiri secara bertahap."></textarea>
            </div>
          </div>

          <!-- Bagian 4: Ringkasan Materi & Link Materi -->
          <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 12px; color: var(--primary);">
              02 • Materi & Tautan Sumber Belajar (Buka Materi)
            </h4>
            <div class="form-group">
              <label class="form-label">Ringkasan Konsep Materi</label>
              <textarea id="editor-material-text" class="form-input" rows="3" placeholder="Uraian singkat materi yang relevan dengan aktivitas."></textarea>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
              <div>
                <label class="form-label">Judul Link Referensi (PDF / Simulasi / Video)</label>
                <input type="text" id="editor-link-title" class="form-input" value="Modul Kimia Hijau Kemendikbud & Lab Maya PhET" />
              </div>
              <div>
                <label class="form-label">URL / Tautan Materi</label>
                <input type="url" id="editor-link-url" class="form-input" value="https://repositori.kemdikbud.go.id" />
              </div>
            </div>
          </div>

          <!-- Bagian 5: Aktivitas & Pertanyaan -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div>
              <label class="form-label">Aktivitas Siswa (Eksplorasi / Simulasi)</label>
              <textarea id="editor-activities" class="form-input" rows="4" placeholder="Aktivitas 1: Analisis pelarut air vs pelarut benzena"></textarea>
            </div>
            <div>
              <label class="form-label">Pertanyaan Evaluasi & Essay</label>
              <textarea id="editor-questions" class="form-input" rows="4" placeholder="Jelaskan 3 alasan mengapa pelarut air lebih aman dibanding pelarut benzena!"></textarea>
            </div>
          </div>

          <!-- Bagian 6: Refleksi -->
          <div class="form-group">
            <label class="form-label">Pertanyaan Refleksi Siswa</label>
            <textarea id="editor-reflection" class="form-input" rows="2" placeholder="Apa wawasan baru paling berharga yang Anda peroleh hari ini?"></textarea>
          </div>

          <!-- Action Buttons Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 1px solid var(--border-light); padding-top: 18px;">
            <button type="button" class="btn-demo-pill" id="btn-close-editor">Tutup Editor</button>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn-demo-pill" id="btn-save-and-assign" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none; font-weight: 700; padding: 10px 18px;">
                🚀 [ SIMPAN & TUGASKAN KE KELAS ]
              </button>
              <button type="submit" class="btn-primary" style="width: auto;">💾 Simpan Pembaruan LKPD</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="lkpd-modal-slot"></div>
  `;

  let lkpdList = [];
  let assignmentsList = [];
  let currentEditingLkpd = null;

  async function loadLkpdList() {
    const containerEl = container.querySelector('#lkpd-collection-container');
    const badgeEl = container.querySelector('#lkpd-list-badge');

    try {
      const [resLkpd, resAssign] = await Promise.all([
        api.getLkpdList(),
        api.getAssignments()
      ]);

      lkpdList = resLkpd.data || [];
      assignmentsList = resAssign.data || [];
      badgeEl.textContent = `${lkpdList.length} Dokumen`;

      if (lkpdList.length === 0) {
        containerEl.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--text-muted);">
            <p>Belum ada LKPD yang dibuat. Gunakan tombol <strong>✦ BANTUAN AI</strong> untuk membuat LKPD cerdas otomatis atau buat secara manual.</p>
          </div>
        `;
        return;
      }

      containerEl.innerHTML = lkpdList.map(item => {
        // Check which classes this LKPD has been assigned to
        const assignedClasses = assignmentsList
          .filter(a => a.lkpd_id === item.id)
          .map(a => a.class_name);

        let assignedBadge = '<span class="badge-tag warning">Belum Ditugaskan</span>';
        if (assignedClasses.length > 0) {
          assignedBadge = `<span class="badge-tag success">🚀 Ditugaskan ke Kelas: ${assignedClasses.join(', ')}</span>`;
        }

        return `
          <div class="task-item-card">
            <div class="task-meta" style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="task-title">${item.title}</span>
                <span class="badge-tag ${item.status === 'published' ? 'success' : 'warning'}">${item.status === 'published' ? 'Diterbitkan' : 'Draft'}</span>
                ${assignedBadge}
              </div>
              <div class="task-subtitle" style="margin-top: 4px;">
                <span>Mata Pelajaran: <strong>${item.subject}</strong></span>
                <span>•</span>
                <span>Fase/Kelas: <strong>${item.grade}</strong></span>
                <span>•</span>
                <span>Dibuat: ${new Date(item.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-demo-pill btn-assign-direct" data-id="${item.id}" style="background: #eef2ff; border-color: #c7d2fe; color: var(--primary); font-weight: 700;">
                🚀 Tugaskan ke Kelas
              </button>
              <button class="btn-demo-pill btn-edit-lkpd" data-id="${item.id}">✏️ Edit</button>
              <button class="btn-demo-pill btn-dup-lkpd" data-id="${item.id}">📋 Duplikasi</button>
              <button class="btn-demo-pill btn-del-lkpd" data-id="${item.id}" data-title="${item.title}" style="border-color: var(--danger); color: var(--danger);">🗑️ Hapus</button>
            </div>
          </div>
        `;
      }).join('');

      // Assign direct click
      containerEl.querySelectorAll('.btn-assign-direct').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const lkpd = lkpdList.find(l => l.id === id);
          if (lkpd) openAssignModal(lkpd);
        });
      });

      // Edit click
      containerEl.querySelectorAll('.btn-edit-lkpd').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          openEditor(id);
        });
      });

      // Duplicate click
      containerEl.querySelectorAll('.btn-dup-lkpd').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            await api.duplicateLkpd(id);
            showToast('LKPD berhasil diduplikasi.', 'success');
            loadLkpdList();
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });

      // Delete click
      containerEl.querySelectorAll('.btn-del-lkpd').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const title = btn.getAttribute('data-title');
          if (confirm(`⚠️ Hapus permanen LKPD "${title}"?\n\nAksi ini tidak dapat dibatalkan.`)) {
            try {
              btn.disabled = true;
              btn.textContent = 'Menghapus...';
              await api.deleteLkpd(id);
              showToast(`LKPD "${title}" berhasil dihapus.`, 'success');

              // Tutup editor jika LKPD yang dihapus sedang dibuka di form editor
              const editorIdInput = container.querySelector('#editor-lkpd-id');
              if (editorIdInput && editorIdInput.value === id) {
                container.querySelector('#lkpd-editor-workspace').style.display = 'none';
                container.querySelector('#form-lkpd-editor')?.reset();
                editorIdInput.value = '';
                currentEditingLkpd = null;
              }

              // Hapus kartu langsung dari DOM
              const card = btn.closest('.task-item-card');
              if (card) card.remove();

              // Muat ulang daftar dari server
              await loadLkpdList();
            } catch (e) {
              btn.disabled = false;
              btn.textContent = '🗑️ Hapus';
              showToast(e.message, 'error');
            }
          }
        });
      });



    } catch (err) {
      containerEl.innerHTML = `<div class="alert-box alert-error">⚠️ Gagal memuat LKPD: ${err.message}</div>`;
    }
  }

  function openEditor(id) {
    const lkpd = lkpdList.find(l => l.id === id);
    if (!lkpd) return;

    currentEditingLkpd = lkpd;
    const editor = container.querySelector('#lkpd-editor-workspace');
    editor.style.display = 'block';
    editor.scrollIntoView({ behavior: 'smooth' });

    container.querySelector('#editor-lkpd-id').value = lkpd.id;
    container.querySelector('#editor-title').value = lkpd.title || '';
    container.querySelector('#editor-subject').value = lkpd.subject || '';
    container.querySelector('#editor-grade').value = lkpd.grade || '';
    container.querySelector('#editor-status-badge').textContent = lkpd.status === 'published' ? 'Diterbitkan' : 'Draft';

    container.querySelector('#editor-objectives').value = Array.isArray(lkpd.objectives) ? lkpd.objectives.join('\n') : (lkpd.objectives || '');
    container.querySelector('#editor-trigger').value = lkpd.trigger_questions || '';
    container.querySelector('#editor-instructions').value = lkpd.instructions || '';
    container.querySelector('#editor-material-text').value = lkpd.material_text || '';

    const firstLink = lkpd.material_links?.[0] || {};
    container.querySelector('#editor-link-title').value = firstLink.title || '';
    container.querySelector('#editor-link-url').value = firstLink.url || '';

    container.querySelector('#editor-activities').value = Array.isArray(lkpd.activities)
      ? lkpd.activities.map(a => `${a.title || ''}: ${a.instructions || a.description || ''}`).join('\n')
      : (lkpd.activities || '');

    container.querySelector('#editor-questions').value = Array.isArray(lkpd.questions)
      ? lkpd.questions.map(q => q.prompt || q.text || '').join('\n')
      : (lkpd.questions || '');

    container.querySelector('#editor-reflection').value = Array.isArray(lkpd.reflection_prompts)
      ? lkpd.reflection_prompts.join('\n')
      : (lkpd.reflection_prompts || '');
  }

  // Save Editor form helper
  async function saveEditorForm() {
    const id = container.querySelector('#editor-lkpd-id').value;
    const payload = {
      title: container.querySelector('#editor-title').value.trim(),
      subject: container.querySelector('#editor-subject').value.trim(),
      grade: container.querySelector('#editor-grade').value.trim(),
      objectives: container.querySelector('#editor-objectives').value.split('\n').filter(Boolean),
      trigger_questions: container.querySelector('#editor-trigger').value.trim(),
      instructions: container.querySelector('#editor-instructions').value.trim(),
      material_text: container.querySelector('#editor-material-text').value.trim(),
      material_links: [{
        title: container.querySelector('#editor-link-title').value.trim(),
        url: container.querySelector('#editor-link-url').value.trim(),
        type: 'Web / Modul'
      }],
      activities: [{
        id: 'act-1',
        title: 'Aktivitas Utama',
        instructions: container.querySelector('#editor-activities').value.trim()
      }],
      questions: [{
        id: 'q-1',
        type: 'essay',
        prompt: container.querySelector('#editor-questions').value.trim()
      }],
      reflection_prompts: container.querySelector('#editor-reflection').value.split('\n').filter(Boolean)
    };

    if (id) {
      const res = await api.updateLkpd(id, payload);
      return res.data;
    } else {
      const res = await api.createLkpd(payload);
      container.querySelector('#editor-lkpd-id').value = res.data.id;
      return res.data;
    }
  }

  container.querySelector('#form-lkpd-editor').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await saveEditorForm();
      showToast('Perubahan LKPD berhasil disimpan!', 'success');
      loadLkpdList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Save and Assign from editor
  container.querySelector('#btn-save-and-assign').addEventListener('click', async () => {
    try {
      const saved = await saveEditorForm();
      showToast('Draft LKPD tersimpan. Membuka formulir penugasan ke kelas...', 'info');
      openAssignModal(saved);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelector('#btn-assign-from-editor-header').addEventListener('click', async () => {
    try {
      const saved = await saveEditorForm();
      openAssignModal(saved);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Close editor
  container.querySelector('#btn-close-editor').addEventListener('click', () => {
    container.querySelector('#lkpd-editor-workspace').style.display = 'none';
  });

  // Manual Create Button
  container.querySelector('#btn-create-empty-lkpd').addEventListener('click', () => {
    container.querySelector('#form-lkpd-editor').reset();
    container.querySelector('#editor-lkpd-id').value = '';
    container.querySelector('#editor-status-badge').textContent = 'Baru (Draft)';
    const editor = container.querySelector('#lkpd-editor-workspace');
    editor.style.display = 'block';
    editor.scrollIntoView({ behavior: 'smooth' });
  });

  // ======================================================
  // MODAL PENUGASAN LANGSUNG KE KELAS (Target Kelas Selection)
  // ======================================================
  async function openAssignModal(lkpd) {
    const slot = container.querySelector('#lkpd-modal-slot');
    let classes = [];

    try {
      const res = await api.getClasses();
      classes = res.data || [];
    } catch (e) {
      showToast('Gagal memuat kelas binaan.', 'error');
      return;
    }

    if (classes.length === 0) {
      showToast('Belum ada kelas binaan. Silakan tambahkan kelas di menu "Kelas & Siswa".', 'warning');
      return;
    }

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>🚀</span> Tugaskan LKPD ke Kelas Pilihan
            </h3>
            <button class="modal-close-btn" id="btn-close-quick-assign">✕</button>
          </div>
          <form id="form-quick-assign-class">
            <div class="modal-body">
              <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Dokumen LKPD yang Ditugaskan:</span>
                <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">${lkpd.title}</h4>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${lkpd.subject} • Kelas ${lkpd.grade}</span>
              </div>

              <!-- PILIH KELAS TARGET -->
              <div class="form-group">
                <label class="form-label" for="select-target-class">Tugaskan ke Kelas Mana? *</label>
                <select id="select-target-class" class="form-input" style="font-weight: 700;" required>
                  ${classes.map(c => `<option value="${c.id}">Kelas ${c.name} — ${c.subject} (${c.student_count || 0} Siswa)</option>`).join('')}
                </select>
                <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: block;">
                  Pilih kelas binaan Anda yang akan menerima tugas LKPD ini.
                </span>
              </div>

              <div class="form-group">
                <label class="form-label" for="quick-assign-title">Judul Penugasan</label>
                <input type="text" id="quick-assign-title" class="form-input" value="Tugas: ${lkpd.title}" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="quick-assign-due">Batas Waktu Pengumpulan (Deadline) *</label>
                <input type="datetime-local" id="quick-assign-due" class="form-input" value="2026-10-12T23:59" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="quick-assign-instructions">Instruksi Pengerjaan untuk Siswa</label>
                <textarea id="quick-assign-instructions" class="form-input" rows="3" placeholder="Kerjakan seluruh tahapan LKPD dari 01 hingga 06 sebelum tenggat waktu."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-demo-pill" id="btn-cancel-quick-assign">Batal</button>
              <button type="submit" class="btn-primary" style="width: auto; background: linear-gradient(135deg, #4f46e5, #6366f1);">
                <span>🚀 [ TERBITKAN KE KELAS ]</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-quick-assign').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-quick-assign').addEventListener('click', closeModal);

    slot.querySelector('#form-quick-assign-class').addEventListener('submit', async (e) => {
      e.preventDefault();
      const classId = slot.querySelector('#select-target-class').value;
      const selectedClass = classes.find(c => c.id === classId);
      const title = slot.querySelector('#quick-assign-title').value.trim();
      const dueDate = slot.querySelector('#quick-assign-due').value;
      const instructions = slot.querySelector('#quick-assign-instructions').value.trim();

      try {
        await api.createAssignment({
          lkpd_id: lkpd.id,
          class_id: classId,
          title,
          due_date: dueDate,
          instructions
        });

        // Update LKPD status to published
        await api.updateLkpd(lkpd.id, { status: 'published' });

        showToast(`LKPD "${lkpd.title}" berhasil ditugaskan ke Kelas ${selectedClass?.name || 'terpilih'}!`, 'success');
        closeModal();
        loadLkpdList();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Modal: AI LKPD Generator (✦ BANTUAN AI)
  container.querySelector('#btn-trigger-ai-lkpd').addEventListener('click', () => {
    const slot = container.querySelector('#lkpd-modal-slot');
    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-dialog lg">
          <div class="modal-header">
            <h3 class="modal-title">
              <span>✦</span> AI LKPD Generator Cerdas
            </h3>
            <button class="modal-close-btn" id="btn-close-ai-modal">✕</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
              Kecerdasan Buatan (AI) akan menyusun struktur LKPD terstruktur JSON internal lengkap dengan tujuan, aktivitas, pertanyaan HOTS, dan refleksi. Guru tetap memegang kendali penuh untuk menyetujui atau mengedit hasil AI.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label class="form-label">Mata Pelajaran</label>
                <input type="text" id="ai-subject" class="form-input" value="${user.subject || 'Kimia'}" />
              </div>
              <div>
                <label class="form-label">Kelas / Fase</label>
                <input type="text" id="ai-grade" class="form-input" value="X (Fase E)" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Topik Materi Pembelajaran *</label>
              <input type="text" id="ai-topic" class="form-input" value="12 Prinsip Kimia Hijau dalam Kehidupan Sehari-hari" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div>
                <label class="form-label">Jumlah Aktivitas</label>
                <select id="ai-act-count" class="form-input">
                  <option value="2">2 Aktivitas</option>
                  <option value="3" selected>3 Aktivitas</option>
                  <option value="4">4 Aktivitas</option>
                </select>
              </div>
              <div>
                <label class="form-label">Tingkat Kesulitan</label>
                <select id="ai-difficulty" class="form-input">
                  <option value="mudah">Dasar / Mudah</option>
                  <option value="sedang" selected>Sedang / Menengah</option>
                  <option value="tinggi">HOTS / Analisis Tinggi</option>
                </select>
              </div>
              <div>
                <label class="form-label">Model Pembelajaran</label>
                <select id="ai-model-learn" class="form-input">
                  <option value="PBL" selected>Problem Based Learning (PBL)</option>
                  <option value="PjBL">Project Based Learning (PjBL)</option>
                  <option value="Inquiry">Inquiry Terbimbing</option>
                  <option value="Discovery">Discovery Learning</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 16px;">
              <button type="button" class="btn-primary" id="btn-run-ai-generate" style="width: auto;">
                <span>✦</span> [ GENERATE ]
              </button>
              <button type="button" class="btn-demo-pill" id="btn-run-ai-regenerate" style="display: none;">
                <span>🔄</span> [ REGENERATE ]
              </button>
            </div>

            <!-- Preview Structured JSON Result -->
            <div id="ai-result-preview-box" style="display: none; background: #0f172a; color: #e2e8f0; border-radius: var(--radius-md); padding: 16px; max-height: 280px; overflow-y: auto; font-family: monospace; font-size: 0.8rem;">
              <!-- JSON rendered here -->
            </div>
          </div>
          <div class="modal-footer" id="ai-modal-footer">
            <button type="button" class="btn-demo-pill" id="btn-cancel-ai-modal">Batal</button>
            <button type="button" class="btn-primary" id="btn-use-ai-lkpd" style="display: none; width: auto; background: var(--success);">
              ✅ [ GUNAKAN LKPD INI ]
            </button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => slot.innerHTML = '';
    slot.querySelector('#btn-close-ai-modal').addEventListener('click', closeModal);
    slot.querySelector('#btn-cancel-ai-modal').addEventListener('click', closeModal);

    let generatedLkpdData = null;

    async function executeAiGeneration() {
      const btn = slot.querySelector('#btn-run-ai-generate');
      const regenBtn = slot.querySelector('#btn-run-ai-regenerate');
      const useBtn = slot.querySelector('#btn-use-ai-lkpd');
      const previewBox = slot.querySelector('#ai-result-preview-box');

      btn.disabled = true;
      btn.textContent = 'Menyusun Struktur LKPD...';

      try {
        const payload = {
          subject: slot.querySelector('#ai-subject').value.trim(),
          grade: slot.querySelector('#ai-grade').value.trim(),
          topic: slot.querySelector('#ai-topic').value.trim(),
          activities_count: slot.querySelector('#ai-act-count').value,
          difficulty: slot.querySelector('#ai-difficulty').value,
          learning_model: slot.querySelector('#ai-model-learn').value
        };

        const res = await api.generateLkpd(payload);
        generatedLkpdData = res.data;

        previewBox.style.display = 'block';
        previewBox.innerHTML = `<pre>${JSON.stringify(generatedLkpdData, null, 2)}</pre>`;

        regenBtn.style.display = 'inline-flex';
        useBtn.style.display = 'inline-flex';
        showToast('Struktur LKPD berhasil dibuat oleh AI. Silakan tinjau sebelum disetujui.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '✦ [ GENERATE ]';
      }
    }

    slot.querySelector('#btn-run-ai-generate').addEventListener('click', executeAiGeneration);
    slot.querySelector('#btn-run-ai-regenerate').addEventListener('click', executeAiGeneration);

    slot.querySelector('#btn-use-ai-lkpd').addEventListener('click', () => {
      if (!generatedLkpdData) return;

      closeModal();

      container.querySelector('#form-lkpd-editor').reset();
      container.querySelector('#editor-lkpd-id').value = '';
      container.querySelector('#editor-title').value = generatedLkpdData.title || '';
      container.querySelector('#editor-subject').value = generatedLkpdData.subject || '';
      container.querySelector('#editor-grade').value = generatedLkpdData.grade || '';
      container.querySelector('#editor-status-badge').textContent = 'Hasil AI (Menunggu Simpan)';

      container.querySelector('#editor-objectives').value = Array.isArray(generatedLkpdData.learning_objectives)
        ? generatedLkpdData.learning_objectives.join('\n')
        : '';

      container.querySelector('#editor-activities').value = Array.isArray(generatedLkpdData.activities)
        ? generatedLkpdData.activities.map(a => `${a.title}: ${a.description}`).join('\n')
        : '';

      container.querySelector('#editor-questions').value = Array.isArray(generatedLkpdData.questions)
        ? generatedLkpdData.questions.map(q => q.text || q.prompt || '').join('\n')
        : '';

      container.querySelector('#editor-reflection').value = Array.isArray(generatedLkpdData.reflection)
        ? generatedLkpdData.reflection.join('\n')
        : '';

      const editor = container.querySelector('#lkpd-editor-workspace');
      editor.style.display = 'block';
      editor.scrollIntoView({ behavior: 'smooth' });

      showToast('Struktur AI dimuat ke Editor. Anda dapat melakukan penyesuaian lalu klik Simpan atau Tugaskan ke Kelas.', 'info');
    });
  });

  loadLkpdList();
}
