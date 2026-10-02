import { api } from '../api.js';

export async function renderAiSettingsView(container, { user, showToast }) {
  container.innerHTML = `
    <div class="view-content">
      <div class="dashboard-header">
        <div class="dash-title-group">
          <h1>Pengaturan Integrasi AI Multi-Provider</h1>
          <p>Konfigurasikan model kecerdasan buatan pilihan Anda. Fleksibel mendukung Gemini, OpenAI, Ollama, dan Hermes Proxy.</p>
        </div>
      </div>

      <!-- Security Notice Banner -->
      <div class="alert-box" style="background: #eff6ff; border: 1.5px solid #bfdbfe; color: #1e40af; margin-bottom: 24px;">
        <div style="font-size: 1.25rem;">🔒</div>
        <div style="font-size: 0.85rem; line-height: 1.5;">
          <strong>Standar Keamanan API Key:</strong> Kunci API Anda disimpan dan diproses secara aman di sisi server backend. Kunci API tidak pernah disimpan di localStorage browser dan tidak ditampilkan dalam teks terbuka (plaintext) demi keamanan data.
        </div>
      </div>

      <div class="content-panel" style="max-width: 800px;">
        <div class="panel-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h3 class="panel-title">
              <span>🤖</span> Konfigurasi Model AI Aktif
            </h3>
            <span id="ai-conn-status-pill" class="badge-tag success" style="display: inline-flex; align-items: center; gap: 6px;">
              🟢 Connected (Mock AI Ready)
            </span>
          </div>
        </div>

        <form id="form-ai-settings">
          <!-- Provider Selector -->
          <div class="form-group">
            <label class="form-label" for="select-ai-provider">Pilih Provider AI *</label>
            <select id="select-ai-provider" class="form-input" style="font-weight: 700;">
              <option value="gemini" selected>Google Gemini (Disarankan)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="openrouter">OpenRouter (Multi-model Gateway)</option>
              <option value="ollama">Ollama (Local LLM Server)</option>
              <option value="custom">Custom OpenAI-Compatible (Hermes Proxy / vLLM / Localhost)</option>
            </select>
          </div>

          <!-- Dynamic Endpoint -->
          <div class="form-group" id="group-ai-endpoint">
            <label class="form-label" for="input-ai-endpoint">API Base URL / Endpoint</label>
            <input 
              type="url" 
              id="input-ai-endpoint" 
              class="form-input" 
              value="https://generativelanguage.googleapis.com" 
              placeholder="https://example.com/v1" 
              required
            />
            <span class="activity-desc" id="help-ai-endpoint" style="display: block; margin-top: 4px;">
              Endpoint default resmi provider.
            </span>
          </div>

          <!-- Model Name -->
          <div class="form-group">
            <label class="form-label" for="input-ai-model">Nama Model AI *</label>
            <input 
              type="text" 
              id="input-ai-model" 
              class="form-input" 
              value="gemini-1.5-pro" 
              placeholder="Contoh: gemini-1.5-pro, gpt-4o, llama3" 
              required
            />
          </div>

          <!-- API Key -->
          <div class="form-group">
            <label class="form-label" for="input-ai-key">API Key</label>
            <div class="input-with-icon">
              <input 
                type="password" 
                id="input-ai-key" 
                class="form-input" 
                placeholder="Masukkan API Key (Ketik ulang hanya jika ingin mengganti)" 
                autocomplete="new-password"
              />
              <button type="button" class="password-toggle-btn" id="btn-toggle-key-visibility">
                👁️
              </button>
            </div>
            <span class="activity-desc" id="current-key-status" style="display: block; margin-top: 4px; color: var(--text-muted);">
              Status Kunci: Kunci tersimpan di server.
            </span>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 12px; margin-top: 28px; border-top: 1px solid var(--border-light); padding-top: 20px;">
            <button type="button" class="btn-demo-pill" id="btn-test-connection" style="padding: 12px 20px; font-weight: 700; border-color: var(--primary-border); color: var(--primary);">
              <span>⚡ [ TEST CONNECTION ]</span>
            </button>
            <button type="submit" class="btn-primary" id="btn-save-ai-config" style="width: auto; padding: 12px 24px;">
              <span>💾 [ SIMPAN KONFIGURASI ]</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const providerSelect = container.querySelector('#select-ai-provider');
  const endpointInput = container.querySelector('#input-ai-endpoint');
  const endpointHelp = container.querySelector('#help-ai-endpoint');
  const modelInput = container.querySelector('#input-ai-model');
  const keyInput = container.querySelector('#input-ai-key');
  const keyToggleBtn = container.querySelector('#btn-toggle-key-visibility');
  const statusPill = container.querySelector('#ai-conn-status-pill');
  const testBtn = container.querySelector('#btn-test-connection');
  const form = container.querySelector('#form-ai-settings');

  // Toggle key visibility
  keyToggleBtn.addEventListener('click', () => {
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      keyToggleBtn.textContent = '🙈';
    } else {
      keyInput.type = 'password';
      keyToggleBtn.textContent = '👁️';
    }
  });

  // Dynamic provider configs
  const PROVIDER_PRESETS = {
    gemini: {
      endpoint: 'https://generativelanguage.googleapis.com',
      model: 'gemini-1.5-pro',
      help: 'Endpoint Google AI Studio / Gemini API'
    },
    openai: {
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      help: 'Endpoint resmi OpenAI'
    },
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet-20240620',
      help: 'Endpoint resmi Anthropic Claude'
    },
    openrouter: {
      endpoint: 'https://openrouter.ai/api/v1',
      model: 'google/gemini-pro-1.5',
      help: 'OpenRouter Multi-Provider Aggregator'
    },
    ollama: {
      endpoint: 'http://127.0.0.1:11434/v1',
      model: 'llama3:latest',
      help: 'Server Lokal Ollama (kompatibel OpenAI)'
    },
    custom: {
      endpoint: 'http://127.0.0.1:8000/v1',
      model: 'custom-model',
      help: 'Hermes Proxy, vLLM, atau OpenAI-Compatible server kustom'
    }
  };

  providerSelect.addEventListener('change', () => {
    const val = providerSelect.value;
    const preset = PROVIDER_PRESETS[val];
    if (preset) {
      endpointInput.value = preset.endpoint;
      modelInput.value = preset.model;
      endpointHelp.textContent = preset.help;
    }
  });

  // Load existing configuration
  async function loadConfig() {
    try {
      const res = await api.getAiConfig();
      if (res.data?.active) {
        const act = res.data.active;
        providerSelect.value = act.provider;
        endpointInput.value = act.endpoint || PROVIDER_PRESETS[act.provider]?.endpoint || '';
        modelInput.value = act.model;
        if (act.api_key_masked) {
          keyInput.placeholder = `Tersimpan: ${act.api_key_masked}`;
        }
        updateStatusPill(act.status || 'connected');
      }
    } catch (e) {
      updateStatusPill('unconfigured');
    }
  }

  function updateStatusPill(status) {
    if (status === 'connected') {
      statusPill.className = 'badge-tag success';
      statusPill.innerHTML = '🟢 Connected (Mock AI Ready)';
    } else if (status === 'failed') {
      statusPill.className = 'badge-tag danger';
      statusPill.innerHTML = '🔴 Connection Failed';
    } else {
      statusPill.className = 'badge-tag warning';
      statusPill.innerHTML = '🟡 Not Configured';
    }
  }

  // Test Connection
  testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    testBtn.textContent = 'Menguji Sambungan...';
    try {
      const res = await api.testAiConnection({
        provider: providerSelect.value,
        endpoint: endpointInput.value.trim(),
        model: modelInput.value.trim(),
        api_key: keyInput.value.trim()
      });

      if (res.success) {
        updateStatusPill('connected');
        showToast(res.message || 'Koneksi AI berhasil diverifikasi!', 'success');
      } else {
        updateStatusPill('failed');
        showToast(res.message || 'Gagal tersambung.', 'error');
      }
    } catch (err) {
      updateStatusPill('failed');
      showToast(err.message, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '⚡ [ TEST CONNECTION ]';
    }
  });

  // Save Configuration
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        provider: providerSelect.value,
        endpoint: endpointInput.value.trim(),
        model: modelInput.value.trim(),
        api_key: keyInput.value.trim()
      };

      await api.saveAiConfig(payload);
      showToast('Konfigurasi AI berhasil disimpan dengan aman di server!', 'success');
      updateStatusPill('connected');
      keyInput.value = '';
      loadConfig();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  loadConfig();
}
