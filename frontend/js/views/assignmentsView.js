import { api } from '../api.js';
import { esc, escMultiline, fmtDateTime, localInputToIso, isoToLocalInput, defaultDeadlineLocal } from '../utils.js';

export async function renderAssignmentsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Penugasan LKPD</h1>
          <p>Terbitkan LKPD ke kelas, pantau siapa yang sudah mengumpulkan, dan atur tenggat waktu.</p>
        </div>
        <div><button class="btn-primary" id="btn-open-create-assign" style="width:auto;padding:10px 18px;">🚀 Terbitkan Tugas Baru</button></div>
      </div>
      <div class="content-panel">
        <div class="panel-header">
          <h3 class="panel-title"><span>📋</span> Daftar Penugasan Aktif</h3>
          <span class="badge-tag success" id="assign-count-badge">0 Penugasan</span>
        </div>
        <div id="assignments-list-container"><p style="color:var(--text-muted);padding:16px;">Memuat data penugasan...</p></div>
      </div>
    </div>
    <div id="assign-modal-slot"></div>`;

  const slot = container.querySelector('#assign-modal-slot');
  let assignments = [];

  async function loadAssignments() {
    const box = container.querySelector('#assignments-list-container');
    try {
      assignments = (await api.getAssignments()).data || [];
      container.querySelector('#assign-count-badge').textContent = `${assignments.length} Penugasan`;
      if (!assignments.length) {
        box.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);"><p>Belum ada penugasan. Klik <strong>Terbitkan Tugas Baru</strong> untuk memulai.</p></div>`;
        return;
      }
      box.innerHTML = assignments.map(a => {
        const overdue = new Date(a.due_date) < new Date();
        const pct = a.total_students ? Math.round((a.submitted_count / a.total_students) * 100) : 0;
        return `
        <div class="task-item-card">
          <div class="task-meta" style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="task-title">${esc(a.title)}</span>
              <span class="badge-tag ${overdue ? 'warning' : 'success'}">${overdue ? 'Tenggat Lewat' : 'Aktif'}</span>
            </div>
            <div class="task-subtitle" style="margin-top:4px;">
              <span>Kelas: <strong>${esc(a.class_name)}</strong></span><span>•</span>
              <span>LKPD: <strong>${esc(a.lkpd_title)}</strong></span><span>•</span>
              <span>Tenggat: <strong>${fmtDateTime(a.due_date)}</strong></span>
            </div>
            <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">
              Terkumpul <strong>${a.submitted_count}/${a.total_students}</strong> siswa • Dinilai <strong>${a.graded_count}</strong> • Sedang dikerjakan <strong>${a.draft_count}</strong>
            </div>
            <div class="progress-bar-container" style="width:260px;margin:6px 0 0;"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">${escMultiline(a.instructions)}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;">
            <button class="btn-demo-pill btn-view-subs" data-id="${esc(a.id)}">👥 Cek Pengumpulan</button>
            <button class="btn-demo-pill btn-edit-assign" data-id="${esc(a.id)}">✏️ Ubah</button>
            <button class="btn-demo-pill btn-del-assign" data-id="${esc(a.id)}" style="border-color:var(--danger);color:var(--danger);">🗑️</button>
          </div>
        </div>`;
      }).join('');

      box.querySelectorAll('.btn-view-subs').forEach(b => b.addEventListener('click', () => { window.location.hash = `#grading?assignment=${encodeURIComponent(b.dataset.id)}`; }));
      box.querySelectorAll('.btn-edit-assign').forEach(b => b.addEventListener('click', () => openEditModal(assignments.find(a => a.id === b.dataset.id))));
      box.querySelectorAll('.btn-del-assign').forEach(b => b.addEventListener('click', async () => {
        const a = assignments.find(x => x.id === b.dataset.id);
        const extra = a.submitted_count ? `\n\n⚠️ ${a.submitted_count} pengumpulan siswa beserta nilainya ikut terhapus.` : '';
        if (!confirm(`Hapus penugasan "${a.title}"?${extra}`)) return;
        try { await api.deleteAssignment(a.id); showToast('Penugasan dihapus.', 'success'); loadAssignments(); }
        catch (e) { showToast(e.message, 'error'); }
      }));
    } catch (err) {
      box.innerHTML = `<div class="alert-box alert-error">⚠️ Gagal memuat tugas: ${esc(err.message)}</div>`;
    }
  }

  function openEditModal(a) {
    slot.innerHTML = `
      <div class="modal-backdrop"><div class="modal-dialog">
        <div class="modal-header"><h3 class="modal-title">✏️ Ubah Penugasan</h3><button class="modal-close-btn" id="btn-x">✕</button></div>
        <form id="form-edit-assign">
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Judul</label><input id="ea-title" class="form-input" value="${esc(a.title)}" required /></div>
            <div class="form-group"><label class="form-label">Batas Waktu</label><input id="ea-due" type="datetime-local" class="form-input" value="${isoToLocalInput(a.due_date)}" required /></div>
            <div class="form-group"><label class="form-label">Instruksi</label><textarea id="ea-ins" class="form-input" rows="3">${esc(a.instructions)}</textarea></div>
          </div>
          <div class="modal-footer"><button type="button" class="btn-demo-pill" id="btn-c">Batal</button><button type="submit" class="btn-primary" style="width:auto;">Simpan</button></div>
        </form></div></div>`;
    const close = () => { slot.innerHTML = ''; };
    slot.querySelector('#btn-x').addEventListener('click', close);
    slot.querySelector('#btn-c').addEventListener('click', close);
    slot.querySelector('#form-edit-assign').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.updateAssignment(a.id, {
          title: slot.querySelector('#ea-title').value.trim(),
          due_date: localInputToIso(slot.querySelector('#ea-due').value),
          instructions: slot.querySelector('#ea-ins').value.trim()
        });
        showToast('Penugasan diperbarui.', 'success'); close(); loadAssignments();
      } catch (err) { showToast(err.message, 'error'); }
    });
  }

  container.querySelector('#btn-open-create-assign').addEventListener('click', async () => {
    let classes = [], lkpdList = [];
    try {
      const [c, l] = await Promise.all([api.getClasses(), api.getLkpdList()]);
      classes = c.data || []; lkpdList = l.data || [];
    } catch (e) { showToast('Gagal memuat daftar kelas atau LKPD.', 'error'); return; }
    if (!classes.length) { showToast('Tambahkan kelas terlebih dahulu di menu Kelas & Siswa.', 'warning'); return; }
    if (!lkpdList.length) { showToast('Buat LKPD terlebih dahulu di menu LKPD Builder.', 'warning'); return; }

    slot.innerHTML = `
      <div class="modal-backdrop"><div class="modal-dialog">
        <div class="modal-header"><h3 class="modal-title">🚀 Terbitkan Tugas LKPD</h3><button class="modal-close-btn" id="btn-x">✕</button></div>
        <form id="form-publish-assignment">
          <div class="modal-body">
            <div class="form-group"><label class="form-label">Dokumen LKPD *</label>
              <select id="assign-lkpd-select" class="form-input" required>${lkpdList.map(l => `<option value="${esc(l.id)}">${esc(l.title)} (${esc(l.subject)})</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Kelas Tujuan *</label>
              <select id="assign-class-select" class="form-input" required>${classes.map(c => `<option value="${esc(c.id)}">Kelas ${esc(c.name)} — ${esc(c.subject)} (${c.student_count || 0} siswa)</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Judul Penugasan *</label><input id="assign-title-input" class="form-input" required /></div>
            <div class="form-group"><label class="form-label">Batas Waktu *</label><input type="datetime-local" id="assign-due-date" class="form-input" value="${defaultDeadlineLocal(7)}" required /></div>
            <div class="form-group"><label class="form-label">Instruksi untuk Siswa</label><textarea id="assign-instructions" class="form-input" rows="3" placeholder="Kerjakan seluruh bagian LKPD sebelum batas waktu."></textarea></div>
          </div>
          <div class="modal-footer"><button type="button" class="btn-demo-pill" id="btn-c">Batal</button><button type="submit" class="btn-primary" style="width:auto;">TERBITKAN TUGAS</button></div>
        </form></div></div>`;
    const close = () => { slot.innerHTML = ''; };
    slot.querySelector('#btn-x').addEventListener('click', close);
    slot.querySelector('#btn-c').addEventListener('click', close);
    const sel = slot.querySelector('#assign-lkpd-select');
    const title = slot.querySelector('#assign-title-input');
    const sync = () => { const l = lkpdList.find(x => x.id === sel.value); if (l) title.value = `Tugas: ${l.title}`; };
    sel.addEventListener('change', sync); sync();

    slot.querySelector('#form-publish-assignment').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.createAssignment({
          lkpd_id: sel.value,
          class_id: slot.querySelector('#assign-class-select').value,
          title: title.value.trim(),
          due_date: localInputToIso(slot.querySelector('#assign-due-date').value),
          instructions: slot.querySelector('#assign-instructions').value.trim()
        });
        showToast('Tugas diterbitkan. Siswa di kelas tersebut langsung dapat mengaksesnya.', 'success');
        close(); loadAssignments();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  loadAssignments();
}
