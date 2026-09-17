// Student page: apply for passes, see my passes, show the QR code.

let myPasses = [];

// Guard: only students should see this page.
async function checkLogin() {
  const data = await api('/api/auth/me');
  if (data.user.role !== 'STUDENT') {
    window.location.href = '/index.html';
    return false;
  }
  document.getElementById('userName').textContent = `${data.user.name} (${data.user.loginId})`;
  return true;
}

// Send the apply form to the backend.
document.getElementById('applyForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const message = document.getElementById('applyMessage');
  const passData = {
    reason: document.getElementById('reason').value.trim(),
    fromDateTime: document.getElementById('fromDateTime').value,
    toDateTime: document.getElementById('toDateTime').value,
  };

  try {
    await api('/api/gatepasses', { method: 'POST', body: passData });
    message.textContent = '✓ Request sent! Waiting for warden approval.';
    message.className = 'message success';
    document.getElementById('applyForm').reset();
    loadPasses();
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
  }
});

// Load my passes and draw them as cards.
async function loadPasses() {
  const data = await api('/api/gatepasses');
  myPasses = data.passes;

  const list = document.getElementById('passList');
  list.innerHTML = '';

  if (myPasses.length === 0) {
    list.innerHTML = '<p class="empty-note">No gate passes yet. Apply for one above!</p>';
    return;
  }

  for (const pass of myPasses) {
    const card = document.createElement('div');
    card.className = 'pass-card';

    const top = document.createElement('div');
    top.className = 'pass-top';
    top.appendChild(statusBadge(pass.status));

    const showQrButton = document.createElement('button');
    showQrButton.textContent = 'Show QR';
    showQrButton.className = 'secondary';
    showQrButton.style.marginTop = '0';
    showQrButton.disabled = pass.status !== 'APPROVED';
    showQrButton.addEventListener('click', () => showQrCode(pass));

    top.appendChild(showQrButton);
    card.appendChild(top);

    const reason = document.createElement('div');
    reason.className = 'reason';
    reason.textContent = pass.reason;
    card.appendChild(reason);

    const times = document.createElement('div');
    times.className = 'times';
    times.textContent = `Leave: ${formatDateTime(pass.fromDateTime)}  →  Return: ${formatDateTime(pass.toDateTime)}`;
    card.appendChild(times);

    if (pass.qrToken) {
      const token = document.createElement('div');
      token.className = 'times';
      token.textContent = `Token: ${pass.qrToken}`;
      card.appendChild(token);
    }

    list.appendChild(card);
  }
}

// Show the QR code image of an approved pass in the big dialog.
function showQrCode(pass) {
  document.getElementById('qrImage').src = `/api/gatepasses/${pass.id}/qr`;
  document.getElementById('qrTokenLabel').textContent = pass.qrToken;
  document.getElementById('qrValidUntil').textContent =
    `Valid until ${formatDateTime(pass.toDateTime)}`;
  document.getElementById('qrDialog').style.display = 'block';
  document.getElementById('qrDialog').scrollIntoView({ behavior: 'smooth' });
}

setupLogoutButton();
checkLogin().then((isStudent) => {
  if (isStudent) loadPasses();
});
