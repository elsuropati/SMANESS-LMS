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

      let responseText = '';

      if (action === 'create-soal') {
        responseText = `Berikut adalah 3 butir soal pemahaman Kimia Hijau level HOTS:\n\n1. Analisis bagaimana penggantian katalis asam sulfat dengan zeolit alam dapat menurunkan beban limbah lingkungan.\n2. Hitung persentase ekonomi atom jika reaksi menghasilkan 150g produk utama dari 200g reaktan total.\n3. Rancanglah solusi penanganan pelarut dalam laboratorium sekolah berdasarkan 12 prinsip Green Chemistry!`;
      } else if (action === 'analyze-class') {
        responseText = `Berdasarkan data kelas X-1 Kimia:\n- Rata-rata capaian kelas: 86/100 (Tuntas: 100%).\n- Siswa telah sangat baik memahami identifikasi pelarut ramah lingkungan.\n- Rekomendasi: Berikan penguatan ringkas pada materi penghitungan efisiensi atom untuk 1 siswa yang masih ragu.`;
      } else {
        responseText = `Halo Bapak/Ibu Guru. Saya adalah AI Assistant AI CLASSROOM. Saya siap membantu Anda menyusun modul LKPD terstruktur, membuat rubrik penilaian, menganalisis jawaban esai siswa, maupun merancang modul remedial/pengayaan yang adaptif. Ada materi atau tugas yang ingin kita kembangkan sekarang?`;
      }

      return res.status(200).json({
        success: true,
        data: {
          reply: responseText,
          provider: activeConfig ? activeConfig.provider : 'Google Gemini',
          model: activeConfig ? activeConfig.model : 'gemini-1.5-pro'
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memproses pesan AI Assistant.' });
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
