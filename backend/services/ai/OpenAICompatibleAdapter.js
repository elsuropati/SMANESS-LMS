class OpenAICompatibleAdapter {
  constructor(config = {}) {
    this.apiKey = config.api_key || config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'gpt-4o';
    this.endpoint = config.endpoint || 'http://127.0.0.1:8000/v1';
    this.mock = config.mock !== undefined ? config.mock : (!this.apiKey && !this.endpoint.includes('11434')); // Ollama can run without key
  }

  cleanJsonString(str) {
    if (!str) return '{}';
    let cleaned = str.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async listModels() {
    if (this.mock || !this.apiKey) {
      return [
        { id: this.model || 'gpt-4o-mini', name: this.model || 'gpt-4o-mini' }
      ];
    }
    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/models`;
      const res = await fetch(url, { headers: this.getHeaders(), signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const list = (data.data || data.models || []).map(m => ({ id: m.id || m.name, name: m.id || m.name, available: true }));
      list.sort((a, b) => a.id.localeCompare(b.id));
      if (!list.length) throw new Error('Daftar model kosong.');
      return list;
    } catch (e) {
      throw new Error(`Gagal memuat model dari endpoint: ${e.message}`);
    }
  }

  async testConnection() {
    if (this.mock) {
      return { success: true, message: `Koneksi ke endpoint (${this.endpoint}) diverifikasi (Mock Mode Aktif).` };
    }

    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Ping connection test. Reply with: OK' }],
          max_tokens: 10
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}: Gagal terhubung ke endpoint.`);
      }

      return { success: true, message: `Berhasil terhubung ke endpoint OpenAI-Compatible (${this.model}).` };
    } catch (err) {
      throw new Error(`Koneksi endpoint gagal: ${err.message}`);
    }
  }

  async generate(prompt, options = {}) {
    if (this.mock) {
      return `[Mock AI Response] ${prompt.substring(0, 50)}...`;
    }

    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.4
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      throw new Error(`Gagal menghubungi penyedia AI: ${err.message}`);
    }
  }

  async generateStructured(prompt, schema, options = {}) {
    if (this.mock) {
      return {
        title: "LKPD Konfigurasi Elektron Berbasis Masalah",
        subject: "Kimia",
        grade: "X",
        learning_objectives: ["Menentukan elektron valensi unsur"],
        activities: [{ title: "Kegiatan 1", instructions: "Simulasi model atom" }],
        questions: [
          { type: "multiple_choice", prompt: "Berapa elektron valensi atom klorin?", options: ["5", "6", "7", "8"], correct_index: 2 },
          { type: "essay", prompt: "Jelaskan hubungan elektron valensi dengan sifat unsur!" }
        ],
        reflection_prompts: ["Hal baru apa yang Anda pahami hari ini?"]
      };
    }

    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/chat/completions`;
      const systemInstruction = `Anda adalah ahli kurikulum LKPD AI CLASSROOM.
Hasilkan struktur dokumen LKPD dalam format JSON murni TANPA markdown formatting:
{
  "title": "string",
  "subject": "string",
  "grade": "string",
  "learning_objectives": ["string"],
  "material_text": "string",
  "activities": [{ "title": "string", "instructions": "string" }],
  "questions": [
    { "type": "multiple_choice", "prompt": "string", "options": ["A", "B", "C", "D"], "correct_index": 0 },
    { "type": "essay", "prompt": "string" }
  ],
  "reflection_prompts": ["string"]
}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content || '{}';
      return JSON.parse(this.cleanJsonString(rawText));
    } catch (err) {
      throw new Error(`Gagal menghubungi penyedia AI: ${err.message}`);
    }
  }

  async evaluate(studentAnswers, rubric, options = {}) {
    if (this.mock) {
      return {
        score_recommendation: 88,
        strengths: [
          "Penalaran logis sangat terstruktur",
          "Koneksi konsep pencegahan limbah diuraikan dengan tepat"
        ],
        weaknesses: [
          "Dapat menambahkan contoh konkret pada skala industri"
        ],
        feedback: "Analisis Anda sangat memuaskan. Argumen yang disampaikan menunjukkan pemahaman mendalam tentang prinsip kimia hijau.",
        misconceptions: [],
        follow_up_needed: false
      };
    }

    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/chat/completions`;
      const systemInstruction = `Anda adalah Asisten Guru Penilai Tugas di AI CLASSROOM.
Analisis jawaban siswa berdasarkan rubrik dan hasilkan JSON murni TANPA markdown formatting:
{
  "score_recommendation": 85,
  "strengths": ["kelebihan 1", "kelebihan 2"],
  "weaknesses": ["kekurangan 1"],
  "feedback": "kalimat umpan balik konstruktif untuk siswa",
  "misconceptions": ["miskonsepsi jika ada"],
  "follow_up_needed": false
}`;

      const userContent = `Jawaban Siswa:
${JSON.stringify(studentAnswers, null, 2)}

Rubrik:
${rubric || 'Penilaian argumen dan pemahaman konsep.'}

Hasilkan JSON evaluasi:`;

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userContent }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content || '{}';
      return JSON.parse(this.cleanJsonString(rawText));
    } catch (err) {
      throw new Error(`Gagal menghubungi penyedia AI: ${err.message}`);
    }
  }
}

module.exports = OpenAICompatibleAdapter;
