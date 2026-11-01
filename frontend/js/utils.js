// Utilitas tampilan bersama.

// Semua teks dari pengguna (nama, judul, jawaban siswa) WAJIB lewat esc() sebelum masuk innerHTML,
// supaya jawaban siswa tidak bisa menjalankan skrip di browser guru (XSS).
export function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Teks bebas dengan baris baru -> HTML aman.
export function escMultiline(v) {
  return esc(v).replace(/\n/g, '<br>');
}

export function fmtDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', opts);
}

export function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

// <input type="datetime-local"> memakai waktu lokal tanpa zona; ubah ke ISO UTC sebelum dikirim.
export function localInputToIso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

// Nilai awal datetime-local: N hari dari sekarang, jam 23:59 waktu lokal.
export function defaultDeadlineLocal(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function isoToLocalInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---- Tautan materi (materi / video / lab) ----
export const LINK_ICON = { materi: '📄', video: '📺', lab: '🔬' };
export const LINK_LABEL = { materi: 'Materi', video: 'Video', lab: 'Lab Maya' };

export function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).match(/^[\w-]{6,15}$/) ? u.pathname.slice(1) : null;
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const v = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,15})/) || [])[1];
      return v && /^[\w-]{6,15}$/.test(v) ? v : null;
    }
  } catch (e) { /* url tidak valid */ }
  return null;
}

// Hanya http/https yang boleh menjadi href (blokir javascript: dll).
export function safeUrl(url) {
  return /^https?:\/\//i.test(String(url || '')) ? String(url) : '#';
}

// Daftar tautan: video YouTube diputar di halaman, sisanya dibuka di tab baru.
export function renderLinksHtml(links, { embed = true } = {}) {
  const list = Array.isArray(links) ? links : [];
  if (!list.length) return '<p style="font-size:0.85rem;color:var(--text-muted);">Guru belum menambahkan tautan materi.</p>';
  return list.map(l => {
    const type = LINK_ICON[l.type] ? l.type : 'materi';
    const yt = embed && type === 'video' ? youtubeId(l.url) : null;
    const open = `<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer" class="btn-demo-pill" style="font-weight:600;">${LINK_ICON[type]} ${esc(l.title || l.url)} <span style="color:var(--text-muted);font-weight:400;">(${LINK_LABEL[type]} ↗)</span></a>`;
    if (yt) {
      return `<div style="margin-bottom:14px;">
        <div style="font-weight:700;font-size:0.88rem;margin-bottom:6px;">${LINK_ICON.video} ${esc(l.title || 'Video')}</div>
        <div style="position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#000;">
          <iframe src="https://www.youtube-nocookie.com/embed/${esc(yt)}" title="${esc(l.title || 'Video')}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <div style="margin-top:6px;">${open}</div>
      </div>`;
    }
    return `<div style="margin-bottom:8px;">${open}</div>`;
  }).join('');
}
