// Normalisasi struktur LKPD + lembar jawaban siswa.
// Satu-satunya sumber kebenaran format LKPD: dipakai oleh Builder guru, generator AI,
// pemutar LKPD siswa, dan halaman penilaian guru supaya selalu sinkron.

const MAX_TEXT = 5000;
const MAX_ANSWER = 10000;

function str(v, max = MAX_TEXT) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}

function toLines(v) {
  let arr = [];
  if (Array.isArray(v)) {
    arr = v.map(x => (typeof x === 'string' ? x : (x && (x.text || x.prompt || x.title)) || ''));
  } else if (typeof v === 'string') {
    arr = v.split('\n');
  }
  return arr
    .map(s => str(s, 1000).replace(/^[-•*]\s+/, '').trim())
    .filter(Boolean);
}

// ID yang stabil: id dari klien dipertahankan (jika valid & unik) supaya jawaban siswa
// tidak bergeser ketika guru menghapus / mengurutkan ulang butir. Butir baru mendapat nomor berikutnya.
const ID_RE = /^[a-z]{1,3}-[a-z0-9]{1,12}$/;

function assignIds(items, prefix) {
  const used = new Set();
  let max = 0;
  for (const it of items) {
    if (it.id && ID_RE.test(it.id) && it.id.startsWith(prefix + '-') && !used.has(it.id)) {
      used.add(it.id);
      const n = Number(it.id.slice(prefix.length + 1));
      if (Number.isInteger(n) && n > max) max = n;
    } else {
      it.id = null;
    }
  }
  for (const it of items) {
    if (!it.id) {
      max += 1;
      it.id = `${prefix}-${max}`;
    }
  }
  return items;
}

function normalizeActivities(v) {
  let list = [];
  if (typeof v === 'string') {
    list = toLines(v).map(t => ({ title: '', instructions: t }));
  } else if (Array.isArray(v)) {
    list = v.map(a => {
      if (typeof a === 'string') return { title: '', instructions: a };
      return {
        id: a && a.id,
        title: str(a && a.title, 200),
        instructions: str(a && (a.instructions || a.description || a.prompt))
      };
    });
  }
  list = list.filter(a => a.title || a.instructions);
  assignIds(list, 'act');
  return list.map((a, i) => ({
    id: a.id,
    title: a.title || `Aktivitas ${i + 1}`,
    instructions: a.instructions
  }));
}

function normalizeQuestions(v) {
  let list = [];
  if (typeof v === 'string') {
    list = toLines(v).map(t => ({ prompt: t }));
  } else if (Array.isArray(v)) {
    list = v.map(q => (typeof q === 'string' ? { prompt: q } : (q || {})));
  }
  const items = list
    .map(q => {
      const prompt = str(q.prompt || q.text || q.question);
      const options = Array.isArray(q.options) ? q.options.map(o => str(o, 500)).filter(Boolean) : [];
      const isMc = options.length >= 2;
      let correct = Number.isInteger(Number(q.correct_index)) && q.correct_index !== null && q.correct_index !== ''
        ? Number(q.correct_index) : null;
      if (!isMc || correct === null || correct < 0 || correct >= options.length) correct = null;
      return { id: q.id, prompt, type: isMc ? 'multiple_choice' : 'essay', options: isMc ? options : [], correct_index: isMc ? correct : null };
    })
    .filter(q => q.prompt);
  assignIds(items, 'q');
  return items;
}

function normalizeReflections(v) {
  let list = [];
  if (typeof v === 'string') {
    list = toLines(v).map(t => ({ prompt: t }));
  } else if (Array.isArray(v)) {
    list = v.map(r => (typeof r === 'string' ? { prompt: r } : { id: r && r.id, prompt: str(r && (r.prompt || r.text || r.title), 1000) }));
  }
  list = list
    .map(r => ({ id: r.id, prompt: String(r.prompt || '').replace(/^[-•*]\s+/, '').trim() }))
    .filter(r => r.prompt);
  assignIds(list, 'r');
  return list;
}

// Jenis tautan: materi (PDF/modul/web), video, lab (simulasi / Lab Maya).
const LINK_TYPES = ['materi', 'video', 'lab'];

function normalizeLinks(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map(l => ({
      title: str(l && l.title, 200),
      url: str(l && l.url, 1000),
      type: LINK_TYPES.includes(l && l.type) ? l.type : 'materi'
    }))
    .filter(l => /^https?:\/\//i.test(l.url))
    .map(l => ({ ...l, title: l.title || l.url }));
}

// Mengubah input (dari builder / AI / data lama) menjadi bentuk baku.
// Hanya field yang dikirim yang dikembalikan, sehingga aman untuk update parsial.
function normalizeLkpd(input = {}) {
  const out = {};
  const has = (...keys) => keys.find(k => input[k] !== undefined);

  if (input.title !== undefined) out.title = str(input.title, 200);
  if (input.subject !== undefined) out.subject = str(input.subject, 100);
  if (input.grade !== undefined) out.grade = str(input.grade, 100);

  const objKey = has('objectives', 'learning_objectives');
  if (objKey) out.objectives = toLines(input[objKey]);

  if (input.trigger_questions !== undefined) {
    out.trigger_questions = Array.isArray(input.trigger_questions)
      ? toLines(input.trigger_questions).join('\n')
      : str(input.trigger_questions);
  }
  if (input.instructions !== undefined) out.instructions = str(input.instructions);
  if (input.material_text !== undefined) out.material_text = str(input.material_text);
  if (input.material_links !== undefined) out.material_links = normalizeLinks(input.material_links);
  if (input.activities !== undefined) out.activities = normalizeActivities(input.activities);
  if (input.questions !== undefined) out.questions = normalizeQuestions(input.questions);

  const refKey = has('reflection_prompts', 'reflection');
  if (refKey) out.reflection_prompts = normalizeReflections(input[refKey]);

  if (input.status === 'draft' || input.status === 'published') out.status = input.status;
  return out;
}

const EMPTY_LKPD = {
  objectives: [], trigger_questions: '', instructions: '', material_text: '',
  material_links: [], activities: [], questions: [], reflection_prompts: []
};

// Mendukung data lama (array string) maupun format baru (array {id, prompt}).
function reflectionItems(lkpd) {
  return normalizeReflections(lkpd.reflection_prompts || []);
}

// Bersihkan jawaban siswa: hanya id yang ada di LKPD yang disimpan.
function sanitizeAnswers(raw, lkpd) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = { activities: {}, questions: {}, reflections: {} };

  for (const a of (lkpd.activities || [])) {
    const v = src.activities && src.activities[a.id];
    if (typeof v === 'string' && v) out.activities[a.id] = v.slice(0, MAX_ANSWER);
  }
  for (const q of (lkpd.questions || [])) {
    const v = src.questions && src.questions[q.id];
    if (q.type === 'multiple_choice') {
      const n = Number(v);
      if (v !== undefined && v !== null && v !== '' && Number.isInteger(n) && n >= 0 && n < q.options.length) {
        out.questions[q.id] = n;
      }
    } else if (typeof v === 'string' && v) {
      out.questions[q.id] = v.slice(0, MAX_ANSWER);
    }
  }
  for (const r of reflectionItems(lkpd)) {
    const v = src.reflections && src.reflections[r.id];
    if (typeof v === 'string' && v) out.reflections[r.id] = v.slice(0, MAX_ANSWER);
  }
  return out;
}

// Lembar jawaban siap tampil untuk guru: pertanyaan + jawaban siswa berpasangan.
function buildSheet(lkpd, answers) {
  const sheet = [];
  const a = answers || {};

  for (const act of (lkpd.activities || [])) {
    sheet.push({
      section: 'activity', id: act.id, label: act.title, prompt: act.instructions,
      answer: (a.activities && a.activities[act.id]) || ''
    });
  }
  (lkpd.questions || []).forEach((q, i) => {
    const item = {
      section: 'question', id: q.id, label: `Soal ${i + 1}`, type: q.type, prompt: q.prompt, answer: ''
    };
    const v = a.questions && a.questions[q.id];
    if (q.type === 'multiple_choice') {
      item.options = q.options;
      item.correct_index = q.correct_index;
      item.answer_index = Number.isInteger(v) ? v : null;
      item.answer = Number.isInteger(v) ? q.options[v] : '';
      item.is_correct = q.correct_index !== null && Number.isInteger(v) ? v === q.correct_index : null;
    } else {
      item.answer = v || '';
    }
    sheet.push(item);
  });
  reflectionItems(lkpd).forEach((r, i) => {
    sheet.push({
      section: 'reflection', id: r.id, label: `Refleksi ${i + 1}`, prompt: r.prompt,
      answer: (a.reflections && a.reflections[r.id]) || ''
    });
  });
  return sheet;
}

// Kunci jawaban tidak boleh sampai ke siswa.
function stripAnswerKey(lkpd) {
  if (!lkpd) return lkpd;
  return {
    ...lkpd,
    questions: (lkpd.questions || []).map(q => {
      const { correct_index, ...rest } = q;
      return rest;
    })
  };
}

// Ringkasan pilihan ganda (nilai otomatis) dan kelengkapan pengisian.
function summarizeSheet(sheet) {
  const items = sheet || [];
  const mc = items.filter(s => s.section === 'question' && s.type === 'multiple_choice' && s.correct_index !== null && s.correct_index !== undefined);
  const mcCorrect = mc.filter(s => s.is_correct === true).length;
  const answered = items.filter(s => String(s.answer || '').trim() !== '').length;
  return {
    total_items: items.length,
    answered_items: answered,
    mc_total: mc.length,
    mc_correct: mcCorrect,
    mc_percent: mc.length ? Math.round((mcCorrect / mc.length) * 100) : null
  };
}

function sheetToText(sheet) {
  return (sheet || []).map(s => {
    const ans = s.answer ? s.answer : '(tidak dijawab)';
    return `[${s.label}] ${s.prompt}\nJawaban siswa: ${ans}`;
  }).join('\n\n');
}

module.exports = {
  normalizeLkpd, normalizeActivities, normalizeQuestions, normalizeReflections, sanitizeAnswers,
  buildSheet, summarizeSheet, stripAnswerKey, sheetToText, reflectionItems, EMPTY_LKPD, str, toLines
};
