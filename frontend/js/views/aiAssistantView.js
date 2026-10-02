import { api } from '../api.js';

export async function renderAiAssistantView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content" style="padding-bottom: 10px;">
      <div class="chat-container">
        <!-- Chat Header -->
        <div class="chat-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="brand-logo-icon" style="width: 34px; height: 34px; font-size: 1rem;">✦</div>
            <div>
              <h3 style="font-size: 1rem; font-weight: 800; color: var(--text-main);">AI Pedagogical Assistant</h3>
              <p style="font-size: 0.75rem; color: var(--text-muted);">
                Membantu perencanaan pembelajaran, perancangan rubrik, analisis hasil tugas, dan diferensiasi materi.
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="ai-status-badge">
              <span class="ai-status-dot"></span>
              <span id="chat-active-provider-label">Google Gemini 1.5 Pro</span>
            </div>
            <a href="#settings" class="btn-demo-pill" style="padding: 6px 12px;">⚙️ Ganti Provider</a>
          </div>
        </div>

        <!-- Chat Message Feed -->
        <div class="chat-messages" id="chat-messages-container">
          <div class="chat-bubble assistant">
            👋 Halo Bapak/Ibu <strong>${user.name}</strong>! Saya siap menjadi asisten pembelajaran digital Anda. Silakan ketik pertanyaan Anda atau pilih salah satu pintasan aksi cepat di bawah ini.
          </div>
        </div>

        <!-- Quick Action Prompt Chips -->
        <div class="chat-quick-actions">
          <button class="btn-demo-pill btn-quick-chip" data-prompt="Buatkan draf LKPD Kimia Hijau 3 aktivitas">
            ✦ Buat LKPD
          </button>
          <button class="btn-demo-pill btn-quick-chip" data-prompt="create-soal" data-action="create-soal">
            📝 Buat Soal HOTS
          </button>
          <button class="btn-demo-pill btn-quick-chip" data-prompt="Analisis jawaban esai siswa pada topik pelarut hijau">
            🔍 Analisis Jawaban
          </button>
          <button class="btn-demo-pill btn-quick-chip" data-prompt="Buatkan kalimat feedback apresiatif dan konstruktif untuk nilai 78">
            💬 Buat Feedback
          </button>
          <button class="btn-demo-pill btn-quick-chip" data-prompt="Rancang langkah remedial materi atom economy">
            🎯 Buat Remedial
          </button>
          <button class="btn-demo-pill btn-quick-chip" data-prompt="Buatkan materi pengayaan sintesis bioplastik">
            🚀 Buat Pengayaan
          </button>
          <button class="btn-demo-pill btn-quick-chip" data-prompt="analyze-class" data-action="analyze-class">
            📊 Analisis Kelas
          </button>
        </div>

        <!-- Input Bar -->
        <form id="chat-form" class="chat-input-bar">
          <input 
            type="text" 
            id="chat-input-text" 
            class="form-input" 
            placeholder="Tulis perintah atau instruksi untuk AI Assistant..." 
            required 
            autocomplete="off"
          />
          <button type="submit" class="btn-primary" id="btn-send-chat" style="width: auto; padding: 0 20px;">
            <span>Kirim</span>
          </button>
        </form>
      </div>
    </div>
  `;

  const messagesContainer = container.querySelector('#chat-messages-container');
  const chatForm = container.querySelector('#chat-form');
  const chatInput = container.querySelector('#chat-input-text');
  const sendBtn = container.querySelector('#btn-send-chat');

  // Load Active Config
  try {
    const configRes = await api.getAiConfig();
    if (configRes.data?.active) {
      const active = configRes.data.active;
      container.querySelector('#chat-active-provider-label').textContent = `${active.provider.toUpperCase()} (${active.model})`;
    }
  } catch (e) {
    // default
  }

  function appendMessage(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = text.replace(/\n/g, '<br/>');
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleSend(text, action = null) {
    appendMessage('user', text);
    chatInput.value = '';
    sendBtn.disabled = true;

    // AI typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble assistant';
    typingBubble.textContent = 'Mengetik balasan...';
    messagesContainer.appendChild(typingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const res = await api.sendAiChat({
        message: text,
        action,
        context: {
          teacher: user.name,
          subject: user.subject || 'Kimia',
          class: 'X-1'
        }
      });

      typingBubble.remove();
      appendMessage('assistant', res.data.reply);
    } catch (err) {
      typingBubble.remove();
      appendMessage('assistant', `⚠️ Maaf, terjadi kesalahan: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) handleSend(text);
  });

  // Quick Action Chips
  container.querySelectorAll('.btn-quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      const action = chip.getAttribute('data-action');
      handleSend(chip.textContent.trim(), action);
    });
  });
}
