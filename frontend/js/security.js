// Security page: scan/type a token, show if the pass is valid, record entry/exit.

let currentPass = null; // the verified pass we can record ENTRY/EXIT for
let scanner = null; // the html5-qrcode camera scanner

// Guard: only security should see this page.
async function checkLogin() {
  const data = await api('/api/auth/me');
  if (data.user.role !== 'SECURITY') {
    window.location.href = '/index.html';
    return false;
  }
  document.getElementById('userName').textContent = `${data.user.name} (${data.user.loginId})`;
  return true;
}

// Ask the backend whether this token is a valid pass and show the answer.
async function verifyToken(token) {
  const resultBox = document.getElementById('result');
  resultBox.innerHTML = 'Checking...';

  try {
    const data = await api(`/api/security/verify?token=${encodeURIComponent(token)}`);
    currentPass = data.valid ? data.pass : null;
    showResult(data);
  } catch (error) {
    currentPass = null;
    resultBox.innerHTML = `<div class="result-box invalid"><h3>✕ Error</h3><p>${error.message}</p></div>`;
  }
}

// Draw the green VALID PASS or red INVALID PASS box.
function showResult(data) {
  const resultBox = document.getElementById('result');
  resultBox.innerHTML = '';

  if (!data.valid) {
    const box = document.createElement('div');
    box.className = 'result-box invalid';
    box.innerHTML = `<h3>✕ INVALID PASS</h3><p>Reason: ${data.reason}</p>`;
    resultBox.appendChild(box);
    return;
  }

  const pass = data.pass;
  const box = document.createElement('div');
  box.className = 'result-box valid';
  box.innerHTML = `
    <h3>✓ VALID PASS</h3>
    <p><strong>${pass.studentName}</strong> (${pass.studentLoginId}) — Room ${pass.roomNumber}</p>
    <p>Reason: ${pass.reason}</p>
    <p>Return by: ${formatDateTime(pass.toDateTime)}</p>
    <p>Token: ${pass.qrToken}</p>
  `;

  const exitButton = document.createElement('button');
  exitButton.textContent = 'Record EXIT';
  exitButton.className = 'reject';
  exitButton.addEventListener('click', () => recordAction('EXIT'));

  const entryButton = document.createElement('button');
  entryButton.textContent = 'Record ENTRY';
  entryButton.addEventListener('click', () => recordAction('ENTRY'));

  box.appendChild(entryButton);
  box.appendChild(exitButton);
  resultBox.appendChild(box);
}

// Save an ENTRY or EXIT record for the pass being shown.
async function recordAction(action) {
  if (!currentPass) return;
  try {
    const data = await api('/api/security/record', {
      method: 'POST',
      body: { gatePassId: currentPass.id, action },
    });
    showResult(data);
    loadActivity();
  } catch (error) {
    alert(error.message);
  }
}

// Start the camera QR scanner.
// Note: browsers only allow camera access on http://localhost or https://.
function startScanner() {
  const readerBox = document.getElementById('reader');

  // The scanner library comes from a CDN. If it did not load (for example no
  // internet), say so clearly instead of failing silently.
  if (typeof Html5Qrcode === 'undefined') {
    readerBox.innerHTML =
      '<p class="empty-note">Scanner library could not load (no internet?). Type the token below instead.</p>';
    return;
  }

  scanner = new Html5Qrcode('reader');
  // Laptops only have a front camera, phones mainly have a back camera.
  // Try the back camera first, then fall back to any camera.
  startWithFacingMode('environment', () => startWithFacingMode('user', () => showCameraError({ name: 'NotAllowedError' })));

  function startWithFacingMode(facingMode, onFail) {
    scanner
      .start(
        { facingMode },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          document.getElementById('token').value = decodedText;
          verifyToken(decodedText);
        },
        () => {} // ignore the many "no QR seen" frames
      )
      .catch(onFail);
  }

  // Explain the most common camera problems in plain words.
  function showCameraError(error) {
    const messages = {
      NotAllowedError: 'Camera permission was denied. Click the camera icon near the address bar (or your browser site settings), allow the camera for this site, then refresh the page.',
      NotFoundError: 'No camera was found on this device. Type the token below instead.',
      NotReadableError: 'The camera is already in use by another app (Zoom, Meet, OBS...). Close that app and refresh the page.',
      OverconstrainedError: 'The camera could not start with the requested settings. Type the token below instead.',
    };
    const reason = messages[error.name] ||
      'Camera could not start. Type the token below instead.';
    document.getElementById('reader').innerHTML = `<p class="empty-note">${reason}</p>`;
  }
}

async function loadActivity() {
  const data = await api('/api/security/activity');
  const tableBody = document.querySelector('#activityTable tbody');
  tableBody.innerHTML = '';

  if (data.logs.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-note">No gate activity yet.</td></tr>';
    return;
  }

  for (const log of data.logs) {
    const row = document.createElement('tr');
    const cells = [
      log.studentName,
      log.roomNumber || '-',
      log.action === 'ENTRY' ? '↪ Entry' : '↩ Exit',
      formatDateTime(log.timestamp),
    ];
    for (const text of cells) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    }
    tableBody.appendChild(row);
  }
}

setupLogoutButton();
document.getElementById('verifyForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const token = document.getElementById('token').value.trim();
  verifyToken(token);
});

checkLogin().then((isSecurity) => {
  if (isSecurity) {
    startScanner();
    loadActivity();
  }
});
