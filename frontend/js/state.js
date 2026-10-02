// Global State Store
const state = {
  token: localStorage.getItem('ai_classroom_token') || null,
  user: null, // { id, name, email, role, avatar, ... }
  currentView: 'dashboard',
  sidebarOpen: false,
  dashboardData: null,
  listeners: []
};

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  state.listeners.forEach(fn => fn(state));
}

export function subscribe(listener) {
  state.listeners.push(listener);
  return () => {
    state.listeners = state.listeners.filter(l => l !== listener);
  };
}
