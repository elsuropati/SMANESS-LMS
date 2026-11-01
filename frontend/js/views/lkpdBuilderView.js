import { api } from '../api.js';
import { esc, fmtDate, localInputToIso, defaultDeadlineLocal } from '../utils.js';

const LINK_TYPE_LABEL = { materi: '📄 Materi / PDF / Web', video: '📺 Video', lab: '🔬 Lab Maya / Simulasi' };

export async function renderLkpdBuilderView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>LKPD Builder & Generator</h1>
          <p>Rancang Lembar Kerja Peserta Didik terstruktur (aktivitas, soal pilihan ganda/uraian, refleksi, dan tautan materi/video/lab) lalu tugaskan ke kelas.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-demo-pill" id="btn-trigger-ai-lkpd" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border: none; padding: 10px 18px; font-weight: 700;">
            <span>✦ BANTUAN AI</span>
          </button>
          <button class="btn-primary" id="btn-create-empty-lkpd" style="width: auto; padding: 10px 18px;">
            <span>➕ Buat Manual</span>
          </button>
        </div>
      </div>

      <div class="content-panel" style="margin-bottom: 24px;">
        <div class="panel-header">
          <h3 class="panel-title"><span>📚</span> Koleksi Dokumen LKPD</h3>
          <span class="badge-tag info" id="lkpd-list-badge">0 Dokumen</span>
        </div>
        <div id="lkpd-collection-container">
          <p style="color: var(--text-muted); padding: 16px;">Memuat koleksi LKPD...</p>
        </div>
      </div>

      <div id="lkpd-editor-workspace" class="content-panel" style="display: none; border-top: 4px solid var(--primary);">
        <div class="panel-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h3 class="panel-title"><span>✏️</span> Editor Lembar Kerja Peserta Didik</h3>
            <span class="badge-tag warning" id="editor-status-badge">Draft</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn-demo-pill" id="btn-assign-from-editor-header" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none; font-weight: 700;">🚀 Tugaskan ke Kelas</button>
            <button type="submit" form="form-lkpd-editor" class="btn-primary" style="width: auto; padding: 8px 16px;">💾 Simpan</button>
          </div>
        </div>

        <div id="editor-assigned-warning" class="alert-box" style="display:none; background:#fffbeb; border:1px solid #fde68a; color:#92400e; margin-bottom:16px;"></div>

        <form id="form-lkpd-editor">
          <input type="hidden" id="editor-lkpd-id" />

          <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 12px; color: var(--primary);">01 • Identitas & Tujuan</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
              <div><label class="form-label">Judul LKPD *</label><input type="text" id="editor-title" class="form-input" placeholder="Contoh: Prinsip Kimia Hijau" required /></div>
              <div><label class="form-label">Mata Pelajaran</label><input type="text" id="editor-subject" class="form-input" /></div>
              <div><label class="form-label">Fase / Kelas</label><input type="text" id="editor-grade" class="form-input" placeholder="X (Fase E)" /></div>
            </div>
            <div class="form-group" style="margin-top: 14px;">
              <label class="form-label">Tujuan Pembelajaran (satu per baris)</label>
              <textarea id="editor-objectives" class="form-input" rows="3" placeholder="Mengidentifikasi 12 prinsip kimia hijau"></textarea>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
              <div><label class="form-label">Pertanyaan Pemantik</label><textarea id="editor-trigger" class="form-input" rows="2"></textarea></div>
              <div><label class="form-label">Petunjuk Kerja</label><textarea id="editor-instructions" class="form-input" rows="2"></textarea></div>
            </div>
          </div>

          <div style="background: var(--bg-surface-subtle); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 12px; color: var(--primary);">02 • Materi & Tautan (materi, video, lab maya)</h4>
            <div class="form-group">
              <label class="form-label">Ringkasan Konsep Materi</label>
              <textarea id="editor-material-text" class="form-input" rows="3"></textarea>
            </div>
            <label class="form-label">Tautan untuk siswa</label>
            <div id="links-list"></div>
            <button type="button" class="btn-demo-pill" id="btn-add-link" style="margin-top: 8px;">➕ Tambah Tautan</button>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">Gunakan alamat lengkap berawalan https:// . Tautan YouTube akan diputar langsung di halaman siswa; tautan lain dibuka di tab baru.</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 8px; color: var(--primary);">03 • Aktivitas Siswa</h4>
            <div id="activities-list"></div>
            <button type="button" class="btn-demo-pill" id="btn-add-activity" style="margin-top: 8px;">➕ Tambah Aktivitas</button>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 8px; color: var(--primary);">04 • Soal Evaluasi</h4>
            <div id="questions-list"></div>
            <div style="display:flex; gap:8px; margin-top: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-demo-pill" id="btn-add-mc">➕ Soal Pilihan Ganda</button>
              <button type="button" class="btn-demo-pill" id="btn-add-essay">➕ Soal Uraian</button>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 8px; color: var(--primary);">05 • Pertanyaan Refleksi</h4>
            <div id="reflections-list"></div>
            <button type="button" class="btn-demo-pill" id="btn-add-reflection" style="margin-top: 8px;">➕ Tambah Refleksi</button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 1px solid var(--border-light); padding-top: 18px; flex-wrap: wrap; gap: 10px;">
            <button type="button" class="btn-demo-pill" id="btn-close-editor">Tutup Editor</button>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button type="button" class="btn-demo-pill" id="btn-save-and-assign" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none; font-weight: 700; padding: 10px 18px;">🚀 SIMPAN & TUGASKAN KE KELAS</button>
              <button type="submit" class="btn-primary" style="width: auto;">💾 Simpan LKPD</button>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div id="lkpd-modal-slot"></div>
  `;

  const $ = (sel) => container.querySelector(sel);
  let lkpdList = [];

  // ------------------------------------------------------------------ editor: daftar dinamis
  // Setiap butir menyimpan id dari server (bila ada) supaya jawaban siswa tidak bergeser saat diedit.
  const editorState = { links: [], activities: [], questions: [], reflections: [] };

  function blankState() {
    editorState.links = [];
    editorState.activities = [];
    editorState.questions = [];
    editorState.reflections = [];
  }

  function readRows() {
    // Sinkronkan input DOM -> state sebelum render ulang / simpan.
    editorState.links = [...container.querySelectorAll('#links-list .row-item')].map(r => ({
      title: r.querySelector('.f-title').value.trim(),
      url: r.querySelector('.f-url').value.trim(),
      type: r.querySelector('.f-type').value
    }));
    editorState.activities = [...container.querySelectorAll('#activities-list .row-item')].map(r => ({
      id: r.dataset.id || undefined,
      title: r.querySelector('.f-title').value.trim(),
      instructions: r.querySelector('.f-text').value.trim()
    }));
    editorState.questions = [...container.querySelectorAll('#questions-list .row-item')].map(r => {
      const type = r.dataset.type;
      if (type === 'multiple_choice') {
        const options = [...r.querySelectorAll('.f-opt')].map(i => i.value.trim());
        const checked = r.querySelector('.f-correct:checked');
        return { id: r.dataset.id || undefined, type, prompt: r.querySelector('.f-text').value.trim(), options, correct_index: checked ? Number(checked.value) : null };
      }
      return { id: r.dataset.id || undefined, type: 'essay', prompt: r.querySelector('.f-text').value.trim() };
    });
    editorState.reflections = [...container.querySelectorAll('#reflections-list .row-item')].map(r => ({
      id: r.dataset.id || undefined,
      prompt: r.querySelector('.f-text').value.trim()
    }));
  }

  const rowShell = (inner, extra = '') => `
    <div class="row-item" ${extra} style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 12px; margin-bottom: 8px; background: var(--bg-surface, #fff);">
      ${inner}
      <div style="text-align: right; margin-top: 6px;">
        <button type="button" class="btn-demo-pill btn-del-row" style="color: var(--danger); border-color: var(--danger); padding: 3px 10px;">🗑️ Hapus</button>
      </div>
    </div>`;

  function renderLists() {
    $('#links-list').innerHTML = editorState.links.map(l => rowShell(`
      <div style="display: grid; grid-template-columns: 1fr 1.6fr 1fr; gap: 8px;">
        <input class="form-input f-title" placeholder="Judul tautan (mis. Video Atom Economy)" value="${esc(l.title)}" />
        <input class="form-input f-url" type="url" placeholder="https://..." value="${esc(l.url)}" />
        <select class="form-input f-type">
          ${Object.entries(LINK_TYPE_LABEL).map(([k, v]) => `<option value="${k}" ${l.type === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>`)).join('') || '<p style="font-size:0.8rem;color:var(--text-muted);">Belum ada tautan.</p>';

    $('#activities-list').innerHTML = editorState.activities.map((a, i) => rowShell(`
      <label class="form-label">Aktivitas ${i + 1}</label>
      <input class="form-input f-title" placeholder="Judul aktivitas" value="${esc(a.title)}" style="margin-bottom: 6px;" />
      <textarea class="form-input f-text" rows="3" placeholder="Petunjuk pengerjaan aktivitas">${esc(a.instructions)}</textarea>`,
    `data-id="${esc(a.id || '')}"`)).join('') || '<p style="font-size:0.8rem;color:var(--text-muted);">Belum ada aktivitas.</p>';

    $('#questions-list').innerHTML = editorState.questions.map((q, i) => {
      if (q.type === 'multiple_choice') {
        const opts = (q.options && q.options.length ? q.options : ['', '', '', '']);
        return rowShell(`
          <label class="form-label">Soal ${i + 1} — Pilihan Ganda <span style="font-weight:400;color:var(--text-muted);">(pilih bulatan pada jawaban yang benar)</span></label>
          <textarea class="form-input f-text" rows="2" placeholder="Tulis pertanyaan">${esc(q.prompt)}</textarea>
          <div style="margin-top: 6px;">
            ${opts.map((o, oi) => `
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <input type="radio" class="f-correct" name="correct-${i}" value="${oi}" ${q.correct_index === oi ? 'checked' : ''} title="Jawaban benar" />
                <input class="form-input f-opt" placeholder="Pilihan ${String.fromCharCode(65 + oi)}" value="${esc(o)}" />
              </div>`).join('')}
          </div>`, `data-id="${esc(q.id || '')}" data-type="multiple_choice"`);
      }
      return rowShell(`
        <label class="form-label">Soal ${i + 1} — Uraian</label>
        <textarea class="form-input f-text" rows="2" placeholder="Tulis pertanyaan uraian">${esc(q.prompt)}</textarea>`,
      `data-id="${esc(q.id || '')}" data-type="essay"`);
    }).join('') || '<p style="font-size:0.8rem;color:var(--text-muted);">Belum ada soal.</p>';

    $('#reflections-list').innerHTML = editorState.reflections.map((r, i) => rowShell(`
      <label class="form-label">Refleksi ${i + 1}</label>
      <textarea class="form-input f-text" rows="2" placeholder="Apa wawasan baru yang Anda peroleh?">${esc(r.prompt)}</textarea>`,
    `data-id="${esc(r.id || '')}"`)).join('') || '<p style="font-size:0.8rem;color:var(--text-muted);">Belum ada pertanyaan refleksi.</p>';
  }

  $('#lkpd-editor-workspace').addEventListener('click', (e) => {
    const del = e.target.closest('.btn-del-row');
    if (!del) return;
    const row = del.closest('.row-item');
    const listId = row.parentElement.id;
    readRows();
    const idx = [...row.parentElement.querySelectorAll('.row-item')].indexOf(row);
    const key = { 'links-list': 'links', 'activities-list': 'activities', 'questions-list': 'questions', 'reflections-list': 'reflections' }[listId];
    if (key) { editorState[key].splice(idx, 1); renderLists(); }
  });

  const addTo = (key, item) => () => { readRows(); editorState[key].push(item()); renderLists(); };
  $('#btn-add-link').addEventListener('click', addTo('links', () => ({ title: '', url: '', type: 'materi' })));
  $('#btn-add-activity').addEventListener('click', addTo('activities', () => ({ title: '', instructions: '' })));
  $('#btn-add-mc').addEventListener('click', addTo('questions', () => ({ type: 'multiple_choice', prompt: '', options: ['', '', '', ''], correct_index: 0 })));
  $('#btn-add-essay').addEventListener('click', addTo('questions', () => ({ type: 'essay', prompt: '' })));
  $('#btn-add-reflection').addEventListener('click', addTo('reflections', () => ({ prompt: '' })));

  // ------------------------------------------------------------------ daftar LKPD
  async function loadLkpdList() {
    const box = $('#lkpd-collection-container');
    try {
      const res = await api.getLkpdList();
      lkpdList = res.data || [];
      $('#lkpd-list-badge').textContent = `${lkpdList.length} Dokumen`;
      if (lkpdList.length === 0) {
        box.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);"><p>Belum ada LKPD. Gunakan <strong>✦ BANTUAN AI</strong> atau <strong>➕ Buat Manual</strong>.</p></div>`;
        return;
      }
      box.innerHTML = lkpdList.map(item => {
        const classes = (item.assigned_classes || []).map(c => esc(c.class_name));
        const badge = classes.length
          ? `<span class="badge-tag success">🚀 Ditugaskan ke: ${classes.join(', ')}</span>`
          : '<span class="badge-tag warning">Belum Ditugaskan</span>';
        const nLinks = (item.material_links || []).length;
        return `
          <div class="task-item-card">
            <div class="task-meta" style="flex: 1;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="task-title">${esc(item.title)}</span>
                <span class="badge-tag ${item.status === 'published' ? 'success' : 'warning'}">${item.status === 'published' ? 'Diterbitkan' : 'Draft'}</span>
                ${badge}
              </div>
              <div class="task-subtitle" style="margin-top:4px;">
                <span>${esc(item.subject)}</span><span>•</span>
                <span>${esc(item.grade || '-')}</span><span>•</span>
                <span>${(item.activities || []).length} aktivitas, ${(item.questions || []).length} soal, ${nLinks} tautan</span><span>•</span>
                <span>Dibuat ${fmtDate(item.created_at)}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button class="btn-demo-pill btn-assign-direct" data-id="${esc(item.id)}" style="background:#eef2ff;border-color:#c7d2fe;color:var(--primary);font-weight:700;">🚀 Tugaskan</button>
              <button class="btn-demo-pill btn-edit-lkpd" data-id="${esc(item.id)}">✏️ Edit</button>
              <button class="btn-demo-pill btn-dup-lkpd" data-id="${esc(item.id)}">📋 Duplikasi</button>
              <button class="btn-demo-pill btn-del-lkpd" data-id="${esc(item.id)}" style="border-color:var(--danger);color:var(--danger);">🗑️ Hapus</button>
            </div>
          </div>`;
      }).join('');

      box.querySelectorAll('.btn-assign-direct').forEach(b => b.addEventListener('click', () => {
        const l = lkpdList.find(x => x.id === b.dataset.id);
        if (l) openAssignModal(l);
      }));
      box.querySelectorAll('.btn-edit-lkpd').forEach(b => b.addEventListener('click', () => openEditor(b.dataset.id)));
      box.querySelectorAll('.btn-dup-lkpd').forEach(b => b.addEventListener('click', async () => {
        try { await api.duplicateLkpd(b.dataset.id); showToast('LKPD berhasil diduplikasi.', 'success'); loadLkpdList(); }
        catch (e) { showToast(e.message, 'error'); }
      }));
      box.querySelectorAll('.btn-del-lkpd').forEach(b => b.addEventListener('click', () => deleteLkpd(b.dataset.id)));
    } catch (err) {
      box.innerHTML = `<div class="alert-box alert-error">⚠️ Gagal memuat LKPD: ${esc(err.message)}</div>`;
    }
  }

  async function deleteLkpd(id) {
    const l = lkpdList.find(x => x.id === id);
    if (!l || !confirm(`Hapus LKPD "${l.title}"?\n\nTugas yang memakai LKPD ini ikut dihapus.`)) return;
    try {
      await api.deleteLkpd(id);
    } catch (e) {
      if (/pengumpulan siswa/.test(e.message)) {
        if (!confirm(`⚠️ ${e.message}\n\nTetap hapus beserta semua nilai siswa? Tindakan ini tidak dapat dibatalkan.`)) return;
        try { await api.deleteLkpd(id, true); } catch (e2) { showToast(e2.message, 'error'); return; }
      } else { showToast(e.message, 'error'); return; }
    }
    showToast('LKPD berhasil dihapus.', 'success');
    if ($('#editor-lkpd-id').value === id) $('#lkpd-editor-workspace').style.display = 'none';
    loadLkpdList();
  }

  // ------------------------------------------------------------------ buka / isi editor
  function fillEditor(lkpd, { statusText } = {}) {
    $('#editor-lkpd-id').value = lkpd.id || '';
    $('#editor-title').value = lkpd.title || '';
    $('#editor-subject').value = lkpd.subject || user.subject || '';
    $('#editor-grade').value = lkpd.grade || '';
    $('#editor-objectives').value = (lkpd.objectives || []).join('\n');
    $('#editor-trigger').value = lkpd.trigger_questions || '';
    $('#editor-instructions').value = lkpd.instructions || '';
    $('#editor-material-text').value = lkpd.material_text || '';
    editorState.links = (lkpd.material_links || []).map(l => ({ title: l.title, url: l.url, type: l.type || 'materi' }));
    editorState.activities = (lkpd.activities || []).map(a => ({ id: a.id, title: a.title, instructions: a.instructions }));
    editorState.questions = (lkpd.questions || []).map(q => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options, correct_index: q.correct_index }));
    editorState.reflections = (lkpd.reflection_prompts || []).map(r => (typeof r === 'string' ? { prompt: r } : { id: r.id, prompt: r.prompt }));
    renderLists();
    $('#editor-status-badge').textContent = statusText || (lkpd.status === 'published' ? 'Diterbitkan' : 'Draft');

    const warn = $('#editor-assigned-warning');
    const assigned = (lkpd.assigned_classes || []).map(c => c.class_name);
    if (assigned.length) {
      warn.style.display = 'block';
      warn.innerHTML = `⚠️ LKPD ini sudah ditugaskan ke <strong>${assigned.map(esc).join(', ')}</strong>. Perubahan langsung terlihat oleh siswa. Hindari menghapus soal yang sudah dijawab.`;
    } else {
      warn.style.display = 'none';
    }
    const ws = $('#lkpd-editor-workspace');
    ws.style.display = 'block';
    ws.scrollIntoView({ behavior: 'smooth' });
  }

  function openEditor(id) {
    const l = lkpdList.find(x => x.id === id);
    if (l) fillEditor(l);
  }

  $('#btn-create-empty-lkpd').addEventListener('click', () => {
    blankState();
    fillEditor({
      subject: user.subject || '',
      activities: [{ title: '', instructions: '' }],
      questions: [{ type: 'multiple_choice', prompt: '', options: ['', '', '', ''], correct_index: 0 }, { type: 'essay', prompt: '' }],
      reflection_prompts: [{ prompt: '' }]
    }, { statusText: 'Baru (Draft)' });
  });

  $('#btn-close-editor').addEventListener('click', () => { $('#lkpd-editor-workspace').style.display = 'none'; });

  // ------------------------------------------------------------------ simpan
  function collectPayload() {
    readRows();
    const questions = editorState.questions.filter(q => q.prompt);
    for (const q of questions) {
      if (q.type === 'multiple_choice') {
        const filled = (q.options || []).filter(Boolean);
        if (filled.length < 2) throw new Error(`Soal pilihan ganda "${q.prompt.slice(0, 40)}" butuh minimal 2 pilihan.`);
        if (q.correct_index === null || !q.options[q.correct_index]) throw new Error(`Tandai jawaban benar untuk soal "${q.prompt.slice(0, 40)}".`);
        // buang pilihan kosong dan sesuaikan indeks jawaban benar
        const mapped = q.options.map((o, i) => ({ o, i })).filter(x => x.o);
        q.correct_index = mapped.findIndex(x => x.i === q.correct_index);
        q.options = mapped.map(x => x.o);
      }
    }
    const badLink = editorState.links.find(l => l.url && !/^https?:\/\//i.test(l.url));
    if (badLink) throw new Error(`Tautan harus diawali https:// atau http:// (${badLink.url})`);

    return {
      title: $('#editor-title').value.trim(),
      subject: $('#editor-subject').value.trim(),
      grade: $('#editor-grade').value.trim(),
      objectives: $('#editor-objectives').value.split('\n').map(s => s.trim()).filter(Boolean),
      trigger_questions: $('#editor-trigger').value.trim(),
      instructions: $('#editor-instructions').value.trim(),
      material_text: $('#editor-material-text').value.trim(),
      material_links: editorState.links.filter(l => l.url),
      activities: editorState.activities.filter(a => a.title || a.instructions),
      questions,
      reflection_prompts: editorState.reflections.filter(r => r.prompt)
    };
  }

  async function saveEditorForm() {
    const payload = collectPayload();
    const id = $('#editor-lkpd-id').value;
    const res = id ? await api.updateLkpd(id, payload) : await api.createLkpd(payload);
    $('#editor-lkpd-id').value = res.data.id;
    await loadLkpdList();
    // Muat ulang state agar id butir dari server terpakai pada simpan berikutnya.
    const fresh = lkpdList.find(l => l.id === res.data.id);
    if (fresh) fillEditor(fresh);
    return res.data;
  }

  $('#form-lkpd-editor').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await saveEditorForm(); showToast('LKPD berhasil disimpan!', 'success'); }
    catch (err) { showToast(err.message, 'error'); }
  });

  const saveThenAssign = async () => {
    try { const saved = await saveEditorForm(); openAssignModal(saved); }
    catch (err) { showToast(err.message, 'error'); }
  };
  $('#btn-save-and-assign').addEventListener('click', saveThenAssign);
  $('#btn-assign-from-editor-header').addEventListener('click', saveThenAssign);

  // ------------------------------------------------------------------ modal penugasan
  async function openAssignModal(lkpd) {
    const slot = $('#lkpd-modal-slot');
    let classes = [];
    try { classes = (await api.getClasses()).data || []; }
    catch (e) { showToast('Gagal memuat kelas binaan.', 'error'); return; }
    if (classes.length === 0) { showToast('Belum ada kelas. Tambahkan kelas di menu "Kelas & Siswa".', 'warning'); return; }

    slot.innerHTML = `
      <div class="modal-backdrop"><div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title"><span>🚀</span> Tugaskan LKPD ke Kelas</h3>
          <button class="modal-close-btn" id="btn-close-quick-assign">✕</button>
        </div>
        <form id="form-quick-assign-class">
          <div class="modal-body">
            <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <span style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">LKPD</span>
              <h4 style="font-size:1rem;font-weight:800;margin-top:2px;">${esc(lkpd.title)}</h4>
            </div>
            <div class="form-group">
              <label class="form-label">Kelas Tujuan *</label>
              <select id="select-target-class" class="form-input" required>
                ${classes.map(c => `<option value="${esc(c.id)}">Kelas ${esc(c.name)} — ${esc(c.subject)} (${c.student_count || 0} siswa)</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Judul Penugasan</label>
              <input type="text" id="quick-assign-title" class="form-input" value="${esc('Tugas: ' + lkpd.title)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Batas Waktu Pengumpulan *</label>
              <input type="datetime-local" id="quick-assign-due" class="form-input" value="${defaultDeadlineLocal(7)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Instruksi untuk Siswa</label>
              <textarea id="quick-assign-instructions" class="form-input" rows="3" placeholder="Kerjakan seluruh bagian LKPD sebelum batas waktu."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-demo-pill" id="btn-cancel-quick-assign">Batal</button>
            <button type="submit" class="btn-primary" style="width:auto;">🚀 TERBITKAN KE KELAS</button>
          </div>
        </form>
      </div></div>`;

    const close = () => { slot.innerHTML = ''; };
    slot.querySelector('#btn-close-quick-assign').addEventListener('click', close);
    slot.querySelector('#btn-cancel-quick-assign').addEventListener('click', close);
    slot.querySelector('#form-quick-assign-class').addEventListener('submit', async (e) => {
      e.preventDefault();
      const classId = slot.querySelector('#select-target-class').value;
      const cls = classes.find(c => c.id === classId);
      try {
        await api.createAssignment({
          lkpd_id: lkpd.id,
          class_id: classId,
          title: slot.querySelector('#quick-assign-title').value.trim(),
          due_date: localInputToIso(slot.querySelector('#quick-assign-due').value),
          instructions: slot.querySelector('#quick-assign-instructions').value.trim()
        });
        showToast(`LKPD berhasil ditugaskan ke Kelas ${cls ? cls.name : ''}!`, 'success');
        close();
        loadLkpdList();
      } catch (err) { showToast(err.message, 'error'); }
    });
  }

  // ------------------------------------------------------------------ AI generator
  $('#btn-trigger-ai-lkpd').addEventListener('click', () => {
    const slot = $('#lkpd-modal-slot');
    slot.innerHTML = `
      <div class="modal-backdrop"><div class="modal-dialog lg">
        <div class="modal-header">
          <h3 class="modal-title"><span>✦</span> AI LKPD Generator</h3>
          <button class="modal-close-btn" id="btn-close-ai-modal">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px;">AI menyusun draf LKPD (aktivitas, soal pilihan ganda & uraian, refleksi). Hasilnya dimuat ke editor agar Anda tinjau dan sunting sebelum disimpan.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div><label class="form-label">Mata Pelajaran</label><input type="text" id="ai-subject" class="form-input" value="${esc(user.subject || '')}" /></div>
            <div><label class="form-label">Kelas / Fase</label><input type="text" id="ai-grade" class="form-input" placeholder="X (Fase E)" /></div>
          </div>
          <div class="form-group"><label class="form-label">Topik Materi *</label><input type="text" id="ai-topic" class="form-input" placeholder="Contoh: Hukum Newton" required /></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
            <div><label class="form-label">Jumlah Aktivitas</label>
              <select id="ai-act-count" class="form-input"><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option></select></div>
            <div><label class="form-label">Tingkat Kesulitan</label>
              <select id="ai-difficulty" class="form-input"><option value="mudah">Dasar</option><option value="sedang" selected>Menengah</option><option value="tinggi">HOTS</option></select></div>
            <div><label class="form-label">Model Pembelajaran</label>
              <select id="ai-model-learn" class="form-input"><option value="PBL" selected>PBL</option><option value="PjBL">PjBL</option><option value="Inquiry">Inquiry</option><option value="Discovery">Discovery</option></select></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-demo-pill" id="btn-cancel-ai-modal">Batal</button>
          <button type="button" class="btn-primary" id="btn-run-ai-generate" style="width:auto;">✦ GENERATE & BUKA DI EDITOR</button>
        </div>
      </div></div>`;
    const close = () => { slot.innerHTML = ''; };
    slot.querySelector('#btn-close-ai-modal').addEventListener('click', close);
    slot.querySelector('#btn-cancel-ai-modal').addEventListener('click', close);
    slot.querySelector('#btn-run-ai-generate').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      const topic = slot.querySelector('#ai-topic').value.trim();
      if (!topic) { showToast('Isi topik materi terlebih dahulu.', 'warning'); return; }
      btn.disabled = true; btn.textContent = 'Menyusun LKPD...';
      try {
        const res = await api.generateLkpd({
          subject: slot.querySelector('#ai-subject').value.trim(),
          grade: slot.querySelector('#ai-grade').value.trim(),
          topic,
          activities_count: slot.querySelector('#ai-act-count').value,
          difficulty: slot.querySelector('#ai-difficulty').value,
          learning_model: slot.querySelector('#ai-model-learn').value
        });
        close();
        fillEditor({ ...res.data, id: '' }, { statusText: 'Hasil AI (belum disimpan)' });
        showToast('Draf AI dimuat ke editor. Tinjau, tambahkan tautan video/lab, lalu simpan.', 'info');
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false; btn.textContent = '✦ GENERATE & BUKA DI EDITOR';
      }
    });
  });

  blankState();
  renderLists();
  loadLkpdList();
}
