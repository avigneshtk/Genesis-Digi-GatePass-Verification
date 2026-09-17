// Small helpers shared by all pages: calling the API, formatting, logout.

// Call any /api route and return the JSON answer.
// Throws an Error with a readable message when something goes wrong.
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
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
    } finally {
      // Always go back to the login page, even if the server call failed.
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
    if (data.user.role !== expectedRole) {
      window.location.href = '/index.html';
      return false;
    }
    document.getElementById('userName').textContent = `${data.user.name} (${data.user.loginId})`;
    return true;
  } catch (error) {
    window.location.href = '/index.html';
    return false;
  }
}
