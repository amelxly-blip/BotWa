// ─── TAB NAVIGATION ──────────────────────────────────────────
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    if (tabId === 'rentals') fetchRentals();
    if (tabId === 'settings') loadImagePreviews();
}

// ─── STATUS POLLING ───────────────────────────────────────────
async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const statusEl = document.getElementById('conn-status');
        const qrContainer = document.getElementById('qr-container');
        const qrImg = document.getElementById('qr-image');

        if (data.online) {
            statusEl.innerText = 'ONLINE';
            statusEl.style.color = '#ffffff';
            qrContainer.classList.add('hidden');
        } else if (data.qr) {
            statusEl.innerText = 'WAITING FOR SCAN';
            statusEl.style.color = '#ffff00';
            qrImg.src = data.qr;
            qrContainer.classList.remove('hidden');
        } else {
            statusEl.innerText = 'OFFLINE / STARTING';
            statusEl.style.color = '#ff3333';
        }
    } catch (e) {
        document.getElementById('conn-status').innerText = 'CANNOT REACH SERVER';
        document.getElementById('conn-status').style.color = '#ff3333';
    }
}

// ─── RESET SESSION ────────────────────────────────────────────
async function resetSession() {
    if (!confirm('This will LOGOUT the current number and generate a new QR.\nContinue?')) return;
    try {
        const res = await fetch('/api/reset-session', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            // Immediately clear QR and status
            document.getElementById('conn-status').innerText = 'RESTARTING...';
            document.getElementById('conn-status').style.color = '#ffff00';
            document.getElementById('qr-container').classList.add('hidden');
            // Wait a moment then check for new QR
            setTimeout(checkStatus, 3000);
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) {
        alert('Failed to contact server.');
    }
}

// ─── RENTALS ─────────────────────────────────────────────────
async function fetchRentals() {
    const res = await fetch('/api/rentals');
    const data = await res.json();
    const tbody = document.getElementById('rental-list');
    tbody.innerHTML = '';

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:#666; text-align:center;">No rentals found</td></tr>';
        return;
    }

    data.forEach(r => {
        const remaining = r.expire_date
            ? Math.max(0, Math.ceil((r.expire_date - Date.now()) / (24 * 60 * 60 * 1000)))
            : '—';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.group_name || 'Unknown'}</td>
            <td>${r.status} <small style="color:#888">(${remaining}d left)</small></td>
            <td><button class="btn-danger" onclick="deleteRental(${r.id})">DELETE</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function addRental() {
    const link = document.getElementById('rental-link').value.trim();
    const days = document.getElementById('rental-days').value;
    if (!link || !days) return alert('Fill in all fields.');

    const btn = event.currentTarget;
    btn.innerText = 'ADDING...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/rentals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link, days: parseInt(days) })
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('rental-link').value = '';
            document.getElementById('rental-days').value = '';
            fetchRentals();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) {
        alert('Request failed.');
    }

    btn.innerText = 'ADD RENTAL';
    btn.disabled = false;
}

async function deleteRental(id) {
    if (!confirm('Delete this rental and remove bot from group?')) return;
    const res = await fetch(`/api/rentals/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) fetchRentals();
    else alert('Error deleting rental.');
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────
async function uploadImage(type) {
    const input = document.getElementById(`upload-${type}`);
    const preview = document.getElementById(`preview-${type}`);
    if (!input.files[0]) return alert('Please select a file first.');

    const formData = new FormData();
    formData.append('image', input.files[0]);

    try {
        const res = await fetch(`/api/upload/${type}`, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
            // Show preview
            preview.src = `/images/${result.filename}?t=${Date.now()}`;
            preview.classList.remove('hidden');
        } else {
            alert('Upload failed: ' + result.error);
        }
    } catch (e) {
        alert('Upload error.');
    }
}

function loadImagePreviews() {
    // Try to load existing images for preview on page open
    ['menu', 'welcome', 'goodbye'].forEach(type => {
        const preview = document.getElementById(`preview-${type}`);
        // Probe all common extensions
        ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => {
            const img = new Image();
            img.onload = () => {
                preview.src = img.src;
                preview.classList.remove('hidden');
            };
            img.src = `/images/${type}.${ext}?t=${Date.now()}`;
        });
    });
}

// ─── INIT ─────────────────────────────────────────────────────
setInterval(checkStatus, 3000);
checkStatus();
