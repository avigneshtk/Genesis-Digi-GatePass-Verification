// Login page: check the password, then send the user to their own page.

const rolePages = {
  STUDENT: '/student.html',
  WARDEN: '/warden.html',
  SECURITY: '/security.html',
};

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the browser reloading the page

  const loginButton = document.getElementById('loginButton');
  const message = document.getElementById('loginMessage');
  const loginId = document.getElementById('loginId').value.trim();
  const password = document.getElementById('password').value;

  loginButton.disabled = true;
  message.textContent = 'Logging in...';
  message.className = 'message';

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { loginId, password },
    });
    window.location.href = rolePages[data.user.role] || '/index.html';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
    loginButton.disabled = false;
  }
});
