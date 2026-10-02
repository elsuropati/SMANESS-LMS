const db = require('../database/db');
const aiService = require('../services/ai/AiService');

class AiController {
  async testConnection(req, res) {
    try {
      const config = req.body.provider ? req.body : db.getActiveAiConfig(req.user.id);
      const result = await aiService.testConnection(config || {});
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Koneksi ke provider AI gagal.' });
    }
  }

  async listModels(req, res) {
    try {
      const activeConfig = db.getActiveAiConfig(req.user.id);
      const config = {
        ...(activeConfig || {}),
        ...req.body
      };
      const models = await aiService.listModels(config);
      return res.status(200).json({ success: true, data: models });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Gagal memuat model dari API.' });
    }
  }

  async generateLkpd(req, res) {
    try {
      const { subject, grade, topic, activities_count, difficulty, learning_model } = req.body;
      const activeConfig = db.getActiveAiConfig(req.user.id);

      const prompt = `Buatkan LKPD ${subject} kelas ${grade} tentang ${topic} dengan ${activities_count || 3} aktivitas, tingkat kesulitan ${difficulty || 'sedang'}, dan model ${learning_model || 'Problem Based Learning'}.`;

      const structuredLkpd = await aiService.generateStructured(prompt, null, activeConfig || {});
      
      // Override with user prompt fields for accuracy
      structuredLkpd.subject = subject || structuredLkpd.subject;
      structuredLkpd.grade = grade || structuredLkpd.grade;
      if (topic) {
        structuredLkpd.title = `LKPD ${subject}: ${topic}`;
      }

      return res.status(200).json({
        success: true,
        message: 'Struktur LKPD berhasil digenerate oleh AI.',
        data: structuredLkpd
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal men-generate LKPD dari AI: ' + err.message });
    }
  }

  async evaluateSubmission(req, res) {
    try {
      const { submissionId, studentAnswers, rubric, learningObjectives } = req.body;
      const activeConfig = db.getActiveAiConfig(req.user.id);

      const evaluation = await aiService.evaluate(studentAnswers, rubric, activeConfig || {}, {
        learningObjectives
      });

      return res.status(200).json({
        success: true,
        message: 'Analisis jawaban siswa berhasil diselesaikan oleh AI.',
        data: evaluation
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menganalisis jawaban: ' + err.message });
    }
  }

  async chat(req, res) {
    try {
      const { message, context, action } = req.body;
      const activeConfig = db.getActiveAiConfig(req.user.id);

      let prompt = message || '';
      if (action === 'create-soal') {
        prompt = `Sebagai asisten guru ahli, buatkan 3 butir soal pemahaman tingkat tinggi (HOTS) yang mendalam beserta rubrik dan pembahasannya untuk materi/topik: ${message || context || 'Mata Pelajaran'}. Format jawaban dengan jelas dan terstruktur.`;
      } else if (action === 'analyze-class') {
        prompt = `Sebagai konsultan pedagogis, analisislah data performa kelas berikut dan berikan rekomendasi pengayaan serta langkah perbaikan remedial konkret: ${message || context || 'Data Kelas'}.`;
      }

      let responseText = '';
      try {
        responseText = await aiService.generate(prompt, activeConfig || {});
      } catch (aiErr) {
        return res.status(500).json({ success: false, message: 'Gagal menghubungi AI: ' + aiErr.message });
      }

      return res.status(200).json({
        success: true,
        data: {
          reply: responseText,
          provider: activeConfig ? activeConfig.provider : 'Google Gemini',
          model: activeConfig ? activeConfig.model : 'gemini-1.5-flash'
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memproses pesan AI Assistant: ' + err.message });
    }
  }

  getConfig(req, res) {
    try {
      const configs = db.getAiConfigs(req.user.id);
      const active = db.getActiveAiConfig(req.user.id);

      // Mask API key for security
      const safeConfigs = configs.map(c => ({
        ...c,
        api_key_masked: c.api_key ? '••••••••' + c.api_key.slice(-4) : '',
        api_key: undefined
      }));

      return res.status(200).json({
        success: true,
        data: {
          configs: safeConfigs,
          active: active ? {
            id: active.id,
            provider: active.provider,
            model: active.model,
            endpoint: active.endpoint,
            status: active.status || 'connected',
            is_active: active.is_active,
            api_key_masked: active.api_key ? '••••••••' + active.api_key.slice(-4) : ''
          } : null
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat konfigurasi AI.' });
    }
  }

  saveConfig(req, res) {
    try {
      const { provider, model, endpoint, api_key } = req.body;
      if (!provider) {
        return res.status(400).json({ success: false, message: 'Provider AI wajib dipilih.' });
      }

      const saved = db.saveAiConfig(req.user.id, {
        provider,
        model: model || 'default-model',
        endpoint: endpoint || '',
        api_key: api_key || '',
        is_active: true,
        status: 'connected'
      });

      return res.status(200).json({
        success: true,
        message: 'Konfigurasi AI berhasil disimpan.',
        data: {
          id: saved.id,
          provider: saved.provider,
          model: saved.model,
          endpoint: saved.endpoint,
          status: saved.status,
          is_active: saved.is_active
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan konfigurasi AI.' });
    }
  }
}

module.exports = new AiController();
