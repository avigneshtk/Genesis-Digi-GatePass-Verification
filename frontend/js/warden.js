// Warden page: approve/reject pending passes, see all passes and gate activity.

// Guard: only wardens should see this page.
async function checkLogin() {
  const data = await api('/api/auth/me');
  if (data.user.role !== 'WARDEN') {
    window.location.href = '/index.html';
    return false;
  }
  document.getElementById('userName').textContent = `${data.user.name} (${data.user.loginId})`;
  return true;
}

async function loadPasses() {
  const data = await api('/api/gatepasses');

  // Pending requests become cards with Approve / Reject buttons.
  const pendingList = document.getElementById('pendingList');
  pendingList.innerHTML = '';

  const pending = data.passes.filter((pass) => pass.status === 'PENDING');
  if (pending.length === 0) {
    pendingList.innerHTML = '<p class="empty-note">No pending requests. 🎉</p>';
  }

  for (const pass of pending) {
    const card = document.createElement('div');
    card.className = 'pass-card';

    const top = document.createElement('div');
    top.className = 'pass-top';
    top.appendChild(statusBadge(pass.status));
    card.appendChild(top);

    const studentLine = document.createElement('div');
    studentLine.className = 'reason';
    studentLine.textContent = `${pass.studentName} (${pass.studentLoginId}) — Room ${pass.roomNumber}`;
    card.appendChild(studentLine);

    const reason = document.createElement('div');
    reason.textContent = pass.reason;
    card.appendChild(reason);

    const times = document.createElement('div');
    times.className = 'times';
    times.textContent = `Leave: ${formatDateTime(pass.fromDateTime)}  →  Return: ${formatDateTime(pass.toDateTime)}`;
    card.appendChild(times);

    const approveButton = document.createElement('button');
    approveButton.textContent = 'Approve';
    approveButton.className = 'approve';
    approveButton.addEventListener('click', () => decide(pass, 'approve'));

    const rejectButton = document.createElement('button');
    rejectButton.textContent = 'Reject';
    rejectButton.className = 'reject';
    rejectButton.addEventListener('click', () => decide(pass, 'reject'));

    card.appendChild(approveButton);
    card.appendChild(rejectButton);
    pendingList.appendChild(card);
  }

  // All requests go into the big table.
  const tableBody = document.querySelector('#allTable tbody');
  tableBody.innerHTML = '';

  for (const pass of data.passes) {
    const row = document.createElement('tr');
    const cells = [
      `${pass.studentName} (${pass.studentLoginId})`,
      pass.roomNumber || '-',
      pass.reason,
      formatDateTime(pass.fromDateTime),
      formatDateTime(pass.toDateTime),
    ];
    for (const text of cells) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    }
    const statusCell = document.createElement('td');
    statusCell.appendChild(statusBadge(pass.status));
    row.appendChild(statusCell);
    tableBody.appendChild(row);
  }
}

// Approve or reject a pass, then refresh the lists.
async function decide(pass, decision) {
  try {
    await api(`/api/gatepasses/${pass.id}/${decision}`, { method: 'POST' });
    loadPasses();
  } catch (error) {
    alert(error.message);
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
checkLogin().then((isWarden) => {
  if (isWarden) {
    loadPasses();
    loadActivity();
    // Refresh every 10 seconds so new requests show up during the demo.
    setInterval(() => {
      loadPasses();
      loadActivity();
    }, 10000);
  }
});
