import { getState, setState, subscribe } from './state.js';
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

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
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
    this.init();
  }

  async init() {
    await checkSession();
    
    // Set initial route from hash if present
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.currentViewId = hash === 'login' ? 'dashboard' : hash;

    this.render();

    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  handleHashChange() {
    const rawHash = window.location.hash.replace('#', '') || 'dashboard';
    const state = getState();

    if (!state.user) {
      this.render();
      return;
    }

    if (rawHash.startsWith('player/')) {
      this.activeLkpdAssignmentId = rawHash.replace('player/', '');
      this.currentViewId = 'player';
    } else {
      this.currentViewId = rawHash;
      this.activeLkpdAssignmentId = null;
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
        showToast(`Login berhasil sebagai ${user.role === 'teacher' ? 'Guru' : 'Siswa'}.`, 'success');
        window.location.hash = '#dashboard';
        this.currentViewId = 'dashboard';
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
              <!-- AI Engine Status Badge -->
              <div class="ai-status-badge" title="AI Adapter Multi-Provider Terkoneksi">
                <span class="ai-status-dot"></span>
                <span>AI Engine: Ready</span>
              </div>

              <!-- User Profile Badge -->
              <div class="user-profile-badge">
                <div class="user-avatar-circle ${isTeacher ? '' : 'student'}">
                  ${user.avatar || (user.name ? user.name.substring(0, 2).toUpperCase() : 'U')}
                </div>
                <div class="user-meta" style="display: flex; flex-direction: column;">
                  <span class="user-meta-name">${user.name}</span>
                  <span class="user-meta-role">${isTeacher ? 'Tenaga Pendidik' : 'Peserta Didik'}</span>
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
      if (navId === this.currentViewId) {
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
          renderGradingView(mainContainer, { user, showToast });
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
            assignmentId: this.activeLkpdAssignmentId || 'asg-1',
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

  bindShellEvents(user) {
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
