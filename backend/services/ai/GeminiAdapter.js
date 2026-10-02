class GeminiAdapter {
  constructor(config = {}) {
    this.apiKey = config.api_key || config.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.endpoint = config.endpoint || 'https://generativelanguage.googleapis.com';
    this.mock = config.mock !== undefined ? config.mock : (!this.apiKey);
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

  getCleanModelName() {
    return (this.model || 'gemini-1.5-flash').replace(/^models\//, '');
  }

  async listModels() {
    if (this.mock || !this.apiKey) {
      return [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Cepat & Direkomendasikan)', available: true },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Generasi Terbaru)', available: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Penalaran Mendalam)', available: true }
      ];
    }

    try {
      const baseUrl = this.endpoint.replace(/\/$/, '');
      const url = `${baseUrl}/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url, {
        headers: { 'x-goog-api-key': this.apiKey },
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${res.status}: Gagal memuat model Gemini.`);
      }

      const data = await res.json();
      const candidates = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => {
          const id = m.name.replace(/^models\//, '');
          return {
            id,
            name: `${m.displayName || id} (${id})`,
            description: m.description || ''
          };
        });

      if (candidates.length === 0) {
        return [
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', available: true },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', available: true }
        ];
      }

      // Test setiap model secara paralel dengan pesan minimal
      const testResults = await Promise.allSettled(
        candidates.map(async (m) => {
          const testUrl = `${baseUrl}/v1beta/models/${m.id}:generateContent?key=${this.apiKey}`;
          try {
            const testRes = await fetch(testUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: 1 }
              }),
              signal: AbortSignal.timeout(6000)
            });
            if (testRes.ok) {
              return { ...m, available: true, error: null };
            } else {
              const errData = await testRes.json().catch(() => ({}));
              const errMsg = errData.error?.message || `HTTP ${testRes.status}`;
              return { ...m, available: false, error: errMsg };
            }
          } catch (e) {
            return { ...m, available: false, error: e.message };
          }
        })
      );

      return testResults.map(r => r.status === 'fulfilled' ? r.value : { ...r.reason, available: false });
    } catch (err) {
      throw new Error(`Gagal memuat model Gemini dari API: ${err.message}`);
    }
  }

  async testConnection() {
    if (this.mock || !this.apiKey) {
      return { 
        success: true, 
        message: 'Koneksi AI aktif dalam mode Simulasi/Mock. Untuk menghubungkan ke AI langsung, masukkan Google Gemini API Key di menu Pengaturan AI atau Environment Variables Netlify (GEMINI_API_KEY).' 
      };
    }

    try {
      const cleanModel = this.getCleanModelName();
      const url = `${this.endpoint.replace(/\/$/, '')}/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping test connection. Jawab satu kata: OK' }] }]
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${res.status}: Gagal terhubung ke Gemini API.`);
      }

      return { success: true, message: `Berhasil terhubung ke Google Gemini API Live (${cleanModel}).` };
    } catch (err) {
      throw new Error(`Koneksi Gemini gagal: ${err.message}`);
    }
  }

  async generate(prompt, options = {}) {
    if (this.mock || !this.apiKey) {
      return `[Asisten AI - Mode Standar]\nBerdasarkan topik yang Anda berikan, berikut adalah rekomendasi perencanaan materi dan panduan pedagogis:\n\n1. Rancang apersepsi berbasis fenomena nyata.\n2. Berikan pertanyaan pemantik HOTS.\n3. Lakukan penilaian formatif terpadu.\n\n(Tip: Pasang GEMINI_API_KEY di Netlify untuk jawaban AI langsung)`;
    }

    const cleanModel = this.getCleanModelName();
    const url = `${this.endpoint.replace(/\/$/, '')}/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.4
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: Gagal berkomunikasi dengan Gemini API`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateStructured(prompt, schema, options = {}) {
    // Jika tidak ada API Key, gunakan generator dinamis berdasarkan topik yang diminta guru
    if (this.mock || !this.apiKey) {
      const topicMatch = prompt.match(/tentang\s+([^\s,]+(?:\s+[^\s,]+)*?)(?:\s+dengan|$)/i);
      const topic = topicMatch ? topicMatch[1] : 'Materi Pembelajaran';
      const subjectMatch = prompt.match(/LKPD\s+([^\s,]+)/i);
      const subject = subjectMatch ? subjectMatch[1] : 'Umum';

      return {
        title: `LKPD ${subject}: ${topic}`,
        subject: subject,
        grade: "Fase E",
        learning_objectives: [
          `Memahami konsep fundamental mengenai ${topic}`,
          `Menganalisis studi kasus dan penerapan ${topic} dalam kehidupan sehari-hari`,
          `Menarik kesimpulan dan solusi kreatif dari fenomena ${topic}`
        ],
        activities: [
          { title: "Aktivitas 1: Eksplorasi Kasus", instructions: `Amati fenomena terkait ${topic} di sekitar lingkungan Anda, lalu catat 3 temuan penting!` },
          { title: "Aktivitas 2: Analisis & Eksperimen", instructions: `Bandingkan solusi konvensional dan solusi inovatif terkait permasalahan ${topic}!` }
        ],
        questions: [
          { type: "essay", prompt: `Jelaskan secara komprehensif bagaimana prinsip utama ${topic} dapat menyelesaikan masalah di masyarakat!` },
          { type: "essay", prompt: `Berikan 2 contoh konkret penerapan ${topic} yang telah Anda pelajari!` }
        ],
        reflection_prompts: [
          `Wawasan baru apa yang paling membuka pandangan Anda mengenai ${topic}?`,
          `Komitmen nyata apa yang akan Anda terapkan setelah mempelajari materi ini?`
        ]
      };
    }

    // Live call ke Google Gemini API
    const systemInstruction = `Anda adalah ahli kurikulum dan perancang LKPD (Lembar Kerja Peserta Didik) di Indonesia.
Hasilkan struktur dokumen LKPD yang mendalam, kontekstual, dan pedagogis dalam format JSON murni TANPA markdown backticks.
Format JSON harus persis:
{
  "title": "string judul LKPD",
  "subject": "string mata pelajaran",
  "grade": "string kelas/fase",
  "learning_objectives": ["tujuan 1", "tujuan 2", "tujuan 3"],
  "activities": [
    { "title": "Aktivitas 1: ...", "instructions": "panduan pengerjaan aktivitas" },
    { "title": "Aktivitas 2: ...", "instructions": "panduan pengerjaan aktivitas" }
  ],
  "questions": [
    { "type": "essay", "prompt": "pertanyaan pemahaman mendalam 1" },
    { "type": "essay", "prompt": "pertanyaan pemahaman mendalam 2" }
  ],
  "reflection_prompts": ["pertanyaan refleksi 1", "pertanyaan refleksi 2"]
}`;

    const fullPrompt = `${systemInstruction}\n\nInstruksi Guru:\n${prompt}`;
    const cleanModel = this.getCleanModelName();
    const url = `${this.endpoint.replace(/\/$/, '')}/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Gemini API (${cleanModel}): ${err.error?.message || 'HTTP ' + res.status}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(this.cleanJsonString(rawText));
  }

  async evaluate(studentAnswers, rubric, options = {}) {
    if (this.mock || !this.apiKey) {
      // Hitung evaluasi dinamis berdasarkan jawaban siswa
      const ansValues = Object.values(studentAnswers || {}).join(' ');
      const wordCount = ansValues.split(/\s+/).filter(Boolean).length;
      const score = Math.min(95, Math.max(70, Math.round(75 + (wordCount / 5))));

      return {
        score_recommendation: score,
        strengths: [
          "Siswa telah menunjukkan keseriusan dalam menjabarkan alur argumen",
          "Konsep dasar yang disampaikan relevan dengan tugas LKPD"
        ],
        weaknesses: [
          wordCount < 30 ? "Jawaban masih relatif ringkas, dapat diperkaya dengan data pendukung" : "Perkuat sintesis pada bagian kesimpulan"
        ],
        feedback: `Jawaban Anda sudah baik (skor rekomendasi ${score}). Pertahankan ketelitian dan perluas analisis kontekstual pada tugas berikutnya!`,
        misconceptions: [],
        follow_up_needed: score < 75
      };
    }

    const systemInstruction = `Anda adalah Asisten Guru Penilai di AI CLASSROOM.
Analisis jawaban siswa, bandingkan dengan rubrik dan tujuan pembelajaran, lalu berikan rekomendasi penilaian pedagogis dalam format JSON murni TANPA markdown backticks.
Format JSON harus persis:
{
  "score_recommendation": 85,
  "strengths": ["kelebihan 1", "kelebihan 2"],
  "weaknesses": ["kekurangan 1"],
  "feedback": "kalimat umpan balik konstruktif dan memotivasi untuk siswa",
  "misconceptions": ["miskonsepsi jika ada"],
  "follow_up_needed": true/false
}`;

    const prompt = `${systemInstruction}

Jawaban Siswa:
${JSON.stringify(studentAnswers, null, 2)}

Rubrik / Acuan Materi:
${rubric || 'Penilaian pemahaman konsep, argumen kritis, dan ketepatan penalaran.'}

Tujuan Pembelajaran:
${options.learningObjectives ? JSON.stringify(options.learningObjectives) : 'Pencapaian kompetensi dasar materi.'}

Hasilkan JSON evaluasi:`;

    const cleanEvalModel = this.getCleanModelName();
    const url = `${this.endpoint.replace(/\/$/, '')}/v1beta/models/${cleanEvalModel}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Gemini Evaluator: ${err.error?.message || 'HTTP ' + res.status}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(this.cleanJsonString(rawText));
  }
}

module.exports = GeminiAdapter;
