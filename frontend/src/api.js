// API client for the React frontend

export function getApiBaseUrl() {
  return window.API_BASE_URL || localStorage.getItem('API_BASE_URL') || '';
}

export function setApiBaseUrl(url) {
  if (url) {
    localStorage.setItem('API_BASE_URL', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('API_BASE_URL');
  }
}

export function getApiUrl(path) {
  const base = getApiBaseUrl();
  if (!base || path.startsWith('http')) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function getSessionToken() {
  return localStorage.getItem('gp_session_token');
}

export function setSessionToken(token) {
  if (token) {
    localStorage.setItem('gp_session_token', token);
  } else {
    localStorage.removeItem('gp_session_token');
  }
}

export async function api(path, options = {}) {
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

export function formatDateTime(isoString) {
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
