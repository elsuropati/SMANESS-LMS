import { getState, setState } from './state.js';
import { api } from './api.js';
import { esc } from './utils.js';
import { checkSession, logoutUser } from './auth.js';
import { renderLoginView } from './views/loginView.js';

// Teacher Views
import { renderTeacherDashboard } from './views/teacherDash.js';
import { renderClassesView } from './views/classesView.js';
import { renderLkpdBuilderView } from './views/lkpdBuilderView.js';
import { renderAssignmentsView } from './views/assignmentsView.js';
import { renderGradingView } from './views/gradingView.js';
import { renderFollowupTeacherView } from './views/followupTeacherView.js';
import { renderAiAssistantView } from './views/aiAssistantView.js';
import { renderReportsView } from './views/reportsView.js';
import { renderAiSettingsView } from './views/aiSettingsView.js';
import { renderAdminDashboard, renderTeacherManagementView } from './views/adminViews.js';

// Student Views
import { renderStudentDashboard } from './views/studentDash.js';
import {
  renderStudentTasksView,
  renderLkpdPlayerView,
  renderStudentMaterialsView,
  renderStudentResultsView,
  renderStudentFollowupView,
  renderStudentProfileView
} from './views/studentViews.js';

// Toast Notification Manager
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${esc(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Navigation Structure
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard Admin', icon: '📊' },
  { id: 'teachers', label: 'Kelola Akun Guru', icon: '👨‍🏫' },
  { id: 'classes', label: 'Data Kelas & Siswa', icon: '🏫' },
  { id: 'settings', label: 'Pengaturan AI & Sistem', icon: '⚙️' }
];

const TEACHER_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'classes', label: 'Kelas & Siswa', icon: '🏫' },
  { id: 'lkpd', label: 'LKPD Builder', icon: '📄' },
  { id: 'assignments', label: 'Tugas', icon: '📋' },
  { id: 'grading', label: 'Penilaian', icon: '📝' },
  { id: 'followup', label: 'Tindak Lanjut', icon: '🎯' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: '✦', badge: 'AI' },
  { id: 'reports', label: 'Laporan', icon: '📈' },
  { id: 'settings', label: 'Pengaturan AI', icon: '⚙️' }
];

const STUDENT_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'my-tasks', label: 'Tugas Saya', icon: '📝' },
  { id: 'materials', label: 'Materi', icon: '📖' },
  { id: 'results', label: 'Hasil Belajar', icon: '🏆' },
  { id: 'followup', label: 'Tindak Lanjut', icon: '🎯' },
  { id: 'profile', label: 'Profil Siswa', icon: '👤' }
];

class App {
  constructor() {
    this.appRoot = document.getElementById('app');
    this.currentViewId = 'dashboard';
    this.activeLkpdAssignmentId = null;
    this.viewParams = {};
    this.init();
  }

  async init() {
    await checkSession();
    
    this.parseHash();
    this.render();

    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  // Hash: #view, #view?kunci=nilai, atau #player/<assignmentId>
  parseHash() {
    const raw = window.location.hash.replace('#', '') || 'dashboard';
    const [pathPart, query = ''] = raw.split('?');
    this.viewParams = Object.fromEntries(new URLSearchParams(query));
    if (pathPart.startsWith('player/')) {
      this.activeLkpdAssignmentId = decodeURIComponent(pathPart.slice('player/'.length));
      this.currentViewId = 'player';
    } else {
      this.activeLkpdAssignmentId = null;
      this.currentViewId = pathPart === 'login' ? 'dashboard' : pathPart;
    }
  }

  handleHashChange() {
    const state = getState();
    this.parseHash();
    if (!state.user) {
      this.render();
      return;
    }
    this.mountCurrentView();
    this.updateActiveNavUI();
  }

  render() {
    const state = getState();

    if (!state.user) {
      this.renderLogin();
    } else {
      this.renderAppShell(state.user);
    }
  }

  renderLogin() {
    this.appRoot.innerHTML = `<div id="login-mount"></div>`;
    const mount = this.appRoot.querySelector('#login-mount');
    renderLoginView(mount, {
      onLoginSuccess: (user) => {
        showToast(`Selamat datang, ${user.name}.`, 'success');
        window.location.hash = '#dashboard';
        this.currentViewId = 'dashboard';
        this.viewParams = {};
        this.render();
      },
      showToast
    });
  }

  renderAppShell(user) {
    const isAdmin = user.role === 'admin';
    const isTeacher = user.role === 'teacher';
    let navItems = STUDENT_NAV;
    let roleTitle = 'SISWA';
    let roleTagClass = 'student';

    if (isAdmin) {
      navItems = ADMIN_NAV;
      roleTitle = 'ADMIN SEKOLAH';
      roleTagClass = 'danger';
    } else if (isTeacher) {
      navItems = TEACHER_NAV;
      roleTitle = 'GURU';
      roleTagClass = 'teacher';
    }

    this.appRoot.innerHTML = `
      <div class="app-wrapper">
        <!-- Backdrop Overlay for Mobile -->
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <!-- Sidebar -->
        <aside class="app-sidebar" id="app-sidebar">
          <div class="sidebar-header">
            <a href="#dashboard" class="brand-badge">
              <div class="brand-logo-icon">✦</div>
              <div class="brand-info">
                <span class="brand-title">AI CLASSROOM</span>
                <span class="brand-subtitle">Smart LMS Platform</span>
              </div>
            </a>
          </div>

          <div class="sidebar-role-indicator">
            <span class="sidebar-role-label">Hak Akses</span>
            <span class="sidebar-role-tag ${roleTagClass}">${roleTitle}</span>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section-title">Menu Utama</div>
            ${navItems.map(item => `
              <a class="nav-item ${item.id === this.currentViewId ? 'active' : ''}" data-nav="${item.id}" href="#${item.id}">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
                ${item.badge ? `<span class="nav-badge ${item.badge === 'AI' ? 'alert' : ''}">${item.badge}</span>` : ''}
              </a>
            `).join('')}
          </nav>

          <div class="sidebar-footer">
            <button class="btn-logout" id="btn-sidebar-logout">
              <span>🚪</span>
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="app-main">
          <!-- Topbar -->
          <header class="app-topbar">
            <div class="topbar-left">
              <button class="btn-toggle-sidebar" id="btn-toggle-sidebar" aria-label="Toggle Menu">
                ☰
              </button>
              <div class="topbar-greeting">
                <span class="topbar-title">AI Classroom Workspace</span>
                <span class="topbar-date">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            <div class="topbar-right">
              ${isTeacher ? `<a href="#settings" class="ai-status-badge" title="Atur penyedia AI" style="text-decoration:none;">
                <span class="ai-status-dot"></span>
                <span>AI</span>
              </a>` : ''}

              <!-- User Profile Badge -->
              <div class="user-profile-badge" id="btn-account-menu" role="button" tabindex="0" title="Pengaturan akun" style="cursor:pointer;">
                <div class="user-avatar-circle ${isTeacher || isAdmin ? '' : 'student'}">
                  ${esc(user.avatar || (user.name ? user.name.substring(0, 2).toUpperCase() : 'U'))}
                </div>
                <div class="user-meta" style="display: flex; flex-direction: column;">
                  <span class="user-meta-name">${esc(user.name)}</span>
                  <span class="user-meta-role">${isAdmin ? 'Administrator' : (isTeacher ? 'Tenaga Pendidik' : 'Peserta Didik')}</span>
                </div>
              </div>
            </div>
          </header>

          <!-- Dynamic View Container -->
          <main id="main-view-container"></main>
        </div>
      </div>
    `;

    this.bindShellEvents(user);
    this.mountCurrentView();
  }

  updateActiveNavUI() {
    const navItems = this.appRoot.querySelectorAll('.nav-item');
    navItems.forEach(n => {
      const navId = n.getAttribute('data-nav');
      const active = navId === this.currentViewId || (this.currentViewId === 'player' && navId === 'my-tasks');
      if (active) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });
  }

  mountCurrentView() {
    const state = getState();
    if (!state.user) return;

    const mainContainer = this.appRoot.querySelector('#main-view-container');
    if (!mainContainer) return;

    const user = state.user;
    const viewId = this.currentViewId;

    if (user.role === 'admin') {
      switch (viewId) {
        case 'teachers':
          renderTeacherManagementView(mainContainer, { user, showToast });
          break;
        case 'classes':
          renderClassesView(mainContainer, { user, showToast });
          break;
        case 'settings':
          renderAiSettingsView(mainContainer, { user, showToast });
          break;
        case 'dashboard':
        default:
          renderAdminDashboard(mainContainer, { user, showToast });
          break;
      }
    } else if (user.role === 'teacher') {
      switch (viewId) {
        case 'classes':
          renderClassesView(mainContainer, { user, showToast });
          break;
        case 'lkpd':
          renderLkpdBuilderView(mainContainer, { user, showToast });
          break;
        case 'assignments':
          renderAssignmentsView(mainContainer, { user, showToast });
          break;
        case 'grading':
          renderGradingView(mainContainer, { user, showToast, params: this.viewParams });
          break;
        case 'followup':
          renderFollowupTeacherView(mainContainer, { user, showToast });
          break;
        case 'ai-assistant':
          renderAiAssistantView(mainContainer, { user, showToast });
          break;
        case 'reports':
          renderReportsView(mainContainer, { user, showToast });
          break;
        case 'settings':
          renderAiSettingsView(mainContainer, { user, showToast });
          break;
        case 'dashboard':
        default:
          renderTeacherDashboard(mainContainer, { user, showToast });
          break;
      }
    } else {
      // Student Routes
      switch (viewId) {
        case 'my-tasks':
          renderStudentTasksView(mainContainer, {
            user,
            showToast,
            onOpenLkpd: (assignId) => {
              window.location.hash = `#player/${assignId}`;
            }
          });
          break;
        case 'player':
          renderLkpdPlayerView(mainContainer, {
            user,
            assignmentId: this.activeLkpdAssignmentId,
            showToast,
            onBackToTasks: () => {
              window.location.hash = '#my-tasks';
            }
          });
          break;
        case 'materials':
          renderStudentMaterialsView(mainContainer, { user, showToast });
          break;
        case 'results':
          renderStudentResultsView(mainContainer, { user, showToast });
          break;
        case 'followup':
          renderStudentFollowupView(mainContainer, { user, showToast });
          break;
        case 'profile':
          renderStudentProfileView(mainContainer, { user, showToast });
          break;
        case 'dashboard':
        default:
          renderStudentDashboard(mainContainer, { user, showToast });
          break;
      }
    }
  }

  openAccountModal(user) {
    const old = document.getElementById('account-modal');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'account-modal';
    wrap.innerHTML = `
      <div class="modal-backdrop"><div class="modal-dialog">
        <div class="modal-header"><h3 class="modal-title">👤 Akun Saya</h3><button class="modal-close-btn" id="acc-close">✕</button></div>
        <form id="acc-form">
          <div class="modal-body">
            <p style="font-size:0.85rem;margin-bottom:14px;"><strong>${esc(user.name)}</strong><br><span style="color:var(--text-muted);">${esc(user.email)}</span></p>
            <h4 style="font-size:0.9rem;margin-bottom:8px;">Ubah Kata Sandi</h4>
            <div class="form-group"><label class="form-label">Kata Sandi Saat Ini</label><input type="password" id="acc-current" class="form-input" autocomplete="current-password" required /></div>
            <div class="form-group"><label class="form-label">Kata Sandi Baru (min. 8 karakter)</label><input type="password" id="acc-new" class="form-input" minlength="8" autocomplete="new-password" required /></div>
          </div>
          <div class="modal-footer"><button type="button" class="btn-demo-pill" id="acc-cancel">Tutup</button><button type="submit" class="btn-primary" style="width:auto;">Simpan</button></div>
        </form>
      </div></div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('#acc-close').addEventListener('click', close);
    wrap.querySelector('#acc-cancel').addEventListener('click', close);
    wrap.querySelector('#acc-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.changePassword(wrap.querySelector('#acc-current').value, wrap.querySelector('#acc-new').value);
        showToast('Kata sandi berhasil diubah.', 'success');
        close();
      } catch (err) { showToast(err.message, 'error'); }
    });
  }

  bindShellEvents(user) {
    const acc = this.appRoot.querySelector('#btn-account-menu');
    if (acc) {
      acc.addEventListener('click', () => this.openAccountModal(user));
      acc.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.openAccountModal(user); });
    }

    const logoutBtn = this.appRoot.querySelector('#btn-sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('Apakah Anda yakin ingin keluar dari AI CLASSROOM?')) {
          await logoutUser();
          showToast('Anda telah berhasil keluar.', 'info');
          this.render();
        }
      });
    }

    const toggleBtn = this.appRoot.querySelector('#btn-toggle-sidebar');
    const sidebar = this.appRoot.querySelector('#app-sidebar');
    const overlay = this.appRoot.querySelector('#sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }

    const navItems = this.appRoot.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (sidebar && overlay) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
