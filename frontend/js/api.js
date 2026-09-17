// Small helpers shared by all pages: calling the API, formatting, logout.

// Backend URL resolution:
// 1. window.API_BASE_URL (if injected)
// 2. localStorage.getItem('API_BASE_URL') (allows user/developer to configure easily)
// 3. Defaults to '' (relative path: works with Vercel rewrites or local dev)
function getApiBaseUrl() {
  return window.API_BASE_URL || localStorage.getItem('API_BASE_URL') || '';
}

function setApiBaseUrl(url) {
  if (url) {
    localStorage.setItem('API_BASE_URL', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('API_BASE_URL');
  }
}

function getApiUrl(path) {
  const base = getApiBaseUrl();
  if (!base || path.startsWith('http')) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

// Session token helpers
function getSessionToken() {
  return localStorage.getItem('gp_session_token');
}

function setSessionToken(token) {
  if (token) {
    localStorage.setItem('gp_session_token', token);
  } else {
    localStorage.removeItem('gp_session_token');
  }
}

// Call any /api route and return the JSON answer.
// Throws an Error with a readable message when something goes wrong.
async function api(path, options = {}) {
  const fullUrl = getApiUrl(path);
  const token = getSessionToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    credentials: 'include',
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  if (data && data.token) {
    setSessionToken(data.token);
  }

  return data;
}

// Turn "2026-09-17T17:00" into "17 Sep 2026, 5:00 PM" for humans.
function formatDateTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Make a <span class="badge ..."> for a pass status.
function statusBadge(status) {
  const span = document.createElement('span');
  span.className = 'badge ' + status;
  span.textContent = status;
  return span;
}

// Wire up the logout button (id="logoutButton") on any page.
function setupLogoutButton() {
  const button = document.getElementById('logoutButton');
  if (!button) return;
  button.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      // Clear token and go back to login
      setSessionToken(null);
      window.location.href = '/index.html';
    }
  });
}

// Page guard shared by the student/warden/security pages.
// Checks who is logged in, and sends the user back to the login page when
// they are logged out, their session expired, or they have the wrong role.
async function checkLogin(expectedRole) {
  try {
    const data = await api('/api/auth/me');
    if (expectedRole && data.user.role !== expectedRole) {
      window.location.href = '/index.html';
      return false;
    }
    const nameEl = document.getElementById('userName');
    if (nameEl) {
      nameEl.textContent = `${data.user.name} (${data.user.loginId})`;
    }
    return true;
  } catch (error) {
    setSessionToken(null);
    window.location.href = '/index.html';
    return false;
  }
}
