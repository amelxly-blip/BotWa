function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    
    if(tabId === 'rentals') fetchRentals();
}

async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        const statusEl = document.getElementById('conn-status');
        const qrContainer = document.getElementById('qr-container');
        const qrImg = document.getElementById('qr-image');
        
        if (data.online) {
            statusEl.innerText = 'ONLINE';
            statusEl.style.color = '#03dac6';
            qrContainer.classList.add('hidden');
        } else if (data.qr) {
            statusEl.innerText = 'WAITING FOR SCAN';
            statusEl.style.color = '#ffeb3b';
            qrImg.src = data.qr;
            qrContainer.classList.remove('hidden');
        } else {
            statusEl.innerText = 'OFFLINE / STARTING';
            statusEl.style.color = '#cf6679';
        }
    } catch (e) {
        console.error(e);
    }
}

async function fetchRentals() {
    const res = await fetch('/api/rentals');
    const data = await res.json();
    const tbody = document.getElementById('rental-list');
    tbody.innerHTML = '';
    
    data.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.group_name || 'Unknown'}</td>
            <td>${r.status}</td>
            <td><button class="btn-danger" onclick="deleteRental(${r.id})">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function addRental() {
    const link = document.getElementById('rental-link').value;
    const days = document.getElementById('rental-days').value;
    
    if(!link || !days) return alert('Fill all fields');
    
    const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link, days: parseInt(days) })
    });
    
    const result = await res.json();
    if(result.success) {
        alert('Rental added successfully!');
        fetchRentals();
    } else {
        alert('Error: ' + result.error);
    }
}

async function deleteRental(id) {
    if(!confirm('Are you sure you want to delete this rental?')) return;
    
    const res = await fetch(`/api/rentals/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if(result.success) {
        fetchRentals();
    } else {
        alert('Error deleting rental');
    }
}

// Poll status every 3 seconds
setInterval(checkStatus, 3000);
checkStatus();
