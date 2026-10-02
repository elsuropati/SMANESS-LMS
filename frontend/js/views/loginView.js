import { loginUser } from '../auth.js';

export function renderLoginView(container, { onLoginSuccess, showToast }) {
  container.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-brand-icon">✦</div>
          <h1 class="login-title">AI CLASSROOM</h1>
          <p class="login-subtitle">AI-Powered Learning Management System</p>
        </div>

        <div id="login-alert-container"></div>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-email">Email atau Username</label>
            <div class="input-with-icon">
              <input 
                type="email" 
                id="login-email" 
                class="form-input" 
                placeholder="nama@sekolah.sch.id" 
                required 
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Kata Sandi</label>
            <div class="input-with-icon">
              <input 
                type="password" 
                id="login-password" 
                class="form-input" 
                placeholder="••••••••" 
                required 
                autocomplete="current-password"
              />
              <button type="button" class="password-toggle-btn" id="btn-toggle-password" title="Tampilkan sandi">
                👁️
              </button>
            </div>
          </div>

          <div class="login-footer-links">
            <label class="remember-label">
              <input type="checkbox" id="remember-me" checked />
              <span>Ingat saya</span>
            </label>
            <a href="javascript:void(0)" class="link-forgot" id="link-forgot-pass">Lupa kata sandi?</a>
          </div>

          <button type="submit" class="btn-primary" id="btn-submit-login">
            <span id="login-btn-text">Masuk ke Akun</span>
          </button>
        </form>

        <!-- Demo Accounts Box (Otomatis disembunyikan saat deploy ke Production) -->
        <div class="demo-accounts-box" id="demo-accounts-box" style="display: none;">
          <div class="demo-title">⚡ Akun Pengujian Cepat (Mode Uji / Development)</div>
          <div class="demo-buttons-row">
            <button type="button" class="btn-demo-pill" id="btn-fill-teacher">
              <span>👨‍🏫 Guru (Budi Santoso)</span>
            </button>
            <button type="button" class="btn-demo-pill" id="btn-fill-student">
              <span>🎓 Siswa (Ahmad Fauzi)</span>
            </button>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-muted); text-align: center; margin-top: 4px;">
            ℹ️ <em>Tombol uji ini otomatis hilang saat aplikasi dideploy ke mode production (SHOW_DEMO_ACCOUNTS=false).</em>
          </span>
        </div>
      </div>
    </div>
  `;

  // DOM Elements
  const form = container.querySelector('#login-form');
  const emailInput = container.querySelector('#login-email');
  const passwordInput = container.querySelector('#login-password');
  const togglePassBtn = container.querySelector('#btn-toggle-password');
  const submitBtn = container.querySelector('#btn-submit-login');
  const submitBtnText = container.querySelector('#login-btn-text');
  const alertContainer = container.querySelector('#login-alert-container');
  const demoBox = container.querySelector('#demo-accounts-box');
  const fillTeacherBtn = container.querySelector('#btn-fill-teacher');
  const fillStudentBtn = container.querySelector('#btn-fill-student');
  const forgotPassLink = container.querySelector('#link-forgot-pass');

  // Check whether to show demo buttons from backend environment
  fetch('/api/system/info')
    .then(res => res.json())
    .then(data => {
      if (data && data.showDemoAccounts) {
        demoBox.style.display = 'flex';
      } else {
        demoBox.remove(); // Safely remove completely from DOM in production
      }
    })
    .catch(() => {
      // Default hide if error
    });

  // Show/Hide password toggle
  togglePassBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePassBtn.textContent = '🙈';
      togglePassBtn.title = 'Sembunyikan sandi';
    } else {
      passwordInput.type = 'password';
      togglePassBtn.textContent = '👁️';
      togglePassBtn.title = 'Tampilkan sandi';
    }
  });

  // Demo auto-fill helpers
  fillTeacherBtn.addEventListener('click', () => {
    emailInput.value = 'guru@aiclassroom.sch.id';
    passwordInput.value = 'password123';
    alertContainer.innerHTML = '';
    showToast('Kredensial Guru terisi. Silakan klik Masuk ke Akun.', 'info');
  });

  fillStudentBtn.addEventListener('click', () => {
    emailInput.value = 'siswa@aiclassroom.sch.id';
    passwordInput.value = 'password123';
    alertContainer.innerHTML = '';
    showToast('Kredensial Siswa terisi. Silakan klik Masuk ke Akun.', 'info');
  });

  forgotPassLink.addEventListener('click', () => {
    alert('Silakan hubungi administrator sistem sekolah untuk bantuan pemulihan akun.');
  });

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertContainer.innerHTML = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alertContainer.innerHTML = `
        <div class="alert-box alert-error">
          <span>⚠️ Silakan masukkan email dan kata sandi.</span>
        </div>
      `;
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtnText.textContent = 'Memverifikasi...';

      const user = await loginUser(email, password);
      showToast(`Selamat datang kembali, ${user.name}!`, 'success');
      onLoginSuccess(user);
    } catch (err) {
      alertContainer.innerHTML = `
        <div class="alert-box alert-error">
          <span>⚠️ ${err.message || 'Login gagal. Periksa kembali email dan kata sandi.'}</span>
        </div>
      `;
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Masuk ke Akun';
    }
  });
}
