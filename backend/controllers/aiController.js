const db = require('../database/db');
const aiService = require('../services/ai/AiService');
const { fail, bad } = require('../utils/http');
const lkpdUtil = require('../utils/lkpd');

const maskKey = (k) => (k ? '••••••••' + String(k).slice(-4) : '');

// Konfigurasi dari form (boleh tanpa API key baru) digabung dengan key tersimpan milik pengguna yang sama.
function resolveConfig(userId, body = {}) {
  const stored = db.getAiConfigs(userId).find(c => c.provider === body.provider) || db.getActiveAiConfig(userId) || {};
  return { ...stored, ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== '')) };
}

class AiController {
  async testConnection(req, res) {
    try {
      const config = resolveConfig(req.user.id, req.body || {});
      const result = await aiService.testConnection(config);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Koneksi ke provider AI gagal.' });
    }
  }

  async listModels(req, res) {
    try {
      const models = await aiService.listModels(resolveConfig(req.user.id, req.body || {}));
      return res.status(200).json({ success: true, data: models });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Gagal memuat model dari API.' });
    }
  }

  async generateLkpd(req, res) {
    try {
      const { subject, grade, topic, activities_count, difficulty, learning_model } = req.body || {};
      if (!String(topic || '').trim()) throw bad('Topik materi wajib diisi.');
      const activeConfig = db.getActiveAiConfig(req.user.id);

      const prompt = `Buatkan LKPD ${subject || 'Umum'} kelas ${grade || ''} tentang ${topic} dengan ${activities_count || 3} aktivitas, tingkat kesulitan ${difficulty || 'sedang'}, dan model ${learning_model || 'Problem Based Learning'}. `
        + 'Sertakan 2-3 soal pilihan ganda (dengan correct_index) dan 1-2 soal uraian, ringkasan materi, serta pertanyaan refleksi.';

      const raw = await aiService.generateStructured(prompt, null, activeConfig || {});
      const normalized = lkpdUtil.normalizeLkpd(raw || {});
      // Data dari guru lebih akurat daripada tebakan AI.
      if (subject) normalized.subject = String(subject).trim();
      if (grade) normalized.grade = String(grade).trim();
      if (!normalized.title) normalized.title = `LKPD ${subject || ''}: ${topic}`.replace(/\s+/g, ' ').trim();
      const full = { ...lkpdUtil.EMPTY_LKPD, ...normalized };

      return res.status(200).json({ success: true, message: 'Struktur LKPD berhasil digenerate oleh AI.', data: full });
    } catch (err) {
      if (err.status) return fail(res, err);
      return res.status(500).json({ success: false, message: 'Gagal men-generate LKPD dari AI: ' + err.message });
    }
  }

  // Evaluasi memakai lembar jawaban dari server (bukan kiriman klien) supaya sesuai LKPD yang dikerjakan siswa.
  async evaluateSubmission(req, res) {
    try {
      const { submission_id, submissionId, rubric } = req.body || {};
      const id = submission_id || submissionId;
      if (!id) throw bad('ID pengumpulan wajib disertakan.');
      const detail = db.getSubmissionDetail(req.user, id);
      if (detail.status === 'draft') throw bad('Siswa belum mengumpulkan tugas ini.');

      const activeConfig = db.getActiveAiConfig(req.user.id);
      const text = lkpdUtil.sheetToText(detail.sheet);
      const mcLine = detail.summary.mc_total
        ? `\n\nPilihan ganda benar: ${detail.summary.mc_correct}/${detail.summary.mc_total} (${detail.summary.mc_percent}%).`
        : '';

      const evaluation = await aiService.evaluate(text + mcLine, rubric || `Tugas: ${detail.assignment_title}. Nilai kesesuaian jawaban dengan tujuan pembelajaran, ketepatan konsep, dan kualitas argumentasi.`, activeConfig || {}, {
        learningObjectives: detail.learning_objectives
      });

      return res.status(200).json({ success: true, message: 'Analisis jawaban siswa berhasil diselesaikan oleh AI.', data: evaluation });
    } catch (err) {
      if (err.status) return fail(res, err);
      return res.status(500).json({ success: false, message: 'Gagal menganalisis jawaban: ' + err.message });
    }
  }

  async chat(req, res) {
    try {
      const { message, context, action } = req.body || {};
      if (!String(message || context || '').trim()) throw bad('Pesan tidak boleh kosong.');
      const activeConfig = db.getActiveAiConfig(req.user.id);

      let prompt = message || '';
      if (action === 'create-soal') {
        prompt = `Sebagai asisten guru ahli, buatkan 3 butir soal pemahaman tingkat tinggi (HOTS) yang mendalam beserta rubrik dan pembahasannya untuk materi/topik: ${message || context || 'Mata Pelajaran'}. Format jawaban dengan jelas dan terstruktur.`;
      } else if (action === 'analyze-class') {
        prompt = `Sebagai konsultan pedagogis, analisislah data performa kelas berikut dan berikan rekomendasi pengayaan serta langkah perbaikan remedial konkret: ${message || context || 'Data Kelas'}.`;
      }

      const reply = await aiService.generate(prompt, activeConfig || {});
      return res.status(200).json({
        success: true,
        data: {
          reply,
          provider: activeConfig ? activeConfig.provider : 'gemini',
          model: activeConfig ? activeConfig.model : 'default'
        }
      });
    } catch (err) {
      if (err.status) return fail(res, err);
      return res.status(500).json({ success: false, message: 'Gagal menghubungi AI: ' + err.message });
    }
  }

  getConfig(req, res) {
    try {
      const configs = db.getAiConfigs(req.user.id);
      const active = db.getActiveAiConfig(req.user.id);
      return res.status(200).json({
        success: true,
        data: {
          configs: configs.map(({ api_key, ...c }) => ({ ...c, api_key_masked: maskKey(api_key) })),
          active: active ? {
            id: active.id,
            provider: active.provider,
            model: active.model,
            endpoint: active.endpoint,
            status: active.status || 'connected',
            is_active: active.is_active,
            api_key_masked: maskKey(active.api_key)
          } : null
        }
      });
    } catch (err) { return fail(res, err, 'Gagal memuat konfigurasi AI.'); }
  }

  saveConfig(req, res) {
    try {
      const { provider, model, endpoint, api_key } = req.body || {};
      if (!provider) throw bad('Provider AI wajib dipilih.');
      const saved = db.saveAiConfig(req.user.id, {
        provider,
        model: model || 'default-model',
        endpoint: endpoint || '',
        api_key: api_key || '',
        status: 'connected'
      });
      return res.status(200).json({
        success: true,
        message: 'Konfigurasi AI berhasil disimpan.',
        data: { id: saved.id, provider: saved.provider, model: saved.model, endpoint: saved.endpoint, status: saved.status, is_active: saved.is_active }
      });
    } catch (err) { return fail(res, err, 'Gagal menyimpan konfigurasi AI.'); }
  }
}

module.exports = new AiController();
