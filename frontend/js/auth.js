import { api } from './api.js';
import { getState, setState } from './state.js';

export async function loginUser(email, password) {
  const res = await api.login(email, password);
  if (res.success && res.data) {
    const { token, user } = res.data;
    localStorage.setItem('ai_classroom_token', token);
    setState({
      token,
      user,
      currentView: 'dashboard'
    });
    return user;
  }
  throw new Error(res.message || 'Gagal masuk.');
}

export async function logoutUser() {
  try {
    await api.logout();
  } catch (e) {
    // Ignore error on logout endpoint
  } finally {
    localStorage.removeItem('ai_classroom_token');
    setState({
      token: null,
      user: null,
      dashboardData: null,
      currentView: 'login'
    });
    window.location.hash = '#login';
  }
}

export async function checkSession() {
  const state = getState();
  if (!state.token) {
    return null;
  }

  try {
    const res = await api.getMe();
    if (res.success && res.data?.user) {
      setState({ user: res.data.user });
      return res.data.user;
    }
  } catch (err) {
    console.warn('Session check failed:', err.message);
    localStorage.removeItem('ai_classroom_token');
    setState({ token: null, user: null });
  }
  return null;
}
